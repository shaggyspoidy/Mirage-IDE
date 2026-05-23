import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { ApiKeyForm } from './ApiKeyForm'

export function SettingsPanel(): React.JSX.Element | null {
  const { isSettingsOpen, toggleSettings, fetchKeyStatus, keyStatus, theme, setTheme } = useSettingsStore()

  useEffect(() => {
    if (isSettingsOpen) {
      fetchKeyStatus()
    }
  }, [isSettingsOpen, fetchKeyStatus])

  if (!isSettingsOpen) return null

  return (
    <div className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm">
      <div className="w-[500px] bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--m-border-primary)] bg-[var(--m-bg-primary)]">
          <h2 className="text-sm font-semibold tracking-wide">Settings & API Keys</h2>
          <button
            onClick={toggleSettings}
            className="text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-fg-muted)]">Cloud AI Providers</h3>
            <p className="text-xs text-[var(--m-fg-primary)] opacity-80 mb-2">
              Configure API keys to enable cloud AI models (Claude, GPT-4, Gemini) natively without Ollama.
            </p>
          </div>

          <ApiKeyForm provider="anthropic" displayName="Anthropic (Claude)" isConfigured={!!keyStatus['anthropic']} />
          <ApiKeyForm provider="openai" displayName="OpenAI (GPT)" isConfigured={!!keyStatus['openai']} />
          <ApiKeyForm provider="google" displayName="Google (Gemini)" isConfigured={!!keyStatus['google']} />

          <div className="h-px bg-[var(--m-border-primary)] my-2" />

          <div className="flex flex-col gap-1 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-fg-muted)]">Appearance</h3>
            <p className="text-xs text-[var(--m-fg-primary)] opacity-80 mb-2">
              Customize the look and feel of the IDE.
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--m-fg-primary)] font-medium">Color Theme</label>
              <div className="relative">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="appearance-none bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] text-[var(--m-fg-primary)] text-sm rounded px-3 py-1.5 pr-8 focus:outline-none focus:border-[var(--m-accent-blue)]"
                >
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                  <option value="catppuccin-mocha">Catppuccin Mocha</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="obsidian-default">Obsidian Default</option>
                  <option value="obsidian-nord">Obsidian Nord</option>
                  <option value="dracula">Dracula</option>
                  <option value="one-dark-pro">One Dark Pro</option>
                  <option value="github-dark">GitHub Dark</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--m-fg-muted)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--m-border-primary)] my-2" />

          <div className="flex flex-col gap-1 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-fg-muted)]">Editor</h3>
            <p className="text-xs text-[var(--m-fg-primary)] opacity-80 mb-2">
              Configure code editor behavior.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={useSettingsStore.getState().autoSave}
                  onChange={(e) => useSettingsStore.getState().setAutoSave(e.target.checked)}
                />
                <div className="w-9 h-5 bg-[var(--m-border-primary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--m-accent-blue)]"></div>
              </div>
              <span className="text-sm text-[var(--m-fg-primary)] font-medium">Auto-Save (on delay)</span>
            </label>
          </div>

        </div>
      </div>
    </div>
  )
}
