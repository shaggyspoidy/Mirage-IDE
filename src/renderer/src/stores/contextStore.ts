import { create } from 'zustand'
import { useWorkspaceStore } from './workspaceStore'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Files that were auto-applied from this message */
  appliedFiles?: { path: string; status: 'applied' | 'created' }[]
}

interface ContextState {
  messages: Message[]
  isGenerating: boolean
  streamingContent: string

  addMessage: (message: Message) => void
  setGenerating: (generating: boolean) => void
  clearMessages: () => void
  appendStreamToken: (token: string) => void
  finalizeStream: (fullContent: string) => void

  /** Send a message with full project context and auto-apply */
  sendMessageStreaming: (content: string, modelId: string | null) => Promise<void>
}

/**
 * System prompt that instructs the AI to be a code agent.
 * It outputs file changes in a structured format that we can parse and auto-apply.
 */
const SYSTEM_PROMPT = `You are Mirage AI, a powerful coding assistant embedded in the Mirage IDE.
You have full access to the user's project files. When the user asks you to make changes:

1. ALWAYS output the COMPLETE file content for any file you modify or create.
2. Use this EXACT format for each file you change:

\`\`\`file:relative/path/to/file.ext
// complete file content here
\`\`\`

3. If you want the user to run a terminal command, use this EXACT format:
\`\`\`command
npm install package
\`\`\`

RULES:
- Include the FULL file content, not just the changed parts.
- You can output multiple files in one response.
- Use the relative path from the project root.
- If creating a new file, use the same format — it will be created automatically.
- Before the code blocks, briefly explain what you're changing and why.
- After the code blocks, summarize what was done.
- If the user asks a question without requesting changes, respond normally without code blocks.
- Be concise in explanations but thorough in code.`

/**
 * Parse the AI response for file blocks and command blocks.
 */
function parseFileBlocks(content: string): { path: string; code: string; language: string }[] {
  const blocks: { path: string; code: string; language: string }[] = []
  // Match ```file:filepath\n...content...\n```
  const regex = /```file:([^\n]+)\n([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const filePath = match[1].trim()
    const code = match[2]
    
    // Don't trim trailing newline from code — keep exact content
    blocks.push({ path: filePath, code, language: 'file:' + filePath })
  }

  return blocks
}

export const useContextStore = create<ContextState>((set, get) => ({
  messages: [],
  isGenerating: false,
  streamingContent: '',

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setGenerating: (generating) => set({ isGenerating: generating }),

  clearMessages: () => set({ messages: [], streamingContent: '' }),

  appendStreamToken: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),

  finalizeStream: (fullContent) => {
    const workspace = useWorkspaceStore.getState()
    const projectRoot = workspace.currentFolder

    // Parse file blocks from the AI response
    const blocks = parseFileBlocks(fullContent)

    if (blocks.length > 0 && projectRoot) {
      const sep = projectRoot.includes('/') ? '/' : '\\'
      const results: { path: string; status: 'applied' | 'created' }[] = []

      // Add to pending diffs
      blocks.forEach(block => {
        const fullPath = `${projectRoot}${sep}${block.path.replace(/\//g, sep)}`
        workspace.addPendingDiff(fullPath, block.code)
        
        // We assume it's modified for now since we don't await fs.readFile in this sync block
        // (the store addPendingDiff will open the file in a tab)
        results.push({ path: block.path, status: 'applied' })
      })

      set((state) => ({
        messages: [...state.messages, {
          role: 'assistant' as const,
          content: fullContent,
          appliedFiles: results
        }],
        streamingContent: '',
        isGenerating: false
      }))
    } else {
      set((state) => ({
        messages: [...state.messages, { role: 'assistant' as const, content: fullContent }],
        streamingContent: '',
        isGenerating: false
      }))
    }
  },

  sendMessageStreaming: async (content, modelId) => {
    if (!modelId) {
      const { addMessage } = get()
      addMessage({ role: 'system', content: 'Please select an AI model from the dropdown first.' })
      return
    }

    const { addMessage, setGenerating, messages } = get()
    const workspace = useWorkspaceStore.getState()

    // Add user message
    const userMessage: Message = { role: 'user', content }
    addMessage(userMessage)

    // Reset streaming state
    set({ streamingContent: '', isGenerating: true })

    // Build context messages
    const contextMessages: Message[] = []

    // 1. System prompt
    contextMessages.push({ role: 'system', content: SYSTEM_PROMPT })

    // 2. Project context — file tree + relevant file contents
    if (workspace.currentFolder) {
      try {
        const ctx = await window.api.fs.getProjectContext(workspace.currentFolder) as {
          tree: string
          files: { path: string; relativePath: string; content: string }[]
        }

        // Build a compact project context
        let projectContext = `PROJECT STRUCTURE:\n${ctx.tree}\n\n`

        // Include the currently active file content in full
        const activeFile = workspace.openFiles.find(f => f.path === workspace.activeFilePath)
        if (activeFile) {
          const relativePath = activeFile.path
            .replace(workspace.currentFolder, '')
            .replace(/^[/\\]/, '')
            .replace(/\\/g, '/')
          projectContext += `CURRENTLY OPEN FILE (${relativePath}):\n\`\`\`\n${activeFile.content}\n\`\`\`\n\n`
        }

        // Include other open tab contents (abbreviated)
        const otherOpenFiles = workspace.openFiles.filter(f => f.path !== workspace.activeFilePath)
        if (otherOpenFiles.length > 0) {
          projectContext += `OTHER OPEN FILES:\n`
          for (const f of otherOpenFiles) {
            const rel = f.path.replace(workspace.currentFolder, '').replace(/^[/\\]/, '').replace(/\\/g, '/')
            // Only include first 100 lines to save context
            const lines = f.content.split('\n')
            const truncated = lines.slice(0, 100).join('\n')
            projectContext += `--- ${rel} ---\n\`\`\`\n${truncated}${lines.length > 100 ? '\n// ... truncated ...' : ''}\n\`\`\`\n\n`
          }
        }

        contextMessages.push({ role: 'system', content: projectContext })
      } catch (err) {
        console.error('[ContextStore] Failed to get project context:', err)
      }
    }

    // 3. Conversation history (skip old system messages to save tokens)
    const history = messages.filter(m => m.role !== 'system')
    contextMessages.push(...history, userMessage)

    // Initiate streaming
    try {
      await window.api.ai.chatStream(modelId, contextMessages)
    } catch (err) {
      console.error('[ContextStore] Failed to initiate stream:', err)
      addMessage({
        role: 'system',
        content: `Stream initiation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      })
      setGenerating(false)
    }
  }
}))
