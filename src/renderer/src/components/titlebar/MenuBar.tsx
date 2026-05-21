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
        { label: 'New Text File', shortcut: 'Ctrl+N', action: () => alert('Not implemented: New Text File') },
        { label: 'New File...', shortcut: 'Ctrl+Alt+Windows+N', action: () => alert('Not implemented: New File') },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: () => alert('Not implemented: New Window') },
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
        { label: 'Save', shortcut: 'Ctrl+S', action: () => alert('Not implemented: Save') },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => alert('Not implemented: Save As') },
        { label: 'Save All', shortcut: 'Ctrl+K S', action: () => alert('Not implemented: Save All') },
        { divider: true, label: '' },
        { label: 'Exit', action: () => window.api.window.close() }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => alert('Not implemented: Undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => alert('Not implemented: Redo') },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => alert('Not implemented: Cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => alert('Not implemented: Copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => alert('Not implemented: Paste') },
        { divider: true, label: '' },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => alert('Not implemented: Find') },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => alert('Not implemented: Replace') },
        { divider: true, label: '' },
        { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: () => alert('Not implemented: Toggle Comment') }
      ]
    },
    {
      id: 'selection',
      label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => alert('Not implemented: Select All') },
        { label: 'Expand Selection', shortcut: 'Shift+Alt+RightArrow', action: () => alert('Not implemented: Expand Selection') },
        { divider: true, label: '' },
        { label: 'Copy Line Up', shortcut: 'Shift+Alt+UpArrow', action: () => alert('Not implemented: Copy Line Up') },
        { label: 'Copy Line Down', shortcut: 'Shift+Alt+DownArrow', action: () => alert('Not implemented: Copy Line Down') },
        { divider: true, label: '' },
        { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+UpArrow', action: () => alert('Not implemented: Add Cursor Above') }
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => alert('Not implemented: Command Palette') },
        { divider: true, label: '' },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => alert('Not implemented: Explorer') },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => alert('Not implemented: Search') },
        { divider: true, label: '' },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: () => toggleTerminal() }
      ]
    },
    {
      id: 'go',
      label: 'Go',
      items: [
        { label: 'Back', shortcut: 'Alt+LeftArrow', action: () => alert('Not implemented: Back') },
        { label: 'Forward', shortcut: 'Alt+RightArrow', action: () => alert('Not implemented: Forward') },
        { divider: true, label: '' },
        { label: 'Go to File...', shortcut: 'Ctrl+P', action: () => alert('Not implemented: Go to File') },
        { label: 'Go to Definition', shortcut: 'F12', action: () => alert('Not implemented: Go to Definition') }
      ]
    },
    {
      id: 'run',
      label: 'Run',
      items: [
        { label: 'Start Debugging', shortcut: 'F5', action: () => alert('Not implemented: Start Debugging') },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: () => alert('Not implemented: Run Without Debugging') },
        { divider: true, label: '' },
        { label: 'Toggle Breakpoint', shortcut: 'F9', action: () => alert('Not implemented: Toggle Breakpoint') }
      ]
    },
    {
      id: 'terminal',
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => toggleTerminal() },
        { divider: true, label: '' },
        { label: 'Run Task...', action: () => alert('Not implemented: Run Task') }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Welcome', action: () => alert('Not implemented: Welcome') },
        { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', action: () => alert('Not implemented: Keyboard Shortcuts') },
        { divider: true, label: '' },
        { label: 'About', action: () => alert('Mirage IDE v1.0.0') }
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
