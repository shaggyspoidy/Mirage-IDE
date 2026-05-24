import { EventEmitter } from 'events'
import { spawn } from 'child_process'
import type {
  OllamaModel,
  OllamaTagsResponse,
  OllamaVersionResponse
} from '../../shared/types/model'

/**
 * OllamaService — main-process HTTP client for the Ollama REST API.
 *
 * WHY main process only: Electron security best practices dictate that the
 * renderer should never make direct HTTP requests to local services. All
 * Ollama communication is proxied through IPC, keeping the renderer sandboxed.
 *
 * WHY EventEmitter: The polling loop runs independently and needs to notify
 * the IPC layer when models change. EventEmitter decouples the service from
 * the IPC transport — the service doesn't know about ipcMain or BrowserWindow.
 *
 * Events:
 *   'models-updated' → (models: OllamaModel[]) — fired when poll detects changes
 *   'status-changed' → (running: boolean) — fired when Ollama connectivity changes
 */

const OLLAMA_BASE_URL = 'http://localhost:11434'
const POLL_INTERVAL_MS = 30_000 // 30 seconds background polling
const REQUEST_TIMEOUT_MS = 5_000 // 5 second timeout per request
const DEBOUNCE_MS = 500 // debounce for manual poll triggers

class OllamaService extends EventEmitter {
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private lastModelDigest: string = ''
  private isRunning: boolean = false
  private version: string | null = null
  private cachedModels: OllamaModel[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private activeStreamController: AbortController | null = null

  /**
   * Make a fetch request to Ollama with timeout handling.
   *
   * WHY AbortController: Node's fetch doesn't have a built-in timeout.
   * If Ollama is frozen or unreachable, we need to fail fast (5s) rather
   * than hanging the IPC channel indefinitely.
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check if Ollama is running by hitting the root endpoint.
   * Returns true if Ollama responds, false otherwise.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${OLLAMA_BASE_URL}/`)
      const wasRunning = this.isRunning
      this.isRunning = response.ok
      if (wasRunning !== this.isRunning) {
        this.emit('status-changed', this.isRunning)
      }
      return this.isRunning
    } catch {
      const wasRunning = this.isRunning
      this.isRunning = false
      if (wasRunning !== this.isRunning) {
        this.emit('status-changed', this.isRunning)
      }
      return false
    }
  }

  /**
   * Get Ollama version string.
   * Returns null if Ollama is not running.
   */
  async getVersion(): Promise<string | null> {
    try {
      const response = await this.fetchWithTimeout(`${OLLAMA_BASE_URL}/api/version`)
      if (!response.ok) return null
      const data = (await response.json()) as OllamaVersionResponse
      this.version = data.version
      return data.version
    } catch {
      return null
    }
  }

  /**
   * Fetch the list of locally installed models from Ollama.
   *
   * WHY we cache and diff: The background poll runs every 30s. We don't
   * want to push redundant updates to the renderer on every tick.
   * By computing a digest of model names+digests, we only emit
   * 'models-updated' when the model list actually changes.
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`)
      if (!response.ok) {
        console.warn(`[Ollama] /api/tags returned ${response.status}`)
        return this.cachedModels
      }

      const data = (await response.json()) as OllamaTagsResponse
      const models = data.models || []

      // Compute a simple digest to detect changes
      const digest = models
        .map((m) => `${m.name}:${m.digest}`)
        .sort()
        .join('|')

      if (digest !== this.lastModelDigest) {
        this.lastModelDigest = digest
        this.cachedModels = models
        this.emit('models-updated', models)
      } else {
        this.cachedModels = models
      }

      // Update running status as a side effect of successful API call
      if (!this.isRunning) {
        this.isRunning = true
        this.emit('status-changed', true)
      }

      return models
    } catch {
      // Connection failed — Ollama likely not running
      if (this.isRunning) {
        this.isRunning = false
        this.emit('status-changed', false)
      }
      return this.cachedModels
    }
  }

  /**
   * Start the background polling loop.
   *
   * WHY setInterval over recursive setTimeout: The poll is a simple periodic
   * task that doesn't need to wait for the previous poll to complete. If a
   * poll takes longer than the interval (unlikely with 30s), the next one
   * simply overlaps — acceptable since listModels is idempotent.
   */
  startPolling(): void {
    if (this.pollingTimer) return // Already polling

    console.log(`[Ollama] Starting background poll every ${POLL_INTERVAL_MS / 1000}s`)

    // Initial poll immediately
    this.listModels()

    this.pollingTimer = setInterval(() => {
      this.listModels()
    }, POLL_INTERVAL_MS)
  }

  /**
   * Stop the background polling loop.
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
      console.log('[Ollama] Stopped background polling')
    }
  }

  /**
   * Trigger an immediate poll, debounced to prevent flooding.
   *
   * WHY debounce: The model selector dropdown calls pollNow() on open.
   * If the user rapidly opens/closes the dropdown, we don't want to
   * hammer Ollama with requests. 500ms debounce collapses rapid calls.
   */
  async pollNow(): Promise<OllamaModel[]> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      this.debounceTimer = setTimeout(async () => {
        const models = await this.listModels()
        resolve(models)
      }, DEBOUNCE_MS)
    })
  }

  /**
   * Send a chat request to Ollama.
   * For Phase 8 V1, we wait for the complete response (stream: false).
   */
  async chat(modelName: string, messages: any[]): Promise<any> {
    const response = await this.fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: false
        })
      },
      60_000 // 60s timeout for generation
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama chat failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.message // returns { role: 'assistant', content: '...' }
  }

  /**
   * Stream a chat response from Ollama token-by-token.
   *
   * WHY streaming: Waiting for the full response creates a dead UI.
   * Streaming lets us render tokens as they arrive, giving the user
   * immediate feedback and a "typing" effect.
   *
   * HOW: Ollama's /api/chat with stream:true returns NDJSON — one JSON
   * object per line, each containing a partial token in message.content.
   * We read the response body as a stream and parse line-by-line.
   */
  async chatStream(
    modelName: string,
    messages: any[],
    onToken: (token: string) => void,
    onDone: (fullContent: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    // Cancel any existing stream
    this.stopStream()

    try {
      const controller = new AbortController()
      this.activeStreamController = controller
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        onError(`Ollama stream failed: ${response.status} ${errorText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('No response body reader available')
        return
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines from the buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the last incomplete line in the buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const chunk = JSON.parse(trimmed)
            if (chunk.message?.content) {
              fullContent += chunk.message.content
              onToken(chunk.message.content)
            }
            if (chunk.done) {
              onDone(fullContent)
              return
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // If we exit the loop without a done signal, finalize anyway
      onDone(fullContent)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stream was intentionally cancelled
        return
      }
      onError(err.message || 'Unknown streaming error')
    } finally {
      this.activeStreamController = null
    }
  }

  /**
   * Cancel the currently active stream, if any.
   */
  stopStream(): void {
    if (this.activeStreamController) {
      this.activeStreamController.abort()
      this.activeStreamController = null
    }
  }

  /**
   * Pull a model from the Ollama registry.
   */
  async pullModel(modelName: string, onProgress?: (status: string, progress: number) => void): Promise<void> {
    console.log(`[Ollama] Pulling model via API: ${modelName}`)
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body stream')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.status && onProgress) {
            let progress = 0
            if (data.total && data.completed) {
              progress = Math.round((data.completed / data.total) * 100)
            }
            onProgress(data.status, progress)
          }
        } catch (e) {
          // ignore parse errors for chunks
        }
      }
    }

    console.log(`[Ollama] Successfully pulled ${modelName}`)
    this.listModels() // Refresh the model list
  }

  /**
   * Get the cached model list without making a network request.
   */
  getCachedModels(): OllamaModel[] {
    return this.cachedModels
  }

  /**
   * Get the current Ollama connection status.
   */
  getStatus(): { running: boolean; version: string | null } {
    return {
      running: this.isRunning,
      version: this.version
    }
  }
}

/**
 * Singleton instance.
 * WHY singleton: There should be exactly one polling loop and one cache.
 * Multiple instances would create duplicate timers and race conditions.
 */
export const ollamaService = new OllamaService()
