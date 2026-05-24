import { WindowControls } from './WindowControls'
import { MenuBar } from './MenuBar'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { Play } from 'lucide-react'
import logo from '../../assets/logo.png'

/**
 * TitleBar
 * 
 * Replaces the default OS title bar. Uses CSS drag regions to allow dragging.
 * File operations hook directly into the workspaceStore to open files and folders.
 */
export function TitleBar(): React.JSX.Element {
  const toggleSettings = useSettingsStore((state) => state.toggleSettings)

  return (
    <div
      className="flex items-center justify-between w-full h-[36px] bg-[var(--m-bg-secondary)] shrink-0 select-none z-50 border-b border-[var(--m-border-primary)] drag"
    >
      {/* Left section: App Icon + File Menu */}
      <div className="flex items-center h-full">
        <div 
          onClick={toggleSettings}
          title="Settings"
          className="flex items-center h-full px-3 text-sm font-semibold text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] cursor-pointer no-drag transition-colors"
        >
          <img src={logo} alt="Mirage Logo" className="w-5 h-5 mr-2 object-contain" />
          Mirage
        </div>

        {/* Menu Bar */}
        <MenuBar />
      </div>

      {/* Center section: Action Buttons */}
      <div className="flex-1 flex justify-center items-center gap-2 no-drag">
        
        <button
          onClick={() => {
            const activeFile = useWorkspaceStore.getState().activeFilePath
            if (!activeFile) return
            
            const ext = activeFile.split('.').pop()?.toLowerCase()
            const isWin = navigator.userAgent.toLowerCase().includes('windows')
            const sep = isWin ? ';' : '&&'
            
            let cmd = ''
            switch (ext) {
              case 'ts': cmd = `npx tsx "${activeFile}"`; break
              case 'js': cmd = `node "${activeFile}"`; break
              case 'py': cmd = `python "${activeFile}"`; break
              case 'go': cmd = `go run "${activeFile}"`; break
              case 'rs': {
                const exe = activeFile.split(/[/\\]/).pop()?.replace('.rs', isWin ? '.exe' : '')
                cmd = `rustc "${activeFile}" ${sep} .\\${exe}`
                break
              }
              case 'java': {
                const dir = activeFile.substring(0, Math.max(activeFile.lastIndexOf('/'), activeFile.lastIndexOf('\\')))
                const filename = activeFile.split(/[/\\]/).pop()
                const classname = filename?.replace('.java', '')
                cmd = `cd "${dir}" ${sep} javac "${filename}" ${sep} java "${classname}"`
                break
              }
              case 'cpp':
              case 'c': {
                const exe = activeFile.split(/[/\\]/).pop()?.replace(/\.(cpp|c)$/, isWin ? '.exe' : '')
                const compiler = ext === 'cpp' ? 'g++' : 'gcc'
                cmd = `${compiler} "${activeFile}" -o "${exe}" ${sep} .\\${exe}`
                break
              }
              default: 
                cmd = `echo "No default run command configured for .${ext} files. Please compile/run manually."`
                break
            }

            const wasOpen = useWorkspaceStore.getState().isTerminalOpen
            useWorkspaceStore.getState().setTerminalOpen(true)
            
            const tryExecute = (attempts = 0) => {
              const execute = useWorkspaceStore.getState().terminalExecuteCallback
              if (execute) {
                // If it wasn't open before, PTY takes a moment to be ready to receive stdin
                if (!wasOpen) {
                  setTimeout(() => execute(cmd), 300)
                } else {
                  execute(cmd)
                }
              } else if (attempts < 20) {
                setTimeout(() => tryExecute(attempts + 1), 50)
              }
            }
            
            tryExecute()
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-[var(--m-accent-blue)] hover:bg-blue-500 text-white text-xs font-medium rounded shadow-sm transition-colors"
          title="Run Active File"
        >
          <Play size={14} className="fill-current" />
          <span>Run</span>
        </button>
      </div>

      {/* Right section: Window Controls */}
      <WindowControls />
    </div>
  )
}
