import { ExternalLink, Trash2 } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'

const EXT_CLS = {
  pdf:  'text-red-400 bg-card3',
  docx: 'text-amb-lt bg-card3',
  txt:  'text-tx-3 bg-card3',
  jpg:  'text-amb bg-card3',
  png:  'text-amb bg-card3',
}

export default function DocumentCard({ doc, onDelete }) {
  return (
    <div className="grid items-center gap-4 px-4 py-3 border-b border-line hover:bg-card2 transition-colors [grid-template-columns:1fr_80px_120px_68px]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 border border-line ${EXT_CLS[doc.ext] || EXT_CLS.txt}`}>
          {doc.ext?.toUpperCase()}
        </div>
        <span className="text-[13px] text-tx-1 truncate">{doc.name}</span>
      </div>
      <span className="text-[12px] text-tx-3">{doc.type}</span>
      <StatusBadge status={doc.status} />
      <div className="flex gap-1">
        <button className="p-1.5 rounded text-tx-4 hover:text-amb hover:bg-card3 transition-colors"><ExternalLink size={13} /></button>
        <button onClick={() => onDelete(doc.id)} className="p-1.5 rounded text-tx-4 hover:text-red-400 hover:bg-card3 transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
