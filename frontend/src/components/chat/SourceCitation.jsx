import { FileText } from 'lucide-react'
export default function SourceCitation({ source }) {
  return (
    <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors
      bg-card3 border border-line2 text-amb hover:bg-card4 hover:border-amb-dim">
      <FileText size={10} />
      {source.name} · {source.page} · {source.section}
    </button>
  )
}
