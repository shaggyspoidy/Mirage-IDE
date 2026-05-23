import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'
import { BotMessageSquare, GitBranch } from 'lucide-react'

/**
 * StatusBar — a sleek bottom bar showing editor state and AI model.
 * Gradient accent line on top for that premium feel.
 */
export function StatusBar(): React.JSX.Element {
  const { activeFilePath, cursorPosition, openFiles, gitBranch, gitDirtyCount } = useWorkspaceStore()
  const { selectedModelId, models } = useModelStore()

  const activeFile = openFiles.find(f => f.path === activeFilePath)
  const selectedModel = models.find(m => m.id === selectedModelId)

  // ... (keep language detection)
  const getLanguage = (): string => {
    if (!activeFilePath) return 'Plain Text'
    const ext = activeFilePath.split('.').pop()?.toLowerCase() || ''
    const langMap: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
      py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', cpp: 'C++', c: 'C',
      html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', md: 'Markdown',
      yaml: 'YAML', yml: 'YAML', toml: 'TOML', sh: 'Shell', bash: 'Bash',
      sql: 'SQL', graphql: 'GraphQL', vue: 'Vue', svelte: 'Svelte',
      rb: 'Ruby', php: 'PHP', swift: 'Swift', kt: 'Kotlin', dart: 'Dart'
    }
    return langMap[ext] || ext.toUpperCase() || 'Plain Text'
  }

  const lineCount = activeFile?.content?.split('\n').length ?? 0

  return (
    <div className="relative shrink-0">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[var(--m-accent-blue)] via-[var(--m-accent-purple)] to-[var(--m-accent-pink)] opacity-40" />

      <div className="flex items-center justify-between h-[22px] px-3 bg-[var(--m-bg-tertiary)] text-[10px] text-[var(--m-fg-muted)] select-none">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Git Branch */}
          {gitBranch && (
            <div className="flex items-center gap-1 hover:text-[var(--m-fg-primary)] transition-colors cursor-pointer text-[var(--m-accent-blue)]">
              <GitBranch size={10} />
              <span>{gitBranch}</span>
              {gitDirtyCount > 0 && <span>*</span>}
            </div>
          )}

          {/* Cursor position */}
          {activeFilePath && cursorPosition && (
            <span className="font-mono tracking-wide hover:text-[var(--m-fg-primary)] transition-colors cursor-default">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
          )}

          {/* Line count */}
          {activeFile && (
            <span className="font-mono opacity-60">
              {lineCount} lines
            </span>
          )}
        </div>

        {/* Center section */}
        <div className="flex items-center gap-3">
          {/* Language */}
          {activeFilePath && (
            <span className="hover:text-[var(--m-fg-primary)] transition-colors cursor-default">
              {getLanguage()}
            </span>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Encoding */}
          {activeFilePath && (
            <span className="opacity-60">UTF-8</span>
          )}

          {/* AI Model */}
          {selectedModel && (
            <span className="flex items-center gap-1 text-[var(--m-accent-purple)] hover:text-[var(--m-accent-pink)] transition-colors cursor-default">
              <BotMessageSquare size={10} />
              {selectedModel.displayName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
