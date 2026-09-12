import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-[480px] max-w-[calc(100vw-32px)] rounded-lg overflow-hidden shadow-2xl bg-card2 border border-line">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <span className="text-[15px] font-semibold text-tx-1">{title}</span>
          <button onClick={onClose} className="p-1 rounded text-tx-3 hover:text-tx-1 hover:bg-card3 transition-colors">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
