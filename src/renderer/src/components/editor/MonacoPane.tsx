import { useEffect, useRef, useState } from 'react'
import Editor, { OnMount, DiffEditor } from '@monaco-editor/react'
import { Check, X, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { TabContextMenu } from './TabContextMenu'

/**
 * MonacoPane — The primary text editor component powering the IDE.
 * Integrates Monaco Editor and connects it to the workspaceStore.
 */
export function MonacoPane(): React.JSX.Element {
  const { 
    openFiles, 
    activeFilePath, 
    updateFileContent,
    pendingDiffs,
    acceptDiff,
    rejectDiff,
    currentFolder,
    saveFile,
    reorderFiles
  } = useWorkspaceStore()
  const { autoSave } = useSettingsStore()
  
  const activeFile = openFiles.find(f => f.path === activeFilePath)

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string } | null>(null)

  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  // Tab container ref for horizontal scrolling
  const tabContainerRef = useRef<HTMLDivElement>(null)

  // Auto-Save logic
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (autoSave && activeFile && activeFile.isDirty) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveFile(activeFile.path)
      }, 1500) // 1.5s delay
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [activeFile?.content, activeFile?.isDirty, autoSave, activeFile?.path, saveFile])

  // Derive breadcrumbs from path
  const getBreadcrumbs = (path: string) => {
    if (!currentFolder || !path.startsWith(currentFolder)) {
      return path.split(/[/\\]/).filter(Boolean)
    }
    const relative = path.slice(currentFolder.length).replace(/^[/\\]/, '')
    const folderName = currentFolder.split(/[/\\]/).pop() || 'Workspace'
    return [folderName, ...relative.split(/[/\\]/).filter(Boolean)]
  }

  // Determine language based on file extension
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'json': return 'json'
      case 'css': return 'css'
      case 'html': return 'html'
      case 'md': return 'markdown'
      case 'py': return 'python'
      case 'java': return 'java'
      case 'c': return 'c'
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'h':
      case 'hpp':
        return 'cpp'
      case 'cs': return 'csharp'
      case 'go': return 'go'
      case 'rs': return 'rust'
      case 'php': return 'php'
      case 'rb': return 'ruby'
      case 'sh':
      case 'bash':
        return 'shell'
      case 'xml': return 'xml'
      case 'yaml':
      case 'yml':
        return 'yaml'
      case 'sql': return 'sql'
      default: return 'plaintext'
    }
  }

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Store editor instance for menu bar actions
    useWorkspaceStore.getState().setEditorInstance(editor)

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentPath = useWorkspaceStore.getState().activeFilePath
      if (currentPath) {
        useWorkspaceStore.getState().saveFile(currentPath)
      }
    })

    // Register insert-at-cursor callback for AI code actions
    useWorkspaceStore.getState().setEditorInsertCallback((text: string) => {
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('ai-insert', [{
          range: selection,
          text,
          forceMoveMarkers: true
        }])
      }
    })

    // Track cursor position for the status bar
    const pos = editor.getPosition()
    if (pos) {
      useWorkspaceStore.getState().setCursorPosition(pos.lineNumber, pos.column)
    }
    editor.onDidChangeCursorPosition((e) => {
      useWorkspaceStore.getState().setCursorPosition(e.position.lineNumber, e.position.column)
    })
  }

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--m-bg-primary)] text-[var(--m-fg-muted)]">
        <div className="text-center">
          <div className="text-4xl mb-2">✨</div>
          <div className="text-sm font-medium">Mirage IDE</div>
          <div className="text-xs mt-1 opacity-70">Select a file to start editing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--m-bg-primary)]">
      {/* Editor Tabs */}
      <div 
        ref={tabContainerRef}
        className="flex bg-[var(--m-bg-surface)] border-b border-[var(--m-border-primary)] overflow-x-auto no-scrollbar"
        onWheel={(e) => {
          if (tabContainerRef.current) {
            tabContainerRef.current.scrollLeft += e.deltaY;
          }
        }}
      >
        {openFiles.map((file, idx) => (
          <button
            key={file.path}
            draggable
            onDragStart={(e) => {
              setDraggedIdx(idx)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedIdx !== null && draggedIdx !== idx) {
                reorderFiles(draggedIdx, idx)
              }
              setDraggedIdx(null)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, path: file.path })
            }}
            onClick={() => useWorkspaceStore.getState().setActiveFile(file.path)}
            className={`px-4 py-2 text-xs flex items-center gap-2 border-r border-[var(--m-border-primary)] transition-colors min-w-fit
              ${file.path === activeFilePath 
                ? 'bg-[var(--m-bg-primary)] text-[var(--m-fg-primary)] border-t border-t-[var(--m-accent-blue)]' 
                : 'text-[var(--m-fg-muted)] hover:bg-[var(--m-hover-bg)] border-t border-t-transparent'}
              ${draggedIdx === idx ? 'opacity-50' : 'opacity-100'}`}
          >
            {file.name}
            {file.isDirty && <span className="w-2 h-2 rounded-full bg-[var(--m-accent-yellow)] shrink-0" />}
            <div 
              className="ml-2 hover:bg-[var(--m-hover-bg)] rounded-md p-0.5 shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                useWorkspaceStore.getState().closeFile(file.path)
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {contextMenu && (
        <TabContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          filePath={contextMenu.path} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Breadcrumbs */}
      {activeFile && (
        <div className="flex items-center px-4 py-1 bg-[var(--m-bg-primary)] border-b border-[var(--m-border-primary)] overflow-x-auto no-scrollbar shrink-0">
          {getBreadcrumbs(activeFile.path).map((segment, idx, arr) => (
            <div key={idx} className="flex items-center text-[11px] text-[var(--m-fg-secondary)] hover:text-[var(--m-fg-primary)] cursor-pointer transition-colors whitespace-nowrap">
              <span>{segment}</span>
              {idx < arr.length - 1 && (
                <ChevronRight size={12} className="mx-1 opacity-50" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Monaco Editor / Diff Editor */}
      <div className="flex-1 min-h-0 relative">
        {activeFile && pendingDiffs[activeFile.path] !== undefined ? (
          <>
            {/* Diff View Mode */}
            <div className="absolute top-4 right-8 z-10 flex gap-2">
              <button
                onClick={() => acceptDiff(activeFile.path)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--m-accent-green)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--m-accent-green)_30%,transparent)] text-[var(--m-accent-green)] border border-[color-mix(in_srgb,var(--m-accent-green)_40%,transparent)] rounded shadow-lg backdrop-blur-md transition-all text-sm font-medium"
              >
                <Check size={16} /> Accept AI Changes
              </button>
              <button
                onClick={() => rejectDiff(activeFile.path)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--m-accent-red)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--m-accent-red)_30%,transparent)] text-[var(--m-accent-red)] border border-[color-mix(in_srgb,var(--m-accent-red)_40%,transparent)] rounded shadow-lg backdrop-blur-md transition-all text-sm font-medium"
              >
                <X size={16} /> Reject
              </button>
            </div>
            <DiffEditor
              original={activeFile.content}
              modified={pendingDiffs[activeFile.path]}
              language={getLanguage(activeFile.name)}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrainsMono Nerd Font, monospace',
                wordWrap: 'on',
                lineHeight: 1.5,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                renderSideBySide: true,
                readOnly: true,
                renderIndicators: true
              }}
            />
          </>
        ) : (
          <Editor
            path={activeFile.path}
            value={activeFile.content}
            language={getLanguage(activeFile.name)}
            theme="vs-dark"
            onChange={(value) => updateFileContent(activeFile.path, value || '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
              fontSize: 13,
              fontFamily: 'JetBrainsMono Nerd Font, monospace',
              wordWrap: 'on',
              lineHeight: 1.5,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
