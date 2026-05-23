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

  /** Close all files */
  closeAllFiles: () => void

  /** Close all files except the specified one */
  closeOtherFiles: (path: string) => void

  /** Reorder files in the tab bar */
  reorderFiles: (startIndex: number, endIndex: number) => void
  
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

  /** Toggle command palette visibility */
  isCommandPaletteOpen: boolean
  toggleCommandPalette: () => void

  /** Git Info */
  gitBranch: string | null
  gitDirtyCount: number
  gitChangedFiles: { path: string; status: string }[]
  gitDiffFile: { path: string; originalContent: string; modifiedContent: string } | null
  gitHasRemote: boolean
  activeSidebarPanel: 'explorer' | 'search' | 'git'
  setSidebarPanel: (panel: 'explorer' | 'search' | 'git') => void
  setGitDiffFile: (diff: { path: string; originalContent: string; modifiedContent: string } | null) => void
  refreshGitInfo: () => Promise<void>
  commitChanges: (message: string) => Promise<void>
  pushChanges: () => Promise<void>
  pullChanges: () => Promise<void>
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
  isCommandPaletteOpen: false,
  gitBranch: null,
  gitDirtyCount: 0,
  gitChangedFiles: [],
  gitDiffFile: null,
  gitHasRemote: false,
  activeSidebarPanel: 'explorer',

  setEditorInstance: (editor) => set({ editorInstance: editor }),
  setEditorInsertCallback: (cb) => set({ editorInsertCallback: cb }),
  setTerminalExecuteCallback: (cb) => set({ terminalExecuteCallback: cb }),

  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  setSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),
  setGitDiffFile: (diff) => set({ gitDiffFile: diff }),

  refreshGitInfo: async () => {
    const { currentFolder } = get()
    if (!currentFolder || !window.api?.fs?.getGitInfo) return
    const info = await window.api.fs.getGitInfo(currentFolder)
    const status = window.api.fs.getGitStatus ? await window.api.fs.getGitStatus(currentFolder) : []
    const hasRemote = window.api.fs.getGitRemotes ? await window.api.fs.getGitRemotes(currentFolder) : false
    
    if (info) {
      set({ gitBranch: info.branch, gitDirtyCount: info.dirtyCount, gitChangedFiles: status, gitHasRemote: hasRemote })
    } else {
      set({ gitBranch: null, gitDirtyCount: 0, gitChangedFiles: [], gitHasRemote: false })
    }
  },

  commitChanges: async (message: string) => {
    const { currentFolder } = get()
    if (!currentFolder || !window.api?.fs?.gitCommit) return
    try {
      await window.api.fs.gitCommit(currentFolder, message)
      await get().refreshGitInfo()
    } catch (e) {
      console.error('Commit failed:', e)
      throw e
    }
  },

  pushChanges: async () => {
    const { currentFolder } = get()
    if (!currentFolder || !window.api?.fs?.gitPush) return
    try {
      await window.api.fs.gitPush(currentFolder)
    } catch (e) {
      console.error('Push failed:', e)
      throw e
    }
  },

  pullChanges: async () => {
    const { currentFolder } = get()
    if (!currentFolder || !window.api?.fs?.gitPull) return
    try {
      await window.api.fs.gitPull(currentFolder)
      await get().refreshGitInfo()
    } catch (e) {
      console.error('Pull failed:', e)
      throw e
    }
  },

  openFolder: (path: string) => {
    set({ currentFolder: path, openFiles: [], activeFilePath: null })
    get().refreshGitInfo()
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

  closeAllFiles: () => {
    set({ openFiles: [], activeFilePath: null })
  },

  closeOtherFiles: (path: string) => {
    const { openFiles } = get()
    const fileToKeep = openFiles.find(f => f.path === path)
    if (fileToKeep) {
      set({ openFiles: [fileToKeep], activeFilePath: path })
    }
  },

  reorderFiles: (startIndex: number, endIndex: number) => {
    const { openFiles } = get()
    const result = Array.from(openFiles)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    set({ openFiles: result })
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
      const success = await window.api.fs.writeFile(file.path, file.content)
      if (success !== false) {
        set({
          openFiles: openFiles.map(f => f.path === path ? { ...f, isDirty: false } : f)
        })
        get().refreshGitInfo()
      }
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
    get().refreshGitInfo()
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
