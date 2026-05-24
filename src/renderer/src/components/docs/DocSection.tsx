import ReactMarkdown from 'react-markdown'

interface DocSectionProps {
  title: string
  content: string
}

export function DocSection({ title, content }: DocSectionProps): React.JSX.Element {
  return (
    <div className="mb-6">
      <h2 className="text-[13px] font-semibold text-[var(--m-fg-primary)] mb-2 pb-1 border-b border-[var(--m-border-primary)]">
        {title}
      </h2>
      <div className="prose prose-invert prose-sm max-w-none text-[12px] text-[var(--m-fg-muted)] prose-p:leading-relaxed prose-pre:bg-[#00000040] prose-pre:border prose-pre:border-[var(--m-border-primary)] prose-strong:text-[var(--m-fg-primary)] prose-strong:font-medium prose-a:text-[var(--m-accent-blue)] prose-a:no-underline hover:prose-a:underline prose-code:text-[var(--m-accent-green)] prose-code:bg-[#00000040] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
