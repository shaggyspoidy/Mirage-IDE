import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Plus, X, FileCode, Square } from 'lucide-react'
import { useContextStore } from '../../stores/contextStore'
import { useModelStore } from '../../stores/modelStore'
import { ModelSelector } from './ModelSelector'

export function ChatInput(): React.JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<{name: string, path: string, isImage?: boolean}[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessageStreaming, isGenerating } = useContextStore()
  const selectedModelId = useModelStore((state) => state.selectedModelId)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [prompt])

  const handleSend = (): void => {
    if ((!prompt.trim() && attachments.length === 0) || isGenerating) return

    sendMessageStreaming(prompt, selectedModelId)
    setPrompt('')
    setAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            if (event.target?.result) {
              const dataUrl = event.target.result as string
              const name = `Pasted Image ${new Date().getTime()}.png`
              setAttachments(prev => [...prev, { name, path: dataUrl, isImage: true }])
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  const handleAddAttachment = async (): Promise<void> => {
    try {
      const result = await window.api.dialog.openFile()
      if (!result.canceled && result.path) {
        // Extract filename from path
        const filename = result.path.split(/[/\\]/).pop() || result.path
        
        // Prevent duplicates
        if (!attachments.find(a => a.path === result.path)) {
          setAttachments(prev => [...prev, { name: filename, path: result.path }])
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error)
    }
  }

  const removeAttachment = (path: string): void => {
    setAttachments(prev => prev.filter(a => a.path !== path))
  }

  return (
    <div className="p-3 bg-[var(--m-bg-primary)] flex flex-col gap-2 shrink-0 border-t border-[var(--m-border-primary)]">
      
      {/* Header status (if generating) */}
      {isGenerating && (
        <div className="text-[10px] text-[var(--m-accent-blue)] animate-pulse flex items-center gap-1.5 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--m-accent-blue)] animate-ping" />
          Generating response...
        </div>
      )}

      {/* Main Input Container */}
      <div className="flex flex-col gap-2 bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded-lg p-2 focus-within:border-[var(--m-accent-blue)] transition-colors shadow-sm">
        
        {/* Attachment Pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 pt-1">
            {attachments.map((file) => 
              file.isImage ? (
                <div key={file.path} className="relative group animate-in zoom-in duration-200" title={file.name}>
                  <img src={file.path} alt="attachment" className="w-12 h-12 object-cover rounded-md border border-[var(--m-border-primary)]" />
                  <button 
                    title="Remove"
                    onClick={() => removeAttachment(file.path)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] text-[var(--m-fg-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div 
                  key={file.path}
                  className="flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-[var(--m-bg-primary)] border border-transparent hover:border-[var(--m-border-primary)] rounded-md text-[13px] shadow-sm animate-in zoom-in duration-200 group transition-all"
                  title={file.name}
                >
                  <Plus size={14} className="text-[var(--m-fg-muted)]" />
                  <FileCode size={14} className="text-[var(--m-accent-blue)]" />
                  <span className="max-w-[120px] truncate italic text-[var(--m-fg-secondary)]">{file.name}</span>
                  
                  {/* Invisible small section for removal that appears on hover */}
                  <button 
                    title="Remove"
                    onClick={() => removeAttachment(file.path)}
                    className="ml-1 p-0.5 rounded-sm text-[var(--m-fg-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Describe what to build"
          className="w-full max-h-[100px] min-h-[30px] resize-none bg-transparent text-[13px] text-[var(--m-fg-primary)] focus:outline-none placeholder-[var(--m-fg-subtle)] px-1 py-1"
          rows={1}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-0.5">
            <button 
              onClick={handleAddAttachment}
              className="p-1 text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] rounded transition-colors" 
              title="Attach File"
            >
              <Plus size={14} />
            </button>
            <ModelSelector />
          </div>
          
          {isGenerating ? (
            <button
              onClick={() => {
                window.api.ai.stopStream()
                useContextStore.getState().setGenerating(false)
              }}
              className="p-1.5 rounded-md bg-[var(--m-accent-red)] border border-[var(--m-accent-red)] text-white hover:opacity-80 transition-all"
              title="Stop Generation"
            >
              <Square size={12} strokeWidth={3} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!prompt.trim() && attachments.length === 0}
              className="p-1.5 rounded-md bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] text-[var(--m-fg-secondary)] hover:bg-[var(--m-accent-blue)] hover:text-white hover:border-[var(--m-accent-blue)] disabled:opacity-50 disabled:bg-transparent disabled:text-[var(--m-fg-muted)] disabled:border-transparent transition-all"
              title="Send Message (Enter)"
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
