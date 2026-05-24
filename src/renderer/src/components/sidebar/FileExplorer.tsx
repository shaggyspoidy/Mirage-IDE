import { useState, useEffect, useRef } from 'react'
import { 
  ChevronRight, ChevronDown, File, Folder, FolderOpen, 
  FilePlus, FolderPlus, Pencil, Trash2,
  FileJson, FileCode2, Image as ImageIcon, Terminal, FileText, Settings, Database
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

const getFileIcon = (fileName: string, isSelected: boolean) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const colorClass = isSelected ? 'text-white/80' : 'text-[var(--m-fg-muted)]'
  
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode2 size={14} className={isSelected ? colorClass : 'text-[var(--m-accent-blue)]'} />
    case 'json':
      return <FileJson size={14} className={isSelected ? colorClass : 'text-[var(--m-accent-yellow)]'} />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'ico':
      return <ImageIcon size={14} className={isSelected ? colorClass : 'text-[var(--m-accent-purple)]'} />
    case 'sh':
    case 'bash':
    case 'ps1':
      return <Terminal size={14} className={isSelected ? colorClass : 'text-[var(--m-accent-green)]'} />
    case 'md':
    case 'txt':
      return <FileText size={14} className={colorClass} />
    case 'env':
    case 'yml':
    case 'yaml':
    case 'toml':
    case 'ini':
      return <Settings size={14} className={isSelected ? colorClass : 'text-[var(--m-fg-secondary)]'} />
    case 'sql':
    case 'db':
    case 'sqlite':
      return <Database size={14} className={isSelected ? colorClass : 'text-[var(--m-accent-red)]'} />
    default:
      return <File size={14} className={colorClass} />
  }
}

/**
 * Context Menu — sleek floating menu with glassmorphism and micro-animations
 */
function ContextMenu({ 
  x, y, entry, onClose, onRefresh 
}: { 
  x: number; y: number; entry: FileEntry; onClose: () => void; onRefresh: () => void 
}): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showInput, setShowInput] = useState<'file' | 'folder' | 'rename' | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const parentDir = entry.isDirectory ? entry.path : entry.path.substring(0, entry.path.lastIndexOf(/[/\\]/.test(entry.path) ? (entry.path.includes('/') ? '/' : '\\') : '/'))

  const handleSubmit = async (): Promise<void> => {
    if (!inputValue.trim()) return
    try {
      if (showInput === 'file') {
        const filePath = `${parentDir}/${inputValue.trim()}`
        await window.api.fs.writeFile(filePath, '')
      } else if (showInput === 'folder') {
        const dirPath = `${parentDir}/${inputValue.trim()}`
        await window.api.fs.createDir(dirPath)
      } else if (showInput === 'rename') {
        const dir = entry.path.substring(0, entry.path.lastIndexOf(/[/\\]/.test(entry.path) ? (entry.path.includes('/') ? '/' : '\\') : '/'))
        const newPath = `${dir}/${inputValue.trim()}`
        await window.api.fs.rename(entry.path, newPath)
      }
      onRefresh()
      onClose()
    } catch (err) {
      console.error('File operation failed:', err)
    }
  }

  const handleDelete = async (): Promise<void> => {
    try {
      await window.api.fs.delete(entry.path)
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }



  return (
    <div
      ref={menuRef}
      className="fixed z-[999] min-w-[200px] py-1.5 rounded-lg border border-[var(--m-border-secondary)] shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        top: y, 
        left: x,
        background: 'color-mix(in srgb, var(--m-bg-surface) 85%, transparent)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)'
      }}
    >
      {showInput ? (
        <div className="px-3 py-2">
          <p className="text-[10px] text-[var(--m-fg-muted)] mb-1.5 uppercase tracking-wider">
            {showInput === 'file' ? 'New File' : showInput === 'folder' ? 'New Folder' : 'Rename'}
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={showInput === 'rename' ? entry.name : `Enter name...`}
              className="flex-1 px-2 py-1 text-[11px] bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] rounded text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)] transition-colors"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              className="px-2.5 py-1 text-[10px] bg-[var(--m-accent-blue)] text-white rounded hover:opacity-90 transition-opacity font-medium"
            >
              OK
            </button>
          </div>
        </div>
      ) : confirmDelete ? (
        <div className="px-3 py-2">
          <p className="text-[11px] text-[var(--m-fg-primary)] mb-2">
            Delete <strong className="text-[var(--m-accent-red)]">{entry.name}</strong>?
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              className="flex-1 px-2 py-1 text-[10px] bg-[var(--m-accent-red)] text-white rounded hover:opacity-90 transition-opacity font-medium"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-2 py-1 text-[10px] bg-[var(--m-bg-primary)] text-[var(--m-fg-secondary)] border border-[var(--m-border-primary)] rounded hover:bg-[var(--m-hover-bg)] transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <MenuItem icon={<FilePlus size={13} />} label="New File" color="var(--m-accent-blue)" onClick={() => { setShowInput('file'); setInputValue('') }} />
          <MenuItem icon={<FolderPlus size={13} />} label="New Folder" color="var(--m-accent-yellow)" onClick={() => { setShowInput('folder'); setInputValue('') }} />
          <div className="mx-2 my-1 border-t border-[var(--m-border-primary)]" />
          <MenuItem icon={<Pencil size={13} />} label="Rename" color="var(--m-accent-peach)" onClick={() => { setShowInput('rename'); setInputValue(entry.name) }} />
          <MenuItem icon={<Trash2 size={13} />} label="Delete" color="var(--m-accent-red)" onClick={() => setConfirmDelete(true)} />
        </>
      )}
    </div>
  )
}

function MenuItem({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] transition-colors text-left group"
    >
      <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>
      {label}
    </button>
  )
}

function TreeNode({ entry, depth, onRefreshParent }: { entry: FileEntry; depth: number; onRefreshParent: () => void }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [children, setChildren] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  
  const { openFile, activeFilePath } = useWorkspaceStore()
  
  const isSelected = activeFilePath === entry.path

  const loadChildren = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const entries = await window.api.fs.readDir(entry.path) as FileEntry[]
      setChildren(entries)
    } catch (error) {
      console.error('Failed to read dir', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!entry.isDirectory) {
      openFile(entry.path, entry.name)
      return
    }

    if (!isOpen && children.length === 0) {
      await loadChildren()
    }
    setIsOpen(!isOpen)
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleRefresh = async (): Promise<void> => {
    if (entry.isDirectory) {
      await loadChildren()
    }
    onRefreshParent()
  }

  return (
    <div>
      <div 
        draggable
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.setData('text/plain', entry.path)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          if (entry.isDirectory) {
            e.preventDefault() // Allow drop
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={async (e) => {
          if (!entry.isDirectory) return
          e.preventDefault()
          e.stopPropagation()
          const srcPath = e.dataTransfer.getData('text/plain')
          if (!srcPath || srcPath === entry.path) return
          
          const basename = srcPath.split(/[/\\]/).pop()
          const isWin = /[a-zA-Z]:\\/.test(entry.path) || entry.path.includes('\\')
          const destPath = `${entry.path}${isWin ? '\\' : '/'}${basename}`
          
          try {
            await window.api.fs.rename(srcPath, destPath)
            // Instead of complex targeted refresh, a full re-render of root is easiest for cross-folder moves
            window.dispatchEvent(new CustomEvent('mirage:refresh-file-tree'))
          } catch (err) {
            console.error('Move failed:', err)
          }
        }}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        className={`flex items-center py-1 px-2 cursor-pointer select-none text-xs whitespace-nowrap transition-all duration-150
          ${isSelected 
            ? 'bg-gradient-to-r from-[var(--m-accent-blue)] to-[color-mix(in_srgb,var(--m-accent-purple)_60%,var(--m-accent-blue))] text-white shadow-sm' 
            : 'text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)]'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 shrink-0 opacity-70 pointer-events-none">
          {entry.isDirectory ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3" />
          )}
        </span>
        
        <span className="w-4 h-4 flex items-center justify-center mr-2 shrink-0 pointer-events-none">
          {entry.isDirectory ? (
            isOpen ? <FolderOpen size={14} className="text-[var(--m-accent-yellow)]" /> : <Folder size={14} className="text-[var(--m-accent-yellow)]" />
          ) : (
            getFileIcon(entry.name, isSelected)
          )}
        </span>
        
        <span className="truncate">{entry.name}</span>
      </div>

      {isOpen && entry.isDirectory && (
        <div>
          {isLoading ? (
            <div className="text-[10px] text-[var(--m-fg-muted)] py-1 flex items-center gap-1.5" style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--m-accent-blue)] animate-ping" />
              Loading...
            </div>
          ) : (
            children.map(child => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} onRefreshParent={handleRefresh} />
            ))
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entry={entry}
          onClose={() => setContextMenu(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}

export function FileExplorer(): React.JSX.Element {
  const { currentFolder } = useWorkspaceStore()
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([])

  const loadRoot = async (): Promise<void> => {
    if (!currentFolder) {
      setRootEntries([])
      return
    }
    try {
      const entries = await window.api.fs.readDir(currentFolder) as FileEntry[]
      setRootEntries(entries)
    } catch (error) {
      console.error('Failed to load root folder', error)
    }
  }

  useEffect(() => {
    loadRoot()
    
    const handleRefresh = () => {
      loadRoot()
    }
    
    window.addEventListener('mirage:refresh-file-tree', handleRefresh)
    return () => {
      window.removeEventListener('mirage:refresh-file-tree', handleRefresh)
    }
  }, [currentFolder])

  if (!currentFolder) {
    return (
      <div className="w-full h-full flex flex-col bg-[var(--m-bg-surface)] border-r border-[var(--m-border-primary)]">
        <div className="p-3 text-xs font-semibold uppercase tracking-wider text-[var(--m-fg-muted)] border-b border-[var(--m-border-primary)]">
          Explorer
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-xs text-[var(--m-fg-muted)] mb-4">No folder opened</p>
          <button 
            onClick={async () => {
              const res = await window.api.dialog.openFolder()
              if (!res.canceled && res.path) {
                useWorkspaceStore.getState().openFolder(res.path)
              }
            }}
            className="px-3 py-1.5 text-xs bg-[var(--m-accent-blue)] text-white rounded hover:opacity-90 transition-opacity"
          >
            Open Folder
          </button>
        </div>
      </div>
    )
  }

  const folderName = currentFolder.split(/[/\\]/).pop() || currentFolder

  return (
    <div className="w-full h-full flex flex-col bg-[var(--m-bg-surface)] border-r border-[var(--m-border-primary)]">
      <div className="p-3 text-xs font-semibold uppercase tracking-wider text-[var(--m-fg-muted)] border-b border-[var(--m-border-primary)] flex justify-between items-center">
        <span>Explorer</span>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-4 no-scrollbar">
        <div className="px-3 mb-2 text-xs font-bold text-[var(--m-fg-primary)] uppercase tracking-wide truncate">
          {folderName}
        </div>
        {rootEntries.map(entry => (
          <TreeNode key={entry.path} entry={entry} depth={0} onRefreshParent={loadRoot} />
        ))}
      </div>
    </div>
  )
}
