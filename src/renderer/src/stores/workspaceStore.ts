import { create } from 'zustand'

/**
 * Workspace Store — Manages the state of the IDE workspace.
 * Tracks the opened folder, the list of files currently open in the editor tabs,
 * and the content/dirty state of those files.
 */

export interface FileData {
  path: string
  name: string
  content: string
  isDirty: boolean
}

interface WorkspaceState {
  currentFolder: string | null
  openFiles: FileData[]
  activeFilePath: string | null
  isTerminalOpen: boolean
  cursorPosition: { line: number; column: number } | null
  
  /** Map of filepath -> proposed AI new content */
  pendingDiffs: Record<string, string>
  
  /** Reference to the active Monaco editor instance for triggering commands */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorInstance: any | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditorInstance: (editor: any | null) => void
  
  /** Callback set by MonacoPane to insert text at cursor */
  editorInsertCallback: ((text: string) => void) | null
  setEditorInsertCallback: (cb: ((text: string) => void) | null) => void
  
  /** Callback set by TerminalPane to execute shell commands */
  terminalExecuteCallback: ((cmd: string) => void) | null
  setTerminalExecuteCallback: (cb: ((cmd: string) => void) | null) => void
  
  /** Open a directory as the root workspace folder */
  openFolder: (path: string) => void
  
  /** Open a file in the editor (reads from disk if not already open) */
  openFile: (path: string, name: string) => Promise<void>
  
  /** Close a file tab */
  closeFile: (path: string) => void
  
  /** Set a currently open file as the active (visible) tab */
  setActiveFile: (path: string) => void
  
  /** Update the content of a file in memory (marks as dirty) */
  updateFileContent: (path: string, content: string) => void
  
  /** Save a file back to disk */
  saveFile: (path: string) => Promise<void>

  /** Save all dirty files to disk */
  saveAllFiles: () => Promise<void>
  
  /** Toggle integrated terminal visibility */
  toggleTerminal: () => void

  /** Insert text at the current cursor position in the active editor */
  insertAtCursor: (content: string) => void

  /** Create a new file and open it in the editor */
  createNewFile: (filename: string, content: string) => Promise<void>

  /** Create an untitled scratch file in the editor */
  createUntitledFile: () => void

  /** Update cursor position (from Monaco) */
  setCursorPosition: (line: number, column: number) => void

  /** AI diff actions */
  addPendingDiff: (path: string, content: string) => void
  acceptDiff: (path: string) => Promise<void>
  rejectDiff: (path: string) => void

  /** Execute a shell command in the integrated terminal */
  executeCommand: (cmd: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentFolder: null,
  openFiles: [],
  activeFilePath: null,
  isTerminalOpen: false,
  cursorPosition: null,
  pendingDiffs: {},
  editorInstance: null,
  editorInsertCallback: null,
  terminalExecuteCallback: null,

  setEditorInstance: (editor) => set({ editorInstance: editor }),
  setEditorInsertCallback: (cb) => set({ editorInsertCallback: cb }),
  setTerminalExecuteCallback: (cb) => set({ terminalExecuteCallback: cb }),

  openFolder: (path: string) => {
    set({ currentFolder: path, openFiles: [], activeFilePath: null })
  },

  openFile: async (path: string, name: string) => {
    const { openFiles } = get()
    const existingFile = openFiles.find(f => f.path === path)

    if (existingFile) {
      set({ activeFilePath: path })
      return
    }

    try {
      const content = await window.api.fs.readFile(path)
      set({
        openFiles: [...openFiles, { path, name, content, isDirty: false }],
        activeFilePath: path
      })
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  },

  closeFile: (path: string) => {
    const { openFiles, activeFilePath } = get()
    const newOpenFiles = openFiles.filter(f => f.path !== path)
    
    let newActiveFilePath = activeFilePath
    if (activeFilePath === path) {
      newActiveFilePath = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1].path : null
    }

    set({ openFiles: newOpenFiles, activeFilePath: newActiveFilePath })
  },

  setActiveFile: (path: string) => {
    set({ activeFilePath: path })
  },

  updateFileContent: (path: string, content: string) => {
    const { openFiles } = get()
    set({
      openFiles: openFiles.map(f =>
        f.path === path ? { ...f, content, isDirty: true } : f
      )
    })
  },

  saveFile: async (path: string) => {
    const { openFiles } = get()
    const file = openFiles.find(f => f.path === path)
    if (!file || !file.isDirty) return

    try {
      await window.api.fs.writeFile(path, file.content)
      set({
        openFiles: openFiles.map(f =>
          f.path === path ? { ...f, isDirty: false } : f
        )
      })
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  },

  saveAllFiles: async () => {
    const { openFiles } = get()
    const dirtyFiles = openFiles.filter(f => f.isDirty)
    for (const file of dirtyFiles) {
      try {
        await window.api.fs.writeFile(file.path, file.content)
      } catch (error) {
        console.error('Failed to save file:', file.path, error)
      }
    }
    set({
      openFiles: openFiles.map(f => f.isDirty ? { ...f, isDirty: false } : f)
    })
  },

  toggleTerminal: () => set(state => ({ isTerminalOpen: !state.isTerminalOpen })),

  insertAtCursor: (content: string) => {
    const { editorInsertCallback } = get()
    if (editorInsertCallback) {
      editorInsertCallback(content)
    }
  },

  createNewFile: async (filename: string, content: string) => {
    const { currentFolder, openFiles } = get()
    if (!currentFolder) return

    const path = `${currentFolder}/${filename}`.replace(/\\/g, '/')

    try {
      await window.api.fs.writeFile(path, content)
      set({
        openFiles: [...openFiles, { path, name: filename, content, isDirty: false }],
        activeFilePath: path
      })
    } catch (error) {
      console.error('Failed to create new file:', error)
    }
  },

  createUntitledFile: () => {
    const { openFiles } = get()
    // Find next untitled number
    let num = 1
    while (openFiles.some(f => f.path === `untitled-${num}`)) {
      num++
    }
    const path = `untitled-${num}`
    const name = `Untitled-${num}`
    set({
      openFiles: [...openFiles, { path, name, content: '', isDirty: false }],
      activeFilePath: path
    })
  },

  setCursorPosition: (line: number, column: number) => set({ cursorPosition: { line, column } }),

  addPendingDiff: (path: string, content: string) => {
    // Also make sure the file is opened in a tab so the user can see it
    const { openFile } = get()
    const fileName = path.split(/[/\\]/).pop() || 'Unknown'
    openFile(path, fileName)

    set((state) => ({
      pendingDiffs: { ...state.pendingDiffs, [path]: content }
    }))
  },

  acceptDiff: async (path: string) => {
    const { pendingDiffs, activeFilePath, updateFileContent, saveFile } = get()
    const newContent = pendingDiffs[path]
    if (newContent !== undefined) {
      // 1. Update in memory (marks dirty)
      updateFileContent(path, newContent)
      // 2. Remove from pending
      const newDiffs = { ...pendingDiffs }
      delete newDiffs[path]
      set({ pendingDiffs: newDiffs })
      // 3. Save to disk automatically
      await saveFile(path)
    }
  },

  rejectDiff: (path: string) => {
    const { pendingDiffs } = get()
    const newDiffs = { ...pendingDiffs }
    delete newDiffs[path]
    set({ pendingDiffs: newDiffs })
  },

  executeCommand: (cmd: string) => {
    const { terminalExecuteCallback, isTerminalOpen } = get()
    // Open terminal if closed
    if (!isTerminalOpen) {
      set({ isTerminalOpen: true })
    }
    // Wait a tick for it to mount if it was closed
    setTimeout(() => {
      const updatedCb = get().terminalExecuteCallback
      if (updatedCb) {
        updatedCb(cmd)
      }
    }, 100)
  }
}))
