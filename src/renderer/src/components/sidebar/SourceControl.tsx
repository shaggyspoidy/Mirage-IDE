import { useState } from 'react'
import { FilePlus, FileMinus, FileEdit, Check, GitBranch, Sparkles } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'

export function SourceControl(): React.JSX.Element {
  const { currentFolder, gitChangedFiles, commitChanges, pushChanges, pullChanges, gitHasRemote, setGitDiffFile, refreshGitInfo } = useWorkspaceStore()
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAutoCommit = async () => {
    if (!currentFolder || gitChangedFiles.length === 0) return
    const modelId = useModelStore.getState().selectedModelId
    if (!modelId) {
      setError('Please select an AI model first.')
      return
    }

    setIsCommitting(true)
    setError(null)
    setCommitMessage('Generating...')
    try {
      const diff = await window.api.fs.gitDiff(currentFolder)
      if (!diff) {
        setCommitMessage('')
        setError('No changes detected in diff.')
        setIsCommitting(false)
        return
      }
      
      const prompt = `You are an expert developer. Generate a highly concise, professional conventional commit message based on the following git diff. Output ONLY the raw commit message (e.g. "feat: add user login" or "fix: resolve crash on startup") without any markdown formatting, code blocks, prefixes, or explanations.\n\nDiff:\n${diff.substring(0, 5000)}`
      
      const response = await window.api.ai.chat(modelId, [{ role: 'user', content: prompt }])
      
      if (response && response.content) {
        setCommitMessage(response.content.trim().replace(/^["']|["']$/g, '').replace(/^```\w*\n?|\n?```$/g, '').trim())
      } else {
        setCommitMessage('')
        setError('AI failed to generate a message.')
      }
    } catch (e: any) {
      setCommitMessage('')
      setError(e.message || 'Auto-commit failed')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    setIsCommitting(true)
    setError(null)
    try {
      await commitChanges(commitMessage)
      setCommitMessage('')
    } catch (e: any) {
      setError(e.message || 'Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }

  const openDiff = async (filePath: string) => {
    if (!currentFolder || !window.api?.fs?.getFileContentAtHead) return
    const originalContent = await window.api.fs.getFileContentAtHead(currentFolder, filePath)
    const modifiedContent = await window.api.fs.readFile(filePath)
    setGitDiffFile({ path: filePath, originalContent: originalContent || '', modifiedContent })
  }

  const getIconForStatus = (status: string) => {
    if (status.includes('M')) return <FileEdit size={14} className="text-[var(--m-accent-yellow)]" />
    if (status.includes('A') || status.includes('?')) return <FilePlus size={14} className="text-[var(--m-accent-green)]" />
    if (status.includes('D')) return <FileMinus size={14} className="text-[var(--m-accent-red)]" />
    return <FileEdit size={14} className="text-[var(--m-fg-muted)]" />
  }

  if (!currentFolder) {
    return (
      <div className="flex-1 p-4 text-xs text-[var(--m-fg-muted)]">
        Open a folder to view source control.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--m-bg-secondary)] overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="px-4 py-3 border-b border-[var(--m-border-primary)] flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-[var(--m-fg-secondary)] tracking-widest uppercase flex items-center gap-2">
          <GitBranch size={14} /> Source Control
        </h2>
        <button 
          onClick={refreshGitInfo}
          className="text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
        </button>
      </div>

      <div className="p-3 shrink-0 flex flex-col gap-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          className="w-full bg-[var(--m-bg-primary)] border border-[var(--m-border-primary)] rounded p-2 text-sm text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)] transition-colors resize-none h-20"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              handleCommit()
            }
          }}
        />
        {error && <div className="text-xs text-[var(--m-accent-red)] px-1">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={handleAutoCommit}
            disabled={isCommitting || gitChangedFiles.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--m-bg-tertiary)] text-[var(--m-fg-primary)] hover:text-[var(--m-accent-blue)] border border-[var(--m-border-primary)] rounded text-sm font-medium hover:bg-[var(--m-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            title="Generate AI Commit Message"
          >
            <Sparkles size={16} />
          </button>
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || isCommitting || gitChangedFiles.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--m-accent-blue)] text-white rounded text-sm font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Check size={16} /> {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>

        {gitHasRemote && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={async () => {
                setIsCommitting(true)
                setError(null)
                try {
                  await pullChanges()
                } catch (e: any) {
                  setError(e.message || 'Pull failed')
                } finally {
                  setIsCommitting(false)
                }
              }}
              disabled={isCommitting}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--m-bg-tertiary)] hover:bg-[var(--m-hover-bg)] text-[var(--m-fg-primary)] rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14"/><path d="m19 10-7 7-7-7"/></svg>
              Pull
            </button>
            <button
              onClick={async () => {
                setIsCommitting(true)
                setError(null)
                try {
                  await pushChanges()
                } catch (e: any) {
                  setError(e.message || 'Push failed')
                } finally {
                  setIsCommitting(false)
                }
              }}
              disabled={isCommitting}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--m-bg-tertiary)] hover:bg-[var(--m-hover-bg)] text-[var(--m-fg-primary)] rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V7"/><path d="m5 14 7-7 7 7"/></svg>
              Push
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-3 py-1 flex items-center justify-between text-xs text-[var(--m-fg-muted)] font-medium">
          <span>CHANGES</span>
          <span className="bg-[var(--m-bg-tertiary)] px-1.5 py-0.5 rounded-full text-[10px]">{gitChangedFiles.length}</span>
        </div>
        <div className="py-1">
          {gitChangedFiles.length === 0 ? (
            <div className="px-4 py-4 text-xs text-[var(--m-fg-subtle)] text-center italic">
              No changes to commit.
            </div>
          ) : (
            gitChangedFiles.map((file) => {
              const fileName = file.path.split(/[/\\]/).pop() || file.path
              const relativePath = file.path.replace(currentFolder + '/', '').replace(currentFolder + '\\', '')
              
              return (
                <button
                  key={file.path}
                  onClick={() => openDiff(file.path)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[var(--m-hover-bg)] group transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getIconForStatus(file.status)}
                    <span className="text-[13px] text-[var(--m-fg-primary)] truncate">{fileName}</span>
                    <span className="text-[10px] text-[var(--m-fg-subtle)] truncate group-hover:text-[var(--m-fg-muted)] transition-colors">
                      {relativePath.replace(fileName, '')}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--m-fg-subtle)] font-mono ml-2 shrink-0">{file.status}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
