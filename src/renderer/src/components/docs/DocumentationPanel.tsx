import { useState, useMemo } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { DocSection } from './DocSection'
import { editorShortcuts } from './content/editor-shortcuts'
import { aiFeatures } from './content/ai-features'
import { modelManagement } from './content/model-management'

type SectionId = 'shortcuts' | 'ai' | 'models'

export function DocumentationPanel(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId>('shortcuts')
  const [searchQuery, setSearchQuery] = useState('')

  const allSections = useMemo(() => {
    return [
      { id: 'shortcuts' as SectionId, title: 'Editor & Shortcuts', data: editorShortcuts },
      { id: 'ai' as SectionId, title: 'AI Features', data: aiFeatures },
      { id: 'models' as SectionId, title: 'Model Management', data: modelManagement }
    ]
  }, [])

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSections.find(s => s.id === activeSection)?.data || []
    }
    
    // If searching, search across all sections and flatten results
    const q = searchQuery.toLowerCase()
    return allSections.flatMap(section => 
      section.data.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.content.toLowerCase().includes(q)
      )
    )
  }, [activeSection, searchQuery, allSections])

  return (
    <div className="flex flex-col h-full bg-[var(--m-bg-secondary)] border-r border-[var(--m-border-primary)]">
      {/* Header */}
      <div className="flex-none p-3 border-b border-[var(--m-border-primary)] flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2 text-[var(--m-fg-primary)] px-1">
          <BookOpen size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">Documentation</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--m-fg-muted)]" />
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#00000040] border border-[var(--m-border-primary)] rounded-[4px] pl-7 pr-2 py-1 text-xs text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)] transition-colors placeholder-[var(--m-fg-subtle)]"
          />
        </div>
      </div>

      {/* Navigation & Content Split */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!searchQuery && (
          <div className="flex-none p-2 border-b border-[var(--m-border-primary)] flex gap-1 bg-[#00000020] overflow-x-auto no-scrollbar shrink-0">
            {allSections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${activeSection === s.id ? 'bg-[var(--m-accent-blue)] text-white font-medium' : 'text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-bg-tertiary)]'}`}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {searchQuery && (
            <div className="text-[10px] text-[var(--m-fg-muted)] mb-4 uppercase tracking-wide">
              Search Results
            </div>
          )}
          
          {filteredData.length > 0 ? (
            filteredData.map((item, idx) => (
              <DocSection key={idx} title={item.title} content={item.content} />
            ))
          ) : (
            <div className="text-center text-xs text-[var(--m-fg-subtle)] mt-10">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
