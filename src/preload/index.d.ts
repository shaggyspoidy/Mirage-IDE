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
  createDir: (path: string) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
  delete: (path: string) => Promise<void>
  searchFiles: (rootPath: string, query: string) => Promise<any[]>
  importVsCodeSettings: () => Promise<any>
  getProjectContext: (workspacePath: string, maxFiles?: number) => Promise<{ tree: string; files: { path: string; relativePath: string; content: string; }[] }>

  // Git features
  getGitInfo: (dirPath: string) => Promise<any>
  getGitStatus: (dirPath: string) => Promise<any>
  getGitRemotes: (dirPath: string) => Promise<any>
  gitCommit: (dirPath: string, message: string) => Promise<void>
  gitPush: (dirPath: string) => Promise<void>
  gitPull: (dirPath: string) => Promise<void>
  getFileContentAtHead: (dirPath: string, filePath: string) => Promise<string | null>
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
  chatStream: (modelId: string, messages: { role: string; content: string }[]) => Promise<void>
  stopStream: () => Promise<void>
  getAutocomplete: (modelId: string, prefix: string, suffix: string) => Promise<string>
  installModel: (modelId: string) => Promise<boolean>
  onModelsUpdated: (callback: (models: ModelInfo[]) => void) => () => void
  onStatusChanged: (callback: (status: OllamaStatus) => void) => () => void
  onStreamChunk: (callback: (token: string) => void) => () => void
  onStreamDone: (callback: (fullContent: string) => void) => () => void
  onStreamError: (callback: (error: string) => void) => () => void
  onModelFallback: (callback: (newModelId: string) => void) => () => void
}

interface SettingsApi {
  saveKey: (provider: 'openai' | 'anthropic' | 'google', key: string) => Promise<boolean>
  getKeyStatus: () => Promise<Record<string, boolean>>
  deleteKey: (provider: 'openai' | 'anthropic' | 'google') => Promise<boolean>
}

interface TerminalApi {
  spawn: (cols: number, rows: number, cwd?: string) => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
  onData: (callback: (data: string) => void) => () => void
}

interface MirageApi {
  fs: FsApi
  window: WindowApi
  dialog: DialogApi
  ai: AiApi
  settings: SettingsApi
  terminal: TerminalApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: MirageApi
  }
}
