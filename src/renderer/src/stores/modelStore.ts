import { create } from 'zustand'
import type { ModelInfo, OllamaStatus } from '../../../shared/types/model'

/**
 * Model Store — manages AI model state in the renderer.
 *
 * WHY a dedicated store: The model selector, title bar, and future chat panel
 * all need access to the same model state (selected model, connection status,
 * available models). Zustand provides reactive updates across all consumers
 * without prop drilling.
 *
 * DATA FLOW:
 *   1. On mount: fetchModels() → IPC ai:get-models → cached list from main process
 *   2. Background: main process polls Ollama every 30s → ai:models-updated → store updates
 *   3. Dropdown open: pollModels() → IPC ai:poll-models → fresh list from Ollama
 *   4. Model click: selectModel(id) → IPC ai:select-model → store + main process update
 */

type OllamaConnectionStatus = 'connected' | 'disconnected' | 'checking'

interface ModelState {
  /** All available models across all tiers */
  models: ModelInfo[]

  /** ID of the currently selected model */
  selectedModelId: string | null

  /** Ollama connection status for UI indicators */
  ollamaStatus: OllamaConnectionStatus

  /** Ollama version string if connected */
  ollamaVersion: string | null

  /** Whether a poll is currently in flight (for loading spinner) */
  isPolling: boolean
  isModelPanelOpen: boolean

  fetchModels: () => Promise<void>
  pollModels: () => Promise<void>
  selectModel: (modelId: string) => Promise<void>
  checkStatus: () => Promise<void>
  setModelPanelOpen: (isOpen: boolean) => void
  initialize: () => () => void
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  selectedModelId: null,
  ollamaStatus: 'checking',
  ollamaVersion: null,
  isPolling: false,
  isModelPanelOpen: false,

  setModelPanelOpen: (isOpen: boolean) => set({ isModelPanelOpen: isOpen }),

  fetchModels: async () => {
    try {
      const models = (await window.api.ai.getModels()) as ModelInfo[]
      set({ models })
    } catch (error) {
      console.error('[ModelStore] Failed to fetch models:', error)
    }
  },

  pollModels: async () => {
    set({ isPolling: true })
    try {
      const models = (await window.api.ai.pollModels()) as ModelInfo[]
      set({ models, isPolling: false })
    } catch (error) {
      console.error('[ModelStore] Failed to poll models:', error)
      set({ isPolling: false })
    }
  },

  selectModel: async (modelId: string) => {
    set({ selectedModelId: modelId })
    try {
      await window.api.ai.selectModel(modelId)
    } catch (error) {
      console.error('[ModelStore] Failed to select model:', error)
    }
  },

  checkStatus: async () => {
    set({ ollamaStatus: 'checking' })
    try {
      const status = (await window.api.ai.getStatus()) as OllamaStatus
      set({
        ollamaStatus: status.running ? 'connected' : 'disconnected',
        ollamaVersion: status.version
      })
    } catch (error) {
      console.error('[ModelStore] Failed to check status:', error)
      set({ ollamaStatus: 'disconnected' })
    }
  },

  /**
   * Initialize the store and subscribe to push events from the main process.
   *
   * WHY returns a cleanup function: React's useEffect expects a cleanup.
   * We subscribe to two IPC push channels (models-updated, status-changed)
   * and must unsubscribe on component unmount to prevent memory leaks.
   */
  initialize: () => {
    // Fetch initial data
    get().fetchModels()
    get().checkStatus()

    // Subscribe to push events from main process
    const cleanupModels = window.api.ai.onModelsUpdated((models: ModelInfo[]) => {
      set({ models })
    })

    const cleanupStatus = window.api.ai.onStatusChanged((status: OllamaStatus) => {
      set({
        ollamaStatus: status.running ? 'connected' : 'disconnected',
        ollamaVersion: status.version
      })
    })

    const cleanupFallback = window.api.ai.onModelFallback((newModelId: string) => {
      set({ selectedModelId: newModelId })
    })

    // Return combined cleanup function
    return () => {
      cleanupModels()
      cleanupStatus()
      cleanupFallback()
    }
  }
}))
