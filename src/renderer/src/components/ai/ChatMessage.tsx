import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, FileDown, ChevronDown, FilePlus, MousePointerClick, FileEdit, Terminal, Play } from 'lucide-react'
import type { Message } from '../../stores/contextStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

/**
 * FileDiffWidget — Replaces the raw code block for file modifications.
 */
function FileDiffWidget({ path }: { path: string }): React.JSX.Element {
  const { openFile } = useWorkspaceStore()
  
  return (
    <div className="my-3 flex items-center justify-between bg-[var(--m-bg-tertiary)] border border-[var(--m-border-primary)] rounded-lg p-3 shadow-sm group">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded bg-[color-mix(in_srgb,var(--m-accent-blue)_15%,transparent)] text-[var(--m-accent-blue)]">
          <FileEdit size={16} />
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--m-fg-primary)] flex items-center gap-2">
            Modified File
          </div>
          <div className="text-[11px] font-mono text-[var(--m-fg-muted)] mt-0.5">
            {path}
          </div>
        </div>
      </div>
      <button
        onClick={() => openFile(path, path.split(/[/\\]/).pop() || 'Unknown')}
        className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--m-bg-surface)] hover:bg-[var(--m-hover-bg)] text-[var(--m-fg-primary)] border border-[var(--m-border-primary)] transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-2"
      >
        View Diff
      </button>
    </div>
  )
}

/**
 * CommandWidget — Replaces the raw code block for terminal commands.
 */
function CommandWidget({ command }: { command: string }): React.JSX.Element {
  const { executeCommand } = useWorkspaceStore()
  
  return (
    <div className="my-3 flex items-center justify-between bg-[var(--m-bg-tertiary)] border border-[var(--m-border-primary)] rounded-lg p-3 shadow-sm group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded bg-[color-mix(in_srgb,var(--m-accent-yellow)_15%,transparent)] text-[var(--m-accent-yellow)] shrink-0">
          <Terminal size={16} />
        </div>
        <div className="truncate">
          <div className="text-xs font-semibold text-[var(--m-fg-primary)]">
            Run Command
          </div>
          <div className="text-[11px] font-mono text-[var(--m-fg-muted)] mt-0.5 truncate">
            {command}
          </div>
        </div>
      </div>
      <button
        onClick={() => executeCommand(command)}
        className="shrink-0 ml-3 px-3 py-1.5 text-xs font-medium rounded bg-[color-mix(in_srgb,var(--m-accent-yellow)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--m-accent-yellow)_25%,transparent)] text-[var(--m-accent-yellow)] border border-[color-mix(in_srgb,var(--m-accent-yellow)_30%,transparent)] transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-2"
      >
        <Play size={12} /> Run
      </button>
    </div>
  )
}

/**
 * CodeBlock — renders fenced code blocks with syntax highlighting
 * and a smart action dropdown (Copy, Insert at Cursor, Create File, Replace File).
 */
function CodeBlock({ language, children }: { language: string; children: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showFilenameInput, setShowFilenameInput] = useState(false)
  const [filename, setFilename] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowActions(false)
        setShowFilenameInput(false)
      }
    }
    if (showActions || showFilenameInput) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActions, showFilenameInput])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleInsertAtCursor = (): void => {
    useWorkspaceStore.getState().insertAtCursor(children)
    setShowActions(false)
  }

  const handleReplaceFile = (): void => {
    const { activeFilePath, updateFileContent } = useWorkspaceStore.getState()
    if (activeFilePath) {
      updateFileContent(activeFilePath, children)
    }
    setShowActions(false)
  }

  const handleCreateFile = (): void => {
    setShowFilenameInput(true)
    setShowActions(false)
  }

  const handleCreateFileSubmit = async (): Promise<void> => {
    if (!filename.trim()) return
    await useWorkspaceStore.getState().createNewFile(filename.trim(), children)
    setShowFilenameInput(false)
    setFilename('')
  }

  return (
    <div className="relative group my-2 rounded-md overflow-hidden border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--m-bg-surface)] border-b border-[var(--m-border-primary)]">
        <span className="text-[10px] font-mono text-[var(--m-fg-muted)] uppercase tracking-wider">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-1 relative" ref={dropdownRef}>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] rounded transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={12} className="text-[var(--m-accent-green)]" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Apply dropdown trigger */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--m-fg-muted)] hover:text-[var(--m-accent-blue)] hover:bg-[var(--m-hover-bg)] rounded transition-colors"
            title="Apply code"
          >
            <FileDown size={12} />
            <span>Apply</span>
            <ChevronDown size={10} />
          </button>

          {/* Dropdown menu */}
          {showActions && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded-md shadow-lg z-50 py-1 animate-in zoom-in-95 duration-100">
              <button
                onClick={handleInsertAtCursor}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] transition-colors text-left"
              >
                <MousePointerClick size={13} className="text-[var(--m-accent-blue)]" />
                Insert at Cursor
              </button>
              <button
                onClick={handleCreateFile}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] transition-colors text-left"
              >
                <FilePlus size={13} className="text-[var(--m-accent-green)]" />
                Create New File
              </button>
              <button
                onClick={handleReplaceFile}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] transition-colors text-left"
              >
                <FileDown size={13} className="text-[var(--m-accent-yellow)]" />
                Replace Active File
              </button>
            </div>
          )}

          {/* Filename input for Create New File */}
          {showFilenameInput && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded-md shadow-lg z-50 p-2 animate-in zoom-in-95 duration-100">
              <p className="text-[10px] text-[var(--m-fg-muted)] mb-1.5">Enter filename:</p>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFileSubmit()}
                  placeholder="e.g. utils.ts"
                  className="flex-1 px-2 py-1 text-[11px] bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] rounded text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)]"
                  autoFocus
                />
                <button
                  onClick={handleCreateFileSubmit}
                  className="px-2 py-1 text-[10px] bg-[var(--m-accent-blue)] text-white rounded hover:opacity-90 transition-opacity"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Syntax-highlighted code content */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '0.75rem',
          background: 'transparent',
          fontSize: '12px',
          lineHeight: '1.6'
        }}
        codeTagProps={{
          style: { fontFamily: 'JetBrainsMono Nerd Font, Consolas, monospace' }
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [msgCopied, setMsgCopied] = useState(false)

  const handleCopyMessage = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content)
      setMsgCopied(true)
      setTimeout(() => setMsgCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  return (
    <div className={`group relative p-4 border-b border-[var(--m-border-primary)] ${isUser ? 'bg-[var(--m-bg-primary)]' : isSystem ? 'bg-[color-mix(in_srgb,var(--m-accent-yellow)_10%,transparent)] text-[var(--m-accent-yellow)]' : 'bg-[var(--m-bg-secondary)]'}`}>
      
      {/* Copy message button - appears on hover */}
      {!isStreaming && (
        <button
          onClick={handleCopyMessage}
          className="absolute top-2 right-2 p-1 rounded text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] opacity-0 group-hover:opacity-100 transition-all"
          title="Copy message"
        >
          {msgCopied ? <Check size={12} className="text-[var(--m-accent-green)]" /> : <Copy size={12} />}
        </button>
      )}

      <div className="font-semibold text-[10px] mb-2 uppercase tracking-wider text-[var(--m-fg-muted)] flex items-center gap-2">
        {isUser ? 'You' : isSystem ? 'System' : 'AI Assistant'}
        {isStreaming && (
          <span className="inline-flex items-center gap-1 text-[var(--m-accent-blue)]">
            <span className="w-1 h-1 rounded-full bg-[var(--m-accent-blue)] animate-ping" />
            typing
          </span>
        )}
      </div>
      <div className="text-[13px] leading-relaxed markdown-body text-[var(--m-fg-primary)]">
        {isUser || isSystem ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                // Match anything after language-
                const match = /language-(.+)/.exec(className || '')
                const codeString = String(children).replace(/\n$/, '')

                // If it has a language class, it's a fenced code block
                if (match) {
                  const lang = match[1]
                  
                  // Intercept file modifications
                  if (lang.startsWith('file:')) {
                    const path = lang.slice(5)
                    return <FileDiffWidget path={path} />
                  }
                  
                  // Intercept terminal commands
                  if (lang === 'command') {
                    return <CommandWidget command={codeString} />
                  }
                  
                  return <CodeBlock language={lang}>{codeString}</CodeBlock>
                }

                // Inline code
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              // Prevent wrapping code blocks in <pre> since CodeBlock handles it
              pre({ children }) {
                return <>{children}</>
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Auto-applied files indicator */}
      {message.appliedFiles && message.appliedFiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.appliedFiles.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                f.status === 'created'
                  ? 'bg-[color-mix(in_srgb,var(--m-accent-green)_15%,transparent)] text-[var(--m-accent-green)] border-[color-mix(in_srgb,var(--m-accent-green)_30%,transparent)]'
                  : 'bg-[color-mix(in_srgb,var(--m-accent-blue)_15%,transparent)] text-[var(--m-accent-blue)] border-[color-mix(in_srgb,var(--m-accent-blue)_30%,transparent)]'
              }`}
            >
              {f.status === 'created' ? '✨' : '✓'} {f.path}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
