import { useEffect, useRef } from 'react'
import { X, ArrowRightFromLine, Copy } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface TabContextMenuProps {
  x: number
  y: number
  filePath: string
  onClose: () => void
}

export function TabContextMenu({ x, y, filePath, onClose }: TabContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const { closeFile, closeOtherFiles, closeAllFiles } = useWorkspaceStore()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const copyPath = () => {
    navigator.clipboard.writeText(filePath)
    onClose()
  }

  // Adjust position if it goes off screen
  const style: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 150),
    left: Math.min(x, window.innerWidth - 200)
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] w-48 py-1 rounded-md border border-[var(--m-border-primary)] shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      style={{
        ...style,
        background: 'color-mix(in srgb, var(--m-bg-surface) 95%, transparent)',
        backdropFilter: 'blur(24px) saturate(1.8)'
      }}
    >
      <button
        className="w-full px-3 py-1.5 text-xs text-left text-[var(--m-fg-primary)] hover:bg-[var(--m-accent-blue)] hover:text-white flex items-center gap-2"
        onClick={() => { closeFile(filePath); onClose() }}
      >
        <X size={12} /> Close
      </button>
      <button
        className="w-full px-3 py-1.5 text-xs text-left text-[var(--m-fg-primary)] hover:bg-[var(--m-accent-blue)] hover:text-white flex items-center gap-2"
        onClick={() => { closeOtherFiles(filePath); onClose() }}
      >
        <ArrowRightFromLine size={12} /> Close Others
      </button>
      <button
        className="w-full px-3 py-1.5 text-xs text-left text-[var(--m-fg-primary)] hover:bg-[var(--m-accent-blue)] hover:text-white flex items-center gap-2"
        onClick={() => { closeAllFiles(); onClose() }}
      >
        <X size={12} className="opacity-0" /> Close All
      </button>
      <div className="h-px bg-[var(--m-border-primary)] my-1" />
      <button
        className="w-full px-3 py-1.5 text-xs text-left text-[var(--m-fg-primary)] hover:bg-[var(--m-accent-blue)] hover:text-white flex items-center gap-2"
        onClick={copyPath}
      >
        <Copy size={12} /> Copy Path
      </button>
    </div>
  )
}
