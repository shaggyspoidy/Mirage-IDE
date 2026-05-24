import { useEffect, useState, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { ApiKeyForm } from './ApiKeyForm'

const THEMES = [
  { value: "dark", label: "Dark (Default)" },
  { value: "light", label: "Light" },
  { value: "tokyonight", label: "TokyoNight" },
  { value: "aura", label: "Aura" },
  { value: "nightfox", label: "Nightfox" },
  { value: "kanagawa", label: "Kanagawa" },
  { value: "rose-pine", label: "Rosé Pine" },
  { value: "cyberdream", label: "Cyberdream" },
  { value: "oxocarbon", label: "Oxocarbon" },
  { value: "vague", label: "Vague" },
  { value: "moonfly", label: "Moonfly" },
  { value: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "obsidian-default", label: "Obsidian Default" },
  { value: "obsidian-nord", label: "Obsidian Nord" },
  { value: "dracula", label: "Dracula" },
  { value: "one-dark-pro", label: "One Dark Pro" },
  { value: "github-dark", label: "GitHub Dark" }
]

function ThemeSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedTheme = THEMES.find(t => t.value === value) || THEMES[0]

  return (
    <div className="relative w-48" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] text-[var(--m-fg-primary)] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[var(--m-accent-blue)]"
      >
        <span className="truncate">{selectedTheme.label}</span>
        <ChevronDown size={14} className="text-[var(--m-fg-muted)] shrink-0 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded shadow-xl z-[100] max-h-[160px] overflow-y-auto no-scrollbar">
          {THEMES.map(theme => (
            <button
              key={theme.value}
              onClick={() => {
                onChange(theme.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                value === theme.value 
                  ? 'bg-[var(--m-accent-blue)] text-white' 
                  : 'text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)]'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
                <ThemeSelect value={theme} onChange={setTheme} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--m-border-primary)] my-2" />

          <div className="flex flex-col gap-1 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-fg-muted)]">Editor</h3>
            <p className="text-xs text-[var(--m-fg-primary)] opacity-80 mb-2">
              Configure code editor behavior.
            </p>
            <div className="flex flex-col gap-3">
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

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={useSettingsStore.getState().inlineAutocomplete}
                    onChange={(e) => useSettingsStore.getState().setInlineAutocomplete(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-[var(--m-border-primary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--m-accent-blue)]"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-[var(--m-fg-primary)] font-medium">AI Inline Autocomplete</span>
                  <span className="text-xs text-[var(--m-fg-muted)]">Shows "ghost text" suggestions as you type</span>
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
