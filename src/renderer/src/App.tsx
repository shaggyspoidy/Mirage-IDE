import { useEffect, useState } from 'react'
import { TitleBar } from './components/titlebar/TitleBar'
import { FileExplorer } from './components/sidebar/FileExplorer'
import { SourceControl } from './components/sidebar/SourceControl'
import { MonacoPane } from './components/editor/MonacoPane'
import { ChatPanel } from './components/ai/ChatPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { MoreModelsPanel } from './components/ai/MoreModelsPanel'
import { TerminalPane } from './components/terminal/TerminalPane'
import { StatusBar } from './components/statusbar/StatusBar'
import { SearchPanel } from './components/search/SearchPanel'
import { CommandPalette } from './components/command/CommandPalette'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useSettingsStore } from './stores/settingsStore'
import { Files, GitBranch, Search, Settings } from 'lucide-react'

// Resizer component for dragging between panes
function Resizer({ 
  onResize, 
  direction = 'horizontal' 
}: { 
  onResize: (e: React.MouseEvent) => void
  direction?: 'horizontal' | 'vertical'
}): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      onResize(moveEvent as unknown as React.MouseEvent)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        relative flex items-center justify-center bg-transparent group z-10 shrink-0
        ${direction === 'horizontal' ? 'w-1 h-full cursor-col-resize hover:w-2 -ml-[0.5px] -mr-[0.5px]' : 'h-1 w-full cursor-row-resize hover:h-2 -mt-[0.5px] -mb-[0.5px]'}
      `}
    >
      <div className={`
        bg-[var(--m-border-primary)] group-hover:bg-[var(--m-accent-blue)] transition-colors
        ${direction === 'horizontal' ? 'w-[1px] h-full' : 'h-[1px] w-full'}
        ${isDragging ? 'bg-[var(--m-accent-blue)]' : ''}
      `} />
    </div>
  )
}

/**
 * Root App component for Mirage IDE.
 * 
 * Layout:
 * - TitleBar on top (draggable, window controls)
 * - Main content area below:
 *   - FileExplorer (Sidebar, fixed width)
 *   - MonacoPane (Text Editor, fluid width)
 *   - ChatPanel (AI Assistant, fixed width)
 * - StatusBar at the bottom
 */
function App(): React.JSX.Element {
  const { isTerminalOpen, activeSidebarPanel, setSidebarPanel, gitDirtyCount } = useWorkspaceStore()
  const { theme } = useSettingsStore()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Pane sizes state
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [chatWidth, setChatWidth] = useState(380)
  const [terminalHeight, setTerminalHeight] = useState(256)

  const handleSidebarResize = (e: React.MouseEvent) => {
    // Math.max/min to constrain width
    setSidebarWidth(Math.min(Math.max(150, e.clientX), 600))
  }

  const handleChatResize = (e: React.MouseEvent) => {
    const newWidth = document.body.clientWidth - e.clientX
    setChatWidth(Math.min(Math.max(250, newWidth), 800))
  }

  const handleTerminalResize = (e: React.MouseEvent) => {
    // Status bar is 24px tall, titlebar is 36px, roughly estimate bottom
    const bottomOffset = document.body.clientHeight - e.clientY - 24
    setTerminalHeight(Math.min(Math.max(100, bottomOffset), document.body.clientHeight - 200))
  }

  // Apply theme on load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    window.api.fs.importVsCodeSettings().then((settings) => {
      if (settings) {
        console.log('[App] Successfully imported VS Code settings:', settings)
      }
    })
  }, [])

  // Ensure theme is applied on initial load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      // Ctrl+, — Settings
      if (ctrl && key === ',') {
        e.preventDefault()
        useSettingsStore.getState().toggleSettings()
      }

      // Ctrl+Shift+F — Global Search
      if (ctrl && e.shiftKey && key === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
      }

      // Ctrl+N — New untitled file
      if (ctrl && !e.shiftKey && key === 'n') {
        e.preventDefault()
        useWorkspaceStore.getState().createUntitledFile()
      }

      // Ctrl+S — Save active file
      if (ctrl && !e.shiftKey && key === 's') {
        e.preventDefault()
        const path = useWorkspaceStore.getState().activeFilePath
        if (path) useWorkspaceStore.getState().saveFile(path)
      }

      // Ctrl+Shift+S — Save all files
      if (ctrl && e.shiftKey && key === 's') {
        e.preventDefault()
        useWorkspaceStore.getState().saveAllFiles()
      }

      // Ctrl+` — Toggle terminal
      if (ctrl && key === '`') {
        e.preventDefault()
        useWorkspaceStore.getState().toggleTerminal()
      }

      // Ctrl+Shift+P — Command Palette
      if (ctrl && e.shiftKey && key === 'p') {
        e.preventDefault()
        useWorkspaceStore.getState().toggleCommandPalette()
      }
    }

    // Listen for custom search event from MenuBar
    const handleOpenSearch = () => setIsSearchOpen(true)
    window.addEventListener('mirage:openSearch', handleOpenSearch)

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mirage:openSearch', handleOpenSearch)
    }
  }, [])

  return (
    <div className="bg-[var(--m-bg-primary)] overflow-hidden flex flex-col w-screen h-screen relative text-[var(--m-fg-primary)] font-sans">
      <TitleBar />
      
      {/* Main layout: Activity Bar + Sidebar + Editor + Chat */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Activity Bar */}
        <div className="w-12 bg-[var(--m-bg-tertiary)] border-r border-[var(--m-border-primary)] flex flex-col items-center py-2 shrink-0 z-20">
          <button
            onClick={() => setSidebarPanel('explorer')}
            className={`p-3 relative group transition-colors rounded-xl mb-1 ${activeSidebarPanel === 'explorer' ? 'text-[var(--m-fg-primary)]' : 'text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)]'}`}
          >
            <Files size={22} strokeWidth={1.5} />
            {activeSidebarPanel === 'explorer' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--m-accent-blue)] rounded-r-full" />
            )}
          </button>
          
          <button
            onClick={() => setSidebarPanel('search')}
            className={`p-3 relative group transition-colors rounded-xl mb-1 ${activeSidebarPanel === 'search' ? 'text-[var(--m-fg-primary)]' : 'text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)]'}`}
          >
            <Search size={22} strokeWidth={1.5} />
            {activeSidebarPanel === 'search' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--m-accent-blue)] rounded-r-full" />
            )}
          </button>

          <button
            onClick={() => setSidebarPanel('git')}
            className={`p-3 relative group transition-colors rounded-xl ${activeSidebarPanel === 'git' ? 'text-[var(--m-fg-primary)]' : 'text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)]'}`}
          >
            <GitBranch size={22} strokeWidth={1.5} />
            {gitDirtyCount > 0 && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-[var(--m-accent-blue)] text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-lg border-2 border-[var(--m-bg-tertiary)]">
                {gitDirtyCount > 9 ? '9+' : gitDirtyCount}
              </div>
            )}
            {activeSidebarPanel === 'git' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--m-accent-blue)] rounded-r-full" />
            )}
          </button>
          
          <div className="flex-1" /> {/* Spacer */}
          
          <button
            onClick={() => useSettingsStore.getState().toggleSettings()}
            className="p-3 relative group transition-colors rounded-xl text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)]"
            title="Settings (Ctrl+,)"
          >
            <Settings size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Left Sidebar */}
        <div style={{ width: sidebarWidth }} className="shrink-0 flex flex-col overflow-hidden bg-[var(--m-bg-secondary)] border-r border-[var(--m-border-primary)] relative z-10">
          {activeSidebarPanel === 'explorer' && <FileExplorer />}
          {activeSidebarPanel === 'git' && <SourceControl />}
          {activeSidebarPanel === 'search' && (
            <div className="flex-1 p-4 text-xs text-[var(--m-fg-muted)] flex flex-col items-center justify-center text-center">
              <Search size={32} className="opacity-20 mb-3" />
              Search is currently mapped to Ctrl+Shift+F global overlay.
            </div>
          )}
        </div>

        <Resizer onResize={handleSidebarResize} direction="horizontal" />
        
        {/* Center Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MonacoPane />
          
          {isTerminalOpen && (
            <>
              <Resizer onResize={handleTerminalResize} direction="vertical" />
              <div style={{ height: terminalHeight }} className="shrink-0 flex flex-col">
                <TerminalPane />
              </div>
            </>
          )}
        </div>

        <Resizer onResize={handleChatResize} direction="horizontal" />

        {/* Right Chat Panel */}
        <div style={{ width: chatWidth }} className="shrink-0 flex flex-col overflow-hidden">
          <ChatPanel />
        </div>

      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Modal Overlay */}
      <SettingsPanel />

      {/* More Models Modal Overlay */}
      <MoreModelsPanel />

      {/* Global Search Overlay */}
      <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Command Palette Overlay */}
      <CommandPalette />
    </div>
  )
}

export default App
