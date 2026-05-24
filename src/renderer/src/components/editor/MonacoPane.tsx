import { useEffect, useRef, useState } from 'react'
import Editor, { OnMount, DiffEditor, useMonaco } from '@monaco-editor/react'
import { Check, X, ChevronRight, Play } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useModelStore } from '../../stores/modelStore'
import { TabContextMenu } from './TabContextMenu'
// @ts-ignore
import { initVimMode, VimMode } from 'monaco-vim'

// A ref to keep track of autocomplete debouncing
let autocompleteTimeout: ReturnType<typeof setTimeout> | null = null;
let providerRegistered = false;

import { syncMonacoTheme } from '../../utils/themeToMonaco'

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
    reorderFiles,
    gitDiffFile,
    setGitDiffFile,
    editorInstance
  } = useWorkspaceStore()
  const { autoSave, vimMode, theme } = useSettingsStore()
  
  const activeFile = openFiles.find(f => f.path === activeFilePath)

  const monaco = useMonaco()

  // Sync Monaco Theme when CSS Theme changes
  useEffect(() => {
    if (editorInstance && monaco) {
      // Small timeout to allow CSS variables to update in the DOM first
      setTimeout(() => {
        syncMonacoTheme(monaco)
      }, 50)
    }
  }, [theme, editorInstance, monaco])

  // Vim Mode State
  const vimInstanceRef = useRef<any>(null)
  const vimStatusNodeRef = useRef<HTMLDivElement>(null)
  const [currentVimMode, setCurrentVimMode] = useState('NORMAL')

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

  // Vim Mode lifecycle
  useEffect(() => {
    if (vimMode && editorInstance && vimStatusNodeRef.current) {
      // Initialize monaco-vim
      if (!vimInstanceRef.current) {
        vimInstanceRef.current = initVimMode(editorInstance, vimStatusNodeRef.current)
        
        // Register Vim Command Mode (Ex commands)
        const VimModeObj = VimMode as any
        if (VimModeObj && VimModeObj.Vim) {
          VimModeObj.Vim.defineEx('write', 'w', () => {
            const currentPath = useWorkspaceStore.getState().activeFilePath
            if (currentPath) {
              useWorkspaceStore.getState().saveFile(currentPath)
            }
          })
          
          VimModeObj.Vim.defineEx('quit', 'q', () => {
            const currentPath = useWorkspaceStore.getState().activeFilePath
            if (currentPath) {
              useWorkspaceStore.getState().closeFile(currentPath)
            }
          })

          VimModeObj.Vim.defineEx('wq', 'wq', () => {
            const currentPath = useWorkspaceStore.getState().activeFilePath
            if (currentPath) {
              useWorkspaceStore.getState().saveFile(currentPath)
              useWorkspaceStore.getState().closeFile(currentPath)
            }
          })
        }
      }

      // Helper to process the status bar DOM
      const processStatusBar = () => {
        const node = vimStatusNodeRef.current
        if (node && node.children.length > 1) {
          const modeSpan = node.children[0] as HTMLElement
          const inputSpan = node.children[1] as HTMLElement

          if (modeSpan) modeSpan.className = 'vim-mode-badge'
          if (inputSpan) inputSpan.className = 'vim-cmd-input'

          const rawText = modeSpan?.textContent || ''
          if (rawText.startsWith('--') && rawText.endsWith('--')) {
            const cleanText = rawText.replace(/-/g, '')
            if (modeSpan.textContent !== cleanText) {
              modeSpan.textContent = cleanText
            }
          }

          if (inputSpan && inputSpan.innerHTML.includes('<input')) {
            setCurrentVimMode('COMMAND')
            if (modeSpan.textContent !== 'COMMAND') {
              modeSpan.textContent = 'COMMAND'
            }
          } else {
            const currentText = modeSpan?.textContent || 'NORMAL'
            setCurrentVimMode(currentText)
          }
        }
      }

      // Add a MutationObserver to intercept and clean up the status bar text
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            processStatusBar()
          }
        })
      })

      observer.observe(vimStatusNodeRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      })

      // Run once immediately to catch the initial state
      processStatusBar()

      return () => {
        observer.disconnect()
        if (vimInstanceRef.current) {
          vimInstanceRef.current.dispose()
          vimInstanceRef.current = null
        }
      }
    } else {
      // Cleanup monaco-vim when vimMode is toggled off
      if (vimInstanceRef.current) {
        vimInstanceRef.current.dispose()
        vimInstanceRef.current = null
      }
    }
    
    return () => {
      // Fallback cleanup
      if (vimInstanceRef.current) {
        vimInstanceRef.current.dispose()
        vimInstanceRef.current = null
      }
    }
  }, [vimMode, editorInstance, activeFilePath])

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
  const handleRunCode = () => {
    if (!activeFile) return
    const ext = activeFile.path.split('.').pop()?.toLowerCase()
    let cmd = ''
    switch (ext) {
      case 'ts':
        cmd = `ts-node "${activeFile.path}"`
        break
      case 'js':
        cmd = `node "${activeFile.path}"`
        break
      case 'py':
        cmd = `python "${activeFile.path}"`
        break
      case 'go':
        cmd = `go run "${activeFile.path}"`
        break
      case 'rs':
        cmd = `rustc "${activeFile.path}" && .\\${activeFile.name.replace('.rs', '.exe')}`
        break
      default:
        console.warn('No runner found for extension:', ext)
        return
    }

    // Open terminal if closed
    useWorkspaceStore.getState().setTerminalOpen(true)
    
    // Execute command
    setTimeout(() => {
      const execute = useWorkspaceStore.getState().terminalExecuteCallback
      if (execute) {
        execute(cmd)
      } else {
        console.warn('Terminal not ready for execution')
      }
    }, 100)
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

    // Register Inline Autocomplete Provider ONCE
    if (!providerRegistered) {
      providerRegistered = true;
      monaco.languages.registerInlineCompletionsProvider('*', {
        provideInlineCompletions: async (model, position, _context, token) => {
          // Check settings toggle
          if (!useSettingsStore.getState().inlineAutocomplete) {
            return { items: [] };
          }

          // Check if AI model is selected
          const selectedModelId = useModelStore.getState().selectedModelId;
          if (!selectedModelId) {
            return { items: [] };
          }

          // Return a promise that resolves after debounce
          return new Promise((resolve) => {
            if (autocompleteTimeout) clearTimeout(autocompleteTimeout);
            
            // If user cancels (types another key), abort early
            token.onCancellationRequested(() => {
              if (autocompleteTimeout) clearTimeout(autocompleteTimeout);
              resolve({ items: [] });
            });

            autocompleteTimeout = setTimeout(async () => {
              try {
                // Get text context
                const prefix = model.getValueInRange({
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column
                });
                
                const suffix = model.getValueInRange({
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: model.getLineCount(),
                  endColumn: model.getLineMaxColumn(model.getLineCount())
                });

                // Take last 500 chars of prefix and first 500 chars of suffix to keep it fast
                const truncatedPrefix = prefix.slice(-500);
                const truncatedSuffix = suffix.slice(0, 500);

                const completionText = await window.api.ai.getAutocomplete(selectedModelId, truncatedPrefix, truncatedSuffix);
                
                if (completionText && completionText.trim()) {
                  resolve({
                    items: [{
                      insertText: completionText,
                      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                    }]
                  });
                } else {
                  resolve({ items: [] });
                }
              } catch (err) {
                console.error('[Autocomplete Error]', err);
                resolve({ items: [] });
              }
            }, 600); // 600ms debounce
          });
        },
        freeInlineCompletions: () => {}
      });
    }
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

  // Determine if we're showing a git diff
  if (gitDiffFile) {
    const fileName = gitDiffFile.path.split(/[/\\]/).pop() || ''
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--m-bg-primary)]">
        <div className="flex items-center px-4 py-2 bg-[var(--m-bg-surface)] border-b border-[var(--m-border-primary)] justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-[var(--m-fg-primary)]">
            <span className="font-mono text-[var(--m-fg-muted)]">Git Diff:</span>
            <span>{fileName}</span>
          </div>
          <button 
            onClick={() => setGitDiffFile(null)}
            className="text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <DiffEditor
            original={gitDiffFile.originalContent}
            modified={gitDiffFile.modifiedContent}
            language={getLanguage(fileName)}
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--m-bg-primary)]">
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

      {/* Editor Actions Toolbar */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleRunCode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--m-accent-blue)] hover:bg-blue-500 text-white text-xs font-semibold rounded shadow-md transition-colors"
          title="Run Code"
        >
          <Play size={14} className="fill-current" />
          <span>Run</span>
        </button>
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

        {/* Vim Status Bar Overlay */}
        <div 
          ref={vimStatusNodeRef}
          className={`vim-status-node absolute bottom-0 left-0 right-0 py-0 font-mono text-[11px] bg-[var(--m-bg-secondary)] border-t border-[var(--m-border-primary)] text-[var(--m-fg-primary)] z-20 flex items-center transition-opacity duration-200 ${vimMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            // @ts-ignore
            '--vim-color': 
              currentVimMode === 'INSERT' ? 'var(--m-accent-yellow)' :
              currentVimMode.startsWith('V') ? 'var(--m-accent-purple)' :
              currentVimMode === 'COMMAND' ? 'var(--m-accent-blue)' :
              'var(--m-accent-green)'
          }}
        />
      </div>
    </div>
  )
}
