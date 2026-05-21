import { useEffect, useRef } from 'react'
import { BotMessageSquare, Trash2 } from 'lucide-react'
import { useContextStore } from '../../stores/contextStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatPanel(): React.JSX.Element {
  const { messages, streamingContent, isGenerating, clearMessages } = useContextStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Wire up streaming IPC event listeners once
  useEffect(() => {
    if (!window.api?.ai) return

    const removeChunk = window.api.ai.onStreamChunk((token: string) => {
      useContextStore.getState().appendStreamToken(token)
    })

    const removeDone = window.api.ai.onStreamDone((fullContent: string) => {
      useContextStore.getState().finalizeStream(fullContent)
    })

    const removeError = window.api.ai.onStreamError((error: string) => {
      useContextStore.getState().addMessage({
        role: 'system',
        content: `Stream error: ${error}`
      })
      useContextStore.getState().setGenerating(false)
    })

    return () => {
      removeChunk()
      removeDone()
      removeError()
    }
  }, [])

  return (
    <div className="flex flex-col w-full border-l border-[var(--m-border-primary)] bg-[var(--m-bg-secondary)] shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--m-border-primary)] bg-[var(--m-bg-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <BotMessageSquare size={16} className="text-[var(--m-accent-blue)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--m-fg-primary)]">AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-1 text-[var(--m-fg-muted)] hover:text-[var(--m-accent-red)] hover:bg-[var(--m-hover-bg)] rounded transition-colors"
            title="Clear Chat"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
            <BotMessageSquare size={48} className="mb-4 text-[var(--m-fg-muted)]" />
            <h3 className="text-sm font-medium mb-1">How can I help you code?</h3>
            <p className="text-[11px] text-[var(--m-fg-muted)] max-w-[200px]">
              Select a model below and start typing to chat with your AI assistant.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}

            {/* Live streaming message */}
            {streamingContent && (
              <ChatMessage
                message={{ role: 'assistant', content: streamingContent }}
                isStreaming={true}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      {/* Input Area */}
      <ChatInput />
    </div>
  )
}
