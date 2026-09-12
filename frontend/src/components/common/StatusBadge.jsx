import { Check, Loader, AlertTriangle } from 'lucide-react'
const cfg = {
  ready:      { icon: Check,         label: 'Ready',           cls: 'text-amb bg-card3 border-line2' },
  processing: { icon: Loader,        label: 'Processing',      cls: 'text-tx-2 bg-card3 border-line2' },
  warn:       { icon: AlertTriangle, label: 'Needs attention', cls: 'text-red-400 bg-card3 border-line2' },
}
export default function StatusBadge({ status }) {
  const c = cfg[status] || cfg.ready
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${c.cls}`}>
      <Icon size={10} className={status === 'processing' ? 'animate-spin' : ''} />
      {c.label}
    </span>
  )
}
