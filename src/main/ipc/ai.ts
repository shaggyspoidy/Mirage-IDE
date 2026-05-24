import { ipcMain, BrowserWindow } from 'electron'
import { ollamaService } from '../services/ollama-service'
import { modelRegistry } from '../services/model-registry'
import { providerFactory } from '../services/ai-providers/provider-factory'
import { keyManager } from '../services/key-manager'
import type { OllamaModel } from '../../shared/types/model'

/**
 * AI IPC Handlers — bridges the Ollama service and model registry
 * to the renderer process via Electron IPC.
 *
 * WHY these specific channels:
 * - ai:get-models: Synchronous read of the current model list (no network).
 *   Used on initial mount and when the store needs the latest cached data.
 * - ai:poll-models: Triggers an immediate Ollama poll (async, network).
 *   Used when the model selector dropdown opens for real-time accuracy.
 * - ai:select-model: Sets the active model. Currently stored in renderer
 *   state (Zustand), but the main process needs to know for future
 *   ai:chat routing (Phase 7).
 * - ai:get-status: Returns Ollama connection status without triggering a poll.
 * - ai:models-updated: Push event from main → renderer when background
 *   polling detects model list changes.
 */

let selectedModelId: string | null = null

/**
 * Send a push event to all renderer windows.
 * WHY BrowserWindow.getAllWindows: Mirage currently has one window,
 * but this pattern scales to multi-window without refactoring.
 */
function broadcastToRenderers(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}

export function registerAiHandlers(): void {
  /**
   * Wire up the Ollama service events to IPC push channels.
   * WHY here (in register) instead of module scope: IPC handlers should
   * only be active after explicit registration. This prevents side effects
   * if the module is imported but not registered.
   */
  ollamaService.on('models-updated', (models: OllamaModel[]) => {
    modelRegistry.refreshLocalModels(models)
    broadcastToRenderers('ai:models-updated', modelRegistry.getModels())
  })

  ollamaService.on('status-changed', (running: boolean) => {
    broadcastToRenderers('ai:status-changed', {
      running,
      version: ollamaService.getStatus().version
    })
  })

  // Start background polling
  ollamaService.startPolling()

  // Also do an initial health + version check
  ollamaService.checkHealth().then(async (running) => {
    if (running) {
      await ollamaService.getVersion()
    }
    broadcastToRenderers('ai:status-changed', ollamaService.getStatus())
  })

  // ─── Invoke Handlers (renderer → main, with response) ───────────────

  /**
   * Get the current cached model list. No network request.
   */
  ipcMain.handle('ai:get-models', () => {
    return modelRegistry.getModels()
  })

  /**
   * Trigger an immediate Ollama poll and return the updated model list.
   * WHY async: pollNow() makes an HTTP request to Ollama.
   */
  ipcMain.handle('ai:poll-models', async () => {
    const ollamaModels = await ollamaService.pollNow()
    modelRegistry.refreshLocalModels(ollamaModels)
    return modelRegistry.getModels()
  })

  /**
   * Set the active model for AI operations.
   * Returns the selected model's info, or null if not found.
   */
  ipcMain.handle('ai:select-model', (_event, modelId: string) => {
    selectedModelId = modelId
    const model = modelRegistry.getModelById(modelId)
    console.log(`[AI] Selected model: ${model?.displayName || modelId}`)
    return model || null
  })

  /**
   * Get Ollama connection status.
   * WHY a separate channel from get-models: The renderer may want to show
   * connection status without fetching the full model list.
   */
  ipcMain.handle('ai:get-status', async () => {
    const running = await ollamaService.checkHealth()
    if (running && !ollamaService.getStatus().version) {
      await ollamaService.getVersion()
    }
    return ollamaService.getStatus()
  })

  /**
   * Get the currently selected model ID.
   */
  ipcMain.handle('ai:get-selected-model', () => {
    return selectedModelId
  })

  /**
   * Chat with the selected model (non-streaming, legacy).
   */
  ipcMain.handle('ai:chat', async (_event, modelId: string, messages: any[]) => {
    const model = modelRegistry.getModelById(modelId)
    if (!model) throw new Error(`Model ${modelId} not found.`)

    if (model.provider === 'ollama') {
      console.log(`[Ollama] Chat request to ${model.name} with ${messages.length} messages.`)
      return await ollamaService.chat(model.name, messages)
    } else {
      const client = providerFactory.getClient(model.provider)
      return await client.chat(model.name, messages)
    }
  })

  /**
   * Stream a chat response from the AI.
   * Pushes tokens to the renderer via 'ai:stream-chunk' events,
   * then sends 'ai:stream-done' or 'ai:stream-error' when finished.
   */
  ipcMain.handle('ai:chat-stream', async (event, initialModelId: string, messages: any[]) => {
    let currentModelId = initialModelId
    const attemptedModels = new Set<string>()

    const attemptStream = async (): Promise<void> => {
      attemptedModels.add(currentModelId)
      const model = modelRegistry.getModelById(currentModelId)
      
      if (!model) {
        event.sender.send('ai:stream-error', `Model ${currentModelId} not found.`)
        return
      }

      return new Promise<void>((resolve) => {
        let hasStreamedChunk = false

        const handleChunk = (token: string) => {
          hasStreamedChunk = true
          if (!event.sender.isDestroyed()) {
            event.sender.send('ai:stream-chunk', token)
          }
        }

        const handleDone = (fullContent: string) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('ai:stream-done', fullContent)
          }
          resolve()
        }

        const handleError = async (error: string) => {
          if (error.startsWith('[RATE_LIMIT]') && !hasStreamedChunk) {
            console.log(`[Fallback] Rate limit hit for ${currentModelId}. Searching for fallback...`)
            
            // Determine next available model
            const allModels = modelRegistry.getModels()
            const keyStatus = await keyManager.getKeyStatus()
            const isOllamaRunning = ollamaService.getStatus().running

            let nextModelId: string | null = null

            // Fallback hierarchy: OpenAI -> Anthropic -> Google -> Local Ollama
            const fallbackOrder = ['openai:gpt-4o-mini', 'anthropic:claude-haiku', 'google:gemini-2.5-flash']
            
            for (const fallbackId of fallbackOrder) {
              if (fallbackId !== currentModelId && !attemptedModels.has(fallbackId)) {
                const fallbackModel = modelRegistry.getModelById(fallbackId)
                if (fallbackModel && keyStatus[fallbackModel.provider]) {
                  nextModelId = fallbackId
                  break
                }
              }
            }

            // If no cloud models, try any local ollama model
            if (!nextModelId && isOllamaRunning) {
              const localModels = allModels.filter(m => m.tier === 'local' && !attemptedModels.has(m.id))
              if (localModels.length > 0) {
                nextModelId = localModels[0].id
              }
            }

            if (nextModelId && !event.sender.isDestroyed()) {
              console.log(`[Fallback] Switching to ${nextModelId}`)
              event.sender.send('ai:model-fallback-triggered', nextModelId)
              currentModelId = nextModelId
              resolve(attemptStream())
              return
            }
          }

          // If we reach here, either it's not a rate limit, or no fallbacks are available
          if (!event.sender.isDestroyed()) {
            // Strip the internal [RATE_LIMIT] tag if it still exists
            const cleanError = error.startsWith('[RATE_LIMIT]') ? error.substring(13).trim() : error
            event.sender.send('ai:stream-error', cleanError)
          }
          resolve()
        }

        if (model.provider === 'ollama') {
          console.log(`[Ollama] Streaming chat to ${model.name} with ${messages.length} messages.`)
          ollamaService.chatStream(model.name, messages, handleChunk, handleDone, handleError)
        } else {
          console.log(`[Cloud API] Streaming chat to ${model.name} via ${model.provider}`)
          const client = providerFactory.getClient(model.provider)
          client.chatStream(model.name, messages, handleChunk, handleDone, handleError)
        }
      })
    }

    await attemptStream()
  })

  /**
   * Install/pull an Ollama model in the background.
   */
  ipcMain.handle('ai:install-model', async (_event, modelId: string) => {
    return await ollamaService.pullModel(modelId)
  })

  /**
   * Stop the currently active stream.
   */
  ipcMain.handle('ai:stop-stream', () => {
    ollamaService.stopStream()
    try {
      providerFactory.getClient('openai').stopStream()
      providerFactory.getClient('anthropic').stopStream()
      providerFactory.getClient('google').stopStream()
    } catch (e) {
      // Ignore if clients aren't initialized
    }
  })

  /**
   * Fast inline autocomplete (Ghost Text).
   */
  ipcMain.handle('ai:autocomplete', async (_event, modelId: string, prefix: string, suffix: string) => {
    const model = modelRegistry.getModelById(modelId)
    if (!model) throw new Error(`Model ${modelId} not found.`)

    const prompt = `You are a code autocomplete engine. Your only job is to output EXACTLY the code that belongs between the Prefix and the Suffix. Do NOT output markdown backticks, explanations, or any conversational text. ONLY output the missing code.

Prefix:
${prefix}

Suffix:
${suffix}

Missing code:`

    if (model.provider === 'ollama') {
      const response = await ollamaService.chat(model.name, [{ role: 'user', content: prompt }])
      return response.content
    } else {
      const client = providerFactory.getClient(model.provider)
      const response = await client.chat(model.name, [{ role: 'user', content: prompt }])
      return response.content
    }
  })
}
