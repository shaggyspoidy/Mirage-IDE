import { useState, useRef, useEffect } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface MenuItemType {
  label: string
  action?: () => void
  shortcut?: string
  divider?: boolean
  children?: MenuItemType[]
}

interface MenuDefinition {
  id: string
  label: string
  items: MenuItemType[]
}

/**
 * Helper to trigger a Monaco editor action by its ID.
 * Falls back silently if no editor is mounted.
 */
function triggerEditorAction(actionId: string): void {
  const editor = useWorkspaceStore.getState().editorInstance
  if (editor) {
    editor.focus()
    editor.trigger('menu', actionId, null)
  }
}

export function MenuBar(): React.JSX.Element {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const { openFile, openFolder, toggleTerminal } = useWorkspaceStore()

  // Define menus and their items
  const menus: MenuDefinition[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { 
          label: 'New Text File', 
          shortcut: 'Ctrl+N', 
          action: () => useWorkspaceStore.getState().createUntitledFile() 
        },
        { divider: true, label: '' },
        { 
          label: 'Open File...', 
          shortcut: 'Ctrl+O', 
          action: async () => {
            const result = await window.api.dialog.openFile()
            if (!result.canceled && result.path) {
              const filename = result.path.split(/[/\\]/).pop() || result.path
              openFile(result.path, filename)
            }
          }
        },
        { 
          label: 'Open Folder...', 
          shortcut: 'Ctrl+K Ctrl+O', 
          action: async () => {
            const result = await window.api.dialog.openFolder()
            if (!result.canceled && result.path) {
              openFolder(result.path)
            }
          }
        },
        { divider: true, label: '' },
        { 
          label: 'Save', 
          shortcut: 'Ctrl+S', 
          action: () => {
            const path = useWorkspaceStore.getState().activeFilePath
            if (path) useWorkspaceStore.getState().saveFile(path)
          }
        },
        { 
          label: 'Save All', 
          shortcut: 'Ctrl+K S', 
          action: () => useWorkspaceStore.getState().saveAllFiles() 
        },
        { divider: true, label: '' },
        { label: 'Exit', action: () => window.api.window.close() }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => triggerEditorAction('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => triggerEditorAction('redo') },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => triggerEditorAction('editor.action.clipboardCutAction') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => triggerEditorAction('editor.action.clipboardCopyAction') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: async () => {
          const editor = useWorkspaceStore.getState().editorInstance
          if (editor) {
            try {
              const text = await navigator.clipboard.readText()
              editor.focus()
              editor.trigger('menu', 'type', { text })
            } catch {
              editor.focus()
            }
          }
        }},
        { divider: true, label: '' },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => triggerEditorAction('actions.find') },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => triggerEditorAction('editor.action.startFindReplaceAction') },
        { divider: true, label: '' },
        { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: () => triggerEditorAction('editor.action.commentLine') }
      ]
    },
    {
      id: 'selection',
      label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => triggerEditorAction('editor.action.selectAll') },
        { label: 'Expand Selection', shortcut: 'Shift+Alt+→', action: () => triggerEditorAction('editor.action.smartSelect.expand') },
        { label: 'Shrink Selection', shortcut: 'Shift+Alt+←', action: () => triggerEditorAction('editor.action.smartSelect.shrink') },
        { divider: true, label: '' },
        { label: 'Copy Line Up', shortcut: 'Shift+Alt+↑', action: () => triggerEditorAction('editor.action.copyLinesUpAction') },
        { label: 'Copy Line Down', shortcut: 'Shift+Alt+↓', action: () => triggerEditorAction('editor.action.copyLinesDownAction') },
        { label: 'Move Line Up', shortcut: 'Alt+↑', action: () => triggerEditorAction('editor.action.moveLinesUpAction') },
        { label: 'Move Line Down', shortcut: 'Alt+↓', action: () => triggerEditorAction('editor.action.moveLinesDownAction') },
        { divider: true, label: '' },
        { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+↑', action: () => triggerEditorAction('editor.action.insertCursorAbove') },
        { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+↓', action: () => triggerEditorAction('editor.action.insertCursorBelow') }
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => useWorkspaceStore.getState().toggleCommandPalette() },
        { divider: true, label: '' },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => {
          window.dispatchEvent(new CustomEvent('mirage:openSearch'))
        }},
        { divider: true, label: '' },
        { label: 'Word Wrap', action: () => triggerEditorAction('editor.action.toggleWordWrap') },
        { divider: true, label: '' },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: () => toggleTerminal() }
      ]
    },
    {
      id: 'go',
      label: 'Go',
      items: [
        { label: 'Go to Line...', shortcut: 'Ctrl+G', action: () => triggerEditorAction('editor.action.gotoLine') },
        { divider: true, label: '' },
        { label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', action: () => triggerEditorAction('editor.action.jumpToBracket') }
      ]
    },
    {
      id: 'terminal',
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => {
          const { isTerminalOpen } = useWorkspaceStore.getState()
          if (!isTerminalOpen) toggleTerminal()
        }},
        { divider: true, label: '' },
        { label: 'Run Active File', action: () => {
          const path = useWorkspaceStore.getState().activeFilePath
          if (path && !path.startsWith('untitled')) {
            const ext = path.split('.').pop()?.toLowerCase()
            let cmd = ''
            if (ext === 'py') cmd = `python "${path}"`
            else if (ext === 'js') cmd = `node "${path}"`
            else if (ext === 'ts') cmd = `npx tsx "${path}"`
            else if (ext === 'java') {
              const dir = path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
              const filename = path.replace(/\\/g, '/').split('/').pop()?.replace('.java', '') || ''
              cmd = `cd "${dir}" && javac "${filename}.java" && java "${filename}"`
            }
            else if (ext === 'c') {
              const out = path.replace(/\\/g, '/').replace('.c', '')
              cmd = `gcc "${path}" -o "${out}" && "${out}"`
            }
            else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') {
              const out = path.replace(/\\/g, '/').replace(/\.(cpp|cc|cxx)$/, '')
              cmd = `g++ "${path}" -o "${out}" && "${out}"`
            }
            else if (ext === 'go') cmd = `go run "${path}"`
            else if (ext === 'rs') cmd = `rustc "${path}" -o "${path.replace('.rs', '')}" && "${path.replace('.rs', '')}"`
            else if (ext === 'rb') cmd = `ruby "${path}"`
            else if (ext === 'php') cmd = `php "${path}"`
            else if (ext === 'sh' || ext === 'bash') cmd = `bash "${path}"`
            else cmd = `echo "No runner configured for .${ext} files"`
            useWorkspaceStore.getState().executeCommand(cmd)
          }
        }}
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => triggerEditorAction('editor.action.quickCommand') },
        { divider: true, label: '' },
        { label: 'About Mirage', action: () => {
          // A simple, non-blocking about — could be made fancier later
          const editor = useWorkspaceStore.getState().editorInstance
          if (editor) editor.focus()
          alert('Mirage IDE v1.0.0\n\nA next-generation, agent-first IDE built with Electron, React, and Monaco Editor.\n\nhttps://github.com/shaggyspoidy/Mirage-IDE')
        }}
      ]
    }
  ]

  // Close menu on click outside
  useEffect(() => {
    if (!activeMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeMenuId])

  const handleMenuClick = (id: string) => {
    if (activeMenuId === id) {
      setActiveMenuId(null)
    } else {
      setActiveMenuId(id)
    }
  }

  const handleMenuHover = (id: string) => {
    if (activeMenuId && activeMenuId !== id) {
      setActiveMenuId(id)
    }
  }

  const handleAction = (action?: () => void) => {
    if (action) {
      action()
      setActiveMenuId(null)
    }
  }

  return (
    <div ref={menuBarRef} className="flex items-center h-full no-drag">
      {menus.map((menu) => (
        <div key={menu.id} className="relative h-full flex items-center">
          <button
            onClick={() => handleMenuClick(menu.id)}
            onMouseEnter={() => handleMenuHover(menu.id)}
            className={`h-full px-2 text-[13px] font-medium transition-colors ${
              activeMenuId === menu.id
                ? 'bg-[var(--m-hover-bg)] text-[var(--m-fg-primary)]'
                : 'text-[var(--m-fg-secondary)] hover:bg-[var(--m-hover-bg)] hover:text-[var(--m-fg-primary)]'
            }`}
          >
            {menu.label}
          </button>

          {activeMenuId === menu.id && (
            <div className="absolute top-full left-0 mt-0 min-w-[240px] bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] shadow-lg z-[100] py-1">
              {menu.items.map((item, index) => {
                if (item.divider) {
                  return <div key={`div-${index}`} className="border-t border-[var(--m-border-primary)] my-1" />
                }
                return (
                  <button
                    key={`${item.label}-${index}`}
                    onClick={() => handleAction(item.action)}
                    className="w-full text-left px-4 py-1.5 text-[13px] text-[var(--m-fg-primary)] hover:bg-[var(--m-accent-blue)] hover:text-white transition-none flex items-center justify-between group"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[11px] opacity-60 group-hover:opacity-90 ml-4">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
