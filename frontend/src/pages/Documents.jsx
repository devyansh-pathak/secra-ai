import { useState } from 'react'
import { FileText, Plus, Search } from 'lucide-react'
import DocumentCard from '../components/documents/DocumentCard'
import DocumentUpload from '../components/documents/DocumentUpload'
import EmptyState from '../components/common/EmptyState'
import { MOCK_DOCS } from '../data/mockData'

export default function Documents() {
  const [docs, setDocs]     = useState(MOCK_DOCS)
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.type.toLowerCase().includes(query.toLowerCase())
  )
  const handleDelete   = (id) => setDocs(p => p.filter(d => d.id !== id))
  const handleUploaded = (doc) => setDocs(p => [{ ...doc, id: Date.now() }, ...p])

  return (
    <div className="flex-1 overflow-y-auto bg-bg px-8 py-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight mb-1 text-tx-1">Your Knowledge Base</h1>
          <p className="text-[13px] text-tx-3">Documents Secra AI uses to answer your questions</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded text-[12px] font-semibold transition-all bg-amb hover:bg-amb-lt text-bg shadow-amb-sm">
          <Plus size={13} /> Add Document
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-[300px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-4" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-2 rounded border text-[12px] outline-none transition-colors bg-card2 border-line text-tx-1 placeholder-tx-4 focus:border-amb" />
        </div>
      </div>

      <div className="bg-card border border-line rounded-lg overflow-hidden">
        <div className="grid gap-4 px-4 py-2.5 border-b border-line bg-card2 [grid-template-columns:1fr_80px_120px_68px]">
          {['Document','Type','Status',''].map(h => (
            <span key={h} className="text-[10px] font-semibold tracking-wide uppercase text-tx-3">{h}</span>
          ))}
        </div>
        {filtered.length > 0
          ? filtered.map(d => <DocumentCard key={d.id} doc={d} onDelete={handleDelete} />)
          : <EmptyState icon={FileText} title="No documents found"
              description={query ? 'Try a different search term.' : 'Add trusted refinery documents so Secra AI can provide evidence-based answers.'}
              action={<button onClick={() => setOpen(true)} className="px-4 py-2 rounded text-[12px] font-semibold bg-amb hover:bg-amb-lt text-bg transition-all shadow-amb-sm">+ Add Document</button>} />
        }
      </div>

      <DocumentUpload open={open} onClose={() => setOpen(false)} onUploaded={handleUploaded} />
    </div>
  )
}
