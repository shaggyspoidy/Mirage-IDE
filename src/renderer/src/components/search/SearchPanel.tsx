import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, FileText, Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface SearchResult {
  file: string
  fileName: string
  line: string
  lineNumber: number
  column: number
}

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { currentFolder, openFile } = useWorkspaceStore()

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !currentFolder) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const res = await window.api.fs.searchFiles(currentFolder, searchQuery.trim()) as SearchResult[]
      setResults(res)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [currentFolder])

  const handleInputChange = (val: string): void => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(val), 400)
  }

  const handleResultClick = (result: SearchResult): void => {
    openFile(result.file, result.fileName)
  }

  // Group results by file
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((groups, result) => {
    if (!groups[result.file]) groups[result.file] = []
    groups[result.file].push(result)
    return groups
  }, {})

  const highlightMatch = (text: string, q: string): React.JSX.Element => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.substring(0, idx)}
        <span className="bg-[var(--m-accent-yellow)] text-[var(--m-bg-primary)] rounded-sm px-0.5 font-semibold">
          {text.substring(idx, idx + q.length)}
        </span>
        {text.substring(idx + q.length)}
      </>
    )
  }

  if (!isOpen) return null

  return (
    <div
      className="absolute top-0 left-0 right-0 bottom-0 z-[100] flex items-start justify-center pt-[10vh] animate-in fade-in duration-200"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[600px] max-h-[70vh] rounded-xl border border-[var(--m-border-secondary)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-200"
        style={{
          background: 'color-mix(in srgb, var(--m-bg-surface) 92%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)'
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--m-border-primary)]">
          <Search size={18} className="text-[var(--m-accent-blue)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search across all files..."
            className="flex-1 bg-transparent text-[14px] text-[var(--m-fg-primary)] focus:outline-none placeholder-[var(--m-fg-subtle)]"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setHasSearched(false) }}
              className="p-1 text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-[var(--m-fg-subtle)] px-1.5 py-0.5 rounded border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--m-fg-muted)]">
              <Loader2 size={16} className="animate-spin text-[var(--m-accent-blue)]" />
              <span className="text-[12px]">Searching...</span>
            </div>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--m-fg-muted)]">
              <Search size={32} className="mb-2 opacity-30" />
              <p className="text-[12px]">No results found</p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="py-1">
              <div className="px-4 py-1.5 text-[10px] text-[var(--m-fg-muted)] uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? 's' : ''} in {Object.keys(groupedResults).length} file{Object.keys(groupedResults).length !== 1 ? 's' : ''}
              </div>
              {Object.entries(groupedResults).map(([file, fileResults]) => (
                <div key={file} className="mb-1">
                  {/* File header */}
                  <div className="flex items-center gap-2 px-4 py-1 text-[11px]">
                    <FileText size={12} className="text-[var(--m-accent-blue)] shrink-0" />
                    <span className="font-semibold text-[var(--m-fg-primary)] truncate">{fileResults[0].fileName}</span>
                    <span className="text-[var(--m-fg-subtle)] text-[10px]">({fileResults.length})</span>
                  </div>
                  {/* Matches */}
                  {fileResults.map((result, idx) => (
                    <button
                      key={`${file}-${idx}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-4 py-1 hover:bg-[var(--m-hover-bg)] transition-colors flex items-center gap-2 group"
                    >
                      <span className="text-[10px] text-[var(--m-accent-purple)] font-mono w-8 text-right shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        {result.lineNumber}
                      </span>
                      <span className="text-[11px] text-[var(--m-fg-secondary)] font-mono truncate">
                        {highlightMatch(result.line, query)}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!isSearching && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--m-fg-muted)]">
              <p className="text-[12px]">Type to search across your workspace</p>
              <p className="text-[10px] mt-1 text-[var(--m-fg-subtle)]">Results update as you type</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
