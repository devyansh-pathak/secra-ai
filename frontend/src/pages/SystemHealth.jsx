import { CheckCircle } from 'lucide-react'

const CARDS = [
  { label:'AI',             value:'Operational', note:'All models ready',        type:'status', ok:true  },
  { label:'Knowledge Base', value:'Operational', note:'1,842 documents indexed', type:'status', ok:true  },
  { label:'Database',       value:'Operational', note:'Connected',               type:'status', ok:true  },
  { label:'GPU Usage',      value:'72%',         note:null,                      type:'bar',    pct:72, warn:true  },
  { label:'Response Time',  value:'1.8s',        note:'Average',                 type:'stat',   ok:true  },
  { label:'Storage',        value:'64%',         note:null,                      type:'bar',    pct:64, warn:false },
  { label:'Network',        value:'LAN Only',    note:'No external calls',       type:'status', ok:true  },
  { label:'Active Users',   value:'7',           note:'This session',            type:'stat',   ok:null  },
]

export default function SystemHealth() {
  return (
    <div className="flex-1 overflow-y-auto bg-bg px-8 py-7">
      <h1 className="text-[18px] font-semibold tracking-tight mb-1 text-tx-1">System Health</h1>
      <p className="text-[13px] text-tx-3 mb-6">Current status of all Secra AI components</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {CARDS.map((c, i) => (
          <div key={i} className="bg-card border border-line rounded-lg p-4">
            <div className="text-[10px] font-semibold tracking-wide uppercase text-tx-3 mb-2">{c.label}</div>
            <div className={`tabular-nums font-semibold text-tx-1 mb-1.5 ${c.type==='bar' ? 'text-[22px]' : 'text-[16px]'}`}>{c.value}</div>
            {c.type==='bar' && (
              <div className="h-1 bg-card3 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${c.warn ? 'bg-amb-dk' : 'bg-amb'}`} style={{ width:`${c.pct}%` }} />
              </div>
            )}
            {c.note && (
              <div className={`text-[11px] flex items-center gap-1 mt-1 ${c.ok ? 'text-amb' : 'text-tx-3'}`}>
                {c.ok && <CheckCircle size={10} />}{c.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
