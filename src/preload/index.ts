import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * Preload script — the security boundary between main and renderer.
 * 
 * WHY contextBridge: Electron's context isolation means the renderer cannot
 * directly access Node.js or Electron APIs. contextBridge creates a controlled
 * API surface. Only the channels explicitly listed here are accessible from
 * the renderer's window.api object.
 * 
 * WHY we expose callbacks via on/off pattern: For streaming data (terminal output),
 * the renderer needs to subscribe to events pushed from the main process.
 * We wrap ipcRenderer.on/removeListener to prevent the renderer from accessing
 * ipcRenderer directly.
 */


const fsApi = {
  readDir: (path: string) => ipcRenderer.invoke('fs:read-dir', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  createDir: (path: string) => ipcRenderer.invoke('fs:create-dir', path),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  delete: (path: string) => ipcRenderer.invoke('fs:delete', path),
  searchFiles: (rootPath: string, query: string) => ipcRenderer.invoke('fs:search-files', rootPath, query),
  getProjectContext: (rootPath: string) => ipcRenderer.invoke('fs:get-project-context', rootPath),
  importVsCodeSettings: () => ipcRenderer.invoke('fs:import-vscode-settings')
}

const windowApi = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
}

const dialogApi = {
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  openFile: () => ipcRenderer.invoke('dialog:open-file')
}

const aiApi = {
  /**
   * Get the current cached model list (no network request).
   * Used on initial mount to populate the model selector immediately.
   */
  getModels: () => ipcRenderer.invoke('ai:get-models'),

  /**
   * Trigger an immediate Ollama poll and return updated models.
   * Used when the model selector dropdown opens for real-time freshness.
   */
  pollModels: () => ipcRenderer.invoke('ai:poll-models'),

  /**
   * Set the active model for AI operations.
   * Returns the selected model's info, or null if not found.
   */
  selectModel: (modelId: string) => ipcRenderer.invoke('ai:select-model', modelId),

  /**
   * Get Ollama connection status (running/version).
   */
  getStatus: () => ipcRenderer.invoke('ai:get-status'),

  /**
   * Get the currently selected model ID.
   */
  getSelectedModel: () => ipcRenderer.invoke('ai:get-selected-model'),

  /**
   * Send a chat request to the AI model (non-streaming, legacy).
   */
  chat: (modelId: string, messages: unknown[]) => ipcRenderer.invoke('ai:chat', modelId, messages),

  /**
   * Initiate a streaming chat request.
   * Tokens arrive via onStreamChunk; completion via onStreamDone.
   */
  chatStream: (modelId: string, messages: unknown[]) =>
    ipcRenderer.invoke('ai:chat-stream', modelId, messages),

  /**
   * Subscribe to streaming token chunks.
   */
  onStreamChunk: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => callback(token)
    ipcRenderer.on('ai:stream-chunk', handler)
    return () => ipcRenderer.removeListener('ai:stream-chunk', handler)
  },

  /**
   * Subscribe to stream completion.
   */
  onStreamDone: (callback: (fullContent: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, content: string) => callback(content)
    ipcRenderer.on('ai:stream-done', handler)
    return () => ipcRenderer.removeListener('ai:stream-done', handler)
  },

  /**
   * Subscribe to stream errors.
   */
  onStreamError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('ai:stream-error', handler)
    return () => ipcRenderer.removeListener('ai:stream-error', handler)
  },

  /**
   * Install/pull a missing Ollama model.
   */
  installModel: (modelId: string) => ipcRenderer.invoke('ai:install-model', modelId),

  /**
   * Stop the currently active AI stream.
   */
  stopStream: () => ipcRenderer.invoke('ai:stop-stream'),

  /**
   * Subscribe to model list updates pushed from the main process
   * when background polling detects changes.
   */
  onModelsUpdated: (callback: (models: unknown[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, models: unknown[]) => callback(models)
    ipcRenderer.on('ai:models-updated', handler)
    return () => ipcRenderer.removeListener('ai:models-updated', handler)
  },

  /**
   * Subscribe to Ollama status changes (connected/disconnected).
   */
  onStatusChanged: (callback: (status: { running: boolean; version: string | null }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      status: { running: boolean; version: string | null }
    ) => callback(status)
    ipcRenderer.on('ai:status-changed', handler)
    return () => ipcRenderer.removeListener('ai:status-changed', handler)
  }
}

const settingsApi = {
  saveKey: (provider: string, key: string) => ipcRenderer.invoke('settings:save-key', provider, key),
  getKeyStatus: () => ipcRenderer.invoke('settings:get-key-status'),
  deleteKey: (provider: string) => ipcRenderer.invoke('settings:delete-key', provider)
}

const terminalApi = {
  spawn: (cols: number, rows: number, cwd?: string) => ipcRenderer.send('terminal:spawn', cols, rows, cwd),
  write: (data: string) => ipcRenderer.send('terminal:write', data),
  resize: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', cols, rows),
  kill: () => ipcRenderer.send('terminal:kill'),
  onData: (callback: (data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  }
}

// Use contextBridge to expose APIs to the renderer process safely.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      fs: fsApi,
      window: windowApi,
      dialog: dialogApi,
      ai: aiApi,
      settings: settingsApi,
      terminal: terminalApi
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = {
    fs: fsApi,
    window: windowApi,
    dialog: dialogApi,
    ai: aiApi,
    terminal: terminalApi
  }
}
