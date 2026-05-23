import { useState, useRef, useEffect, useMemo } from 'react'
import { Terminal, FileText, Settings, Type, List, MonitorPlay, Save } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'

interface CommandAction {
  id: string
  title: string
  category: string
  icon: React.ReactNode
  perform: () => void
}

export function CommandPalette(): React.JSX.Element | null {
  const { isCommandPaletteOpen, toggleCommandPalette, createUntitledFile, saveFile, activeFilePath, toggleTerminal, executeCommand } = useWorkspaceStore()
  const { toggleSettings } = useSettingsStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Define available commands
  const commands = useMemo<CommandAction[]>(() => {
    return [
      {
        id: 'file.new',
        title: 'New Untitled File',
        category: 'File',
        icon: <FileText size={14} />,
        perform: () => createUntitledFile()
      },
      {
        id: 'file.save',
        title: 'Save Active File',
        category: 'File',
        icon: <Save size={14} />,
        perform: () => {
          if (activeFilePath) saveFile(activeFilePath)
        }
      },
      {
        id: 'view.terminal',
        title: 'Toggle Terminal',
        category: 'View',
        icon: <Terminal size={14} />,
        perform: () => toggleTerminal()
      },
      {
        id: 'view.settings',
        title: 'Open Settings',
        category: 'Preferences',
        icon: <Settings size={14} />,
        perform: () => toggleSettings()
      },
      {
        id: 'terminal.run',
        title: 'Run Active File',
        category: 'Terminal',
        icon: <MonitorPlay size={14} />,
        perform: () => {
          if (activeFilePath && !activeFilePath.startsWith('untitled')) {
            const ext = activeFilePath.split('.').pop()?.toLowerCase()
            let cmd = ''
            if (ext === 'py') cmd = `python "${activeFilePath}"`
            else if (ext === 'js') cmd = `node "${activeFilePath}"`
            else if (ext === 'ts') cmd = `npx tsx "${activeFilePath}"`
            else if (ext === 'java') {
              const dir = activeFilePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
              const filename = activeFilePath.replace(/\\/g, '/').split('/').pop()?.replace('.java', '') || ''
              cmd = `cd "${dir}" && javac "${filename}.java" && java "${filename}"`
            }
            else if (ext === 'c') {
              const out = activeFilePath.replace(/\\/g, '/').replace('.c', '')
              cmd = `gcc "${activeFilePath}" -o "${out}" && "${out}"`
            }
            else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') {
              const out = activeFilePath.replace(/\\/g, '/').replace(/\.(cpp|cc|cxx)$/, '')
              cmd = `g++ "${activeFilePath}" -o "${out}" && "${out}"`
            }
            else if (ext === 'go') cmd = `go run "${activeFilePath}"`
            else if (ext === 'rs') cmd = `rustc "${activeFilePath}" -o "${activeFilePath.replace('.rs', '')}" && "${activeFilePath.replace('.rs', '')}"`
            else if (ext === 'rb') cmd = `ruby "${activeFilePath}"`
            else if (ext === 'php') cmd = `php "${activeFilePath}"`
            else if (ext === 'sh' || ext === 'bash') cmd = `bash "${activeFilePath}"`
            else cmd = `echo "No runner configured for .${ext} files"`
            executeCommand(cmd)
            // Ensure terminal is open
            if (!useWorkspaceStore.getState().isTerminalOpen) {
              toggleTerminal()
            }
          }
        }
      },
      {
        id: 'editor.wordwrap',
        title: 'Toggle Word Wrap',
        category: 'Editor',
        icon: <Type size={14} />,
        perform: () => {
          const editor = useWorkspaceStore.getState().editorInstance
          if (editor) editor.trigger('keyboard', 'editor.action.toggleWordWrap', {})
        }
      },
      {
        id: 'editor.format',
        title: 'Format Document',
        category: 'Editor',
        icon: <List size={14} />,
        perform: () => {
          const editor = useWorkspaceStore.getState().editorInstance
          if (editor) editor.trigger('keyboard', 'editor.action.formatDocument', {})
        }
      }
    ]
  }, [createUntitledFile, saveFile, activeFilePath, toggleTerminal, toggleSettings, executeCommand])

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!query) return commands
    const lowerQuery = query.toLowerCase()
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(lowerQuery) || 
      cmd.category.toLowerCase().includes(lowerQuery)
    )
  }, [query, commands])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isCommandPaletteOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleCommandPalette()
      e.preventDefault()
    } else if (e.key === 'ArrowDown') {
      setSelectedIndex(i => (i + 1) % filteredCommands.length)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length)
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].perform()
        toggleCommandPalette()
      }
      e.preventDefault()
    }
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 bottom-0 z-[110] flex items-start justify-center pt-[15vh] animate-in fade-in duration-200"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleCommandPalette() }}
    >
      <div
        className="w-[600px] max-h-[50vh] rounded-xl border border-[var(--m-border-secondary)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-200"
        style={{
          background: 'color-mix(in srgb, var(--m-bg-surface) 95%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)'
        }}
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--m-border-primary)]">
          <span className="text-[var(--m-fg-subtle)] mr-3 font-mono text-lg">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[14px] text-[var(--m-fg-primary)] focus:outline-none placeholder-[var(--m-fg-subtle)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--m-fg-muted)] text-center">
              No matching commands
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.perform()
                  toggleCommandPalette()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-4 py-2 flex items-center justify-between group transition-colors ${
                  idx === selectedIndex 
                    ? 'bg-[var(--m-accent-blue)] text-white' 
                    : 'text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`opacity-70 ${idx === selectedIndex ? 'text-white' : 'text-[var(--m-fg-muted)]'}`}>
                    {cmd.icon}
                  </span>
                  <span className="text-sm font-medium">{cmd.title}</span>
                </div>
                <span className={`text-xs ${idx === selectedIndex ? 'text-blue-200' : 'text-[var(--m-fg-subtle)]'}`}>
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
