import { ElectronAPI } from '@electron-toolkit/preload'

/**
 * Type declarations for the preload API exposed via contextBridge.
 * WHY explicit types: The renderer has no access to the preload's runtime code.
 * These declarations tell TypeScript what window.api looks like, enabling
 * full type safety for all IPC calls from React components and hooks.
 */

interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

interface FsApi {
  readDir: (path: string) => Promise<FileEntry[]>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  importVsCodeSettings: () => Promise<any>
}

interface WindowApi {
  minimize: () => void
  maximize: () => void
  close: () => void
}

interface DialogResult {
  canceled: boolean
  path: string | null
}

interface DialogApi {
  openFolder: () => Promise<DialogResult>
  openFile: () => Promise<DialogResult>
}

interface ModelInfo {
  id: string
  name: string
  displayName: string
  provider: 'ollama' | 'openai' | 'anthropic' | 'google'
  tier: 'local' | 'cloud-api' | 'cloud-ollama'
  parameterSize?: string
  contextWindow?: number
  quantization?: string
  isInstalled: boolean
  sizeBytes?: number
  family?: string
}

interface OllamaStatus {
  running: boolean
  version: string | null
}

interface AiApi {
  getModels: () => Promise<ModelInfo[]>
  pollModels: () => Promise<ModelInfo[]>
  selectModel: (modelId: string) => Promise<ModelInfo | null>
  getStatus: () => Promise<OllamaStatus>
  getSelectedModel: () => Promise<string | null>
  chat: (modelId: string, messages: { role: string; content: string }[]) => Promise<{ role: string; content: string }>
  onModelsUpdated: (callback: (models: ModelInfo[]) => void) => () => void
  onStatusChanged: (callback: (status: OllamaStatus) => void) => () => void
}

interface SettingsApi {
  saveKey: (provider: 'openai' | 'anthropic' | 'google', key: string) => Promise<boolean>
  getKeyStatus: () => Promise<Record<string, boolean>>
  deleteKey: (provider: 'openai' | 'anthropic' | 'google') => Promise<boolean>
}

interface MirageApi {
  fs: FsApi
  window: WindowApi
  dialog: DialogApi
  ai: AiApi
  settings: SettingsApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: MirageApi
  }
}
