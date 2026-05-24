import { create } from 'zustand'

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'ollama'

interface SettingsState {
  isSettingsOpen: boolean
  keyStatus: Record<string, boolean>
  toggleSettings: () => void
  fetchKeyStatus: () => Promise<void>
  saveKey: (provider: ModelProvider, key: string) => Promise<boolean>
  deleteKey: (provider: ModelProvider) => Promise<void>
  
  theme: string
  setTheme: (theme: string) => void
  
  autoSave: boolean
  setAutoSave: (enabled: boolean) => void
  
  inlineAutocomplete: boolean
  setInlineAutocomplete: (enabled: boolean) => void

  vimMode: boolean
  setVimMode: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isSettingsOpen: false,
  keyStatus: {},
  theme: localStorage.getItem('mirage-theme') || 'dark',
  autoSave: localStorage.getItem('mirage-autosave') !== 'false', // Default to true
  inlineAutocomplete: localStorage.getItem('mirage-inline-autocomplete') !== 'false', // Default to true
  vimMode: localStorage.getItem('mirage-vim-mode') === 'true', // Default to false

  setTheme: (theme: string) => {
    localStorage.setItem('mirage-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  setAutoSave: (enabled: boolean) => {
    localStorage.setItem('mirage-autosave', enabled.toString())
    set({ autoSave: enabled })
  },

  setInlineAutocomplete: (enabled: boolean) => {
    localStorage.setItem('mirage-inline-autocomplete', enabled.toString())
    set({ inlineAutocomplete: enabled })
  },

  setVimMode: (enabled: boolean) => {
    localStorage.setItem('mirage-vim-mode', enabled.toString())
    set({ vimMode: enabled })
  },

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  fetchKeyStatus: async () => {
    const status = await window.api.settings.getKeyStatus()
    set({ keyStatus: status })
  },
  saveKey: async (provider: ModelProvider, key: string) => {
    // We only pass cloud providers to settings
    if (provider === 'ollama') return false
    const success = await window.api.settings.saveKey(provider, key)
    if (success) {
      set((state) => ({ keyStatus: { ...state.keyStatus, [provider]: true } }))
    }
    return success
  },
  deleteKey: async (provider: ModelProvider) => {
    if (provider === 'ollama') return
    await window.api.settings.deleteKey(provider)
    set((state) => ({ keyStatus: { ...state.keyStatus, [provider]: false } }))
  }
}))
