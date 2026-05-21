import { useState, useRef, useEffect } from 'react'

/**
 * FileMenu — dropdown menu in the title bar for file operations.
 * 
 * WHY this component: Provides familiar File > Open Folder / Open File
 * actions that trigger Electron's native OS dialog. When a path is selected,
 * it sends Neovim commands via the terminal IPC to change directory and
 * open files, keeping everything within the Neovim workflow.
 */

interface FileMenuProps {
  onOpenFolder: (path: string) => void
  onOpenFile: (path: string) => void
}

export function FileMenu({ onOpenFolder, onOpenFile }: FileMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleOpenFolder = async () => {
    setIsOpen(false)
    const result = await window.api.dialog.openFolder()
    if (!result.canceled && result.path) {
      onOpenFolder(result.path)
    }
  }

  const handleOpenFile = async () => {
    setIsOpen(false)
    const result = await window.api.dialog.openFile()
    if (!result.canceled && result.path) {
      onOpenFile(result.path)
    }
  }

  return (
    <div ref={menuRef} className="relative h-full flex items-center no-drag">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-full px-3 text-xs font-medium text-fg-secondary hover:bg-hover-bg hover:text-fg-primary transition-colors"
      >
        File
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-0.5 w-56 bg-bg-surface border border-border-primary rounded-md shadow-lg z-[100] py-1 text-sm">
          <button
            onClick={handleOpenFolder}
            className="w-full text-left px-4 py-2 text-fg-secondary hover:bg-hover-bg hover:text-fg-primary transition-colors flex items-center gap-3"
          >
            <span className="text-accent-blue">📁</span>
            Open Folder
            <span className="ml-auto text-[10px] text-fg-muted">Ctrl+K</span>
          </button>

          <button
            onClick={handleOpenFile}
            className="w-full text-left px-4 py-2 text-fg-secondary hover:bg-hover-bg hover:text-fg-primary transition-colors flex items-center gap-3"
          >
            <span className="text-accent-green">📄</span>
            Open File
            <span className="ml-auto text-[10px] text-fg-muted">Ctrl+O</span>
          </button>

          <div className="border-t border-border-primary my-1" />

          <button
            onClick={() => { setIsOpen(false); window.api.window.close() }}
            className="w-full text-left px-4 py-2 text-fg-secondary hover:bg-hover-bg hover:text-fg-primary transition-colors flex items-center gap-3"
          >
            <span className="text-accent-red">✕</span>
            Exit
            <span className="ml-auto text-[10px] text-fg-muted">Alt+F4</span>
          </button>
        </div>
      )}
    </div>
  )
}
