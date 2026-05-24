import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import '@xterm/xterm/css/xterm.css'

export function TerminalPane(): React.JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentFolder = useWorkspaceStore((state) => state.currentFolder)

  useEffect(() => {
    if (!terminalRef.current || !currentFolder) return

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e', // Fallback standard dark theme
        foreground: '#cccccc'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    
    // Slight delay to ensure DOM is ready for fit
    setTimeout(() => {
      fitAddon.fit()
      // Ask main process to spawn a shell in the workspace folder
      if (window.api && window.api.terminal) {
        window.api.terminal.spawn(term.cols, term.rows, currentFolder)
      }
    }, 50)

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Handle user input in terminal
    term.onData((data) => {
      if (window.api && window.api.terminal) {
        window.api.terminal.write(data)
      }
    })

    // Listen to output from main process
    let removeListener: (() => void) | null = null
    if (window.api && window.api.terminal) {
      removeListener = window.api.terminal.onData((data) => {
        term.write(data)
      })
    }

    // Handle resize using ResizeObserver for both window and panel resizes
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit()
        if (window.api && window.api.terminal) {
          window.api.terminal.resize(xtermRef.current.cols, xtermRef.current.rows)
        }
      }
    }
    
    const resizeObserver = new ResizeObserver(() => {
      // Small debounce for ResizeObserver
      requestAnimationFrame(() => handleResize())
    })
    resizeObserver.observe(terminalRef.current)

    // Register execution callback
    useWorkspaceStore.getState().setTerminalExecuteCallback((cmd: string) => {
      if (window.api && window.api.terminal) {
        // Send command and simulate hitting Enter
        window.api.terminal.write(cmd + '\r')
      }
    })

    return () => {
      resizeObserver.disconnect()
      useWorkspaceStore.getState().setTerminalExecuteCallback(null)
      if (removeListener) removeListener()
      if (window.api && window.api.terminal) {
        window.api.terminal.kill()
      }
      term.dispose()
    }
  }, [currentFolder])

  if (!currentFolder) {
    return (
      <div className="w-full h-full flex flex-col bg-[#1e1e1e] border-t border-[var(--m-border-primary)]">
        <div className="flex items-center px-3 py-1.5 bg-[var(--m-bg-secondary)] border-b border-[var(--m-border-primary)]">
          <span className="text-xs font-medium text-[var(--m-fg-primary)] uppercase tracking-wider">Terminal</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--m-fg-muted)] text-sm">
          Open a folder to use the terminal
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] border-t border-[var(--m-border-primary)]">
      <div className="flex items-center px-3 py-1.5 bg-[var(--m-bg-secondary)] border-b border-[var(--m-border-primary)]">
        <span className="text-xs font-medium text-[var(--m-fg-primary)] uppercase tracking-wider">Terminal</span>
      </div>
      <div ref={terminalRef} className="flex-1 overflow-hidden p-2" />
    </div>
  )
}

