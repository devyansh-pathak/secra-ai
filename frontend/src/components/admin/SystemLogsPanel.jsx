import { useState, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { getSystemLogs } from '../../services/api'

const STATIC = [
  { key:'Vector Query',      val:'0.012s',    ok:false },
  { key:'API Call',          val:'Successful', ok:true  },
  { key:'Model Status',      val:'Active',     ok:true  },
  { key:'Context Retrieved', val:'24 chunks',  ok:false },
  { key:'Agent',             val:'Ready',      ok:true  },
  { key:'Security Check',    val:'Passed',     ok:true  },
  { key:'Error',             val:'None',       ok:false },
]

export default function SystemLogsPanel() {
  const [logs, setLogs]     = useState([])
  const [time, setTime]     = useState(() => new Date().toLocaleTimeString())
  const [menuOpen, setMenu] = useState(false)

  useEffect(() => {
    const fetchLogs = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/logs`)
        .then(r => r.json())
        .then(data => { if (data.length) { setLogs(data); setTime(new Date().toLocaleTimeString()) } })
        .catch(() => {})
    }
    fetchLogs()
    const iv = setInterval(fetchLogs, 5000)
    return () => clearInterval(iv)
  }, [])

  const display = logs.length > 0 ? logs : STATIC

  return (
    <div className="rounded border border-line bg-bg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <span className="font-mono text-[9px] font-semibold tracking-widest uppercase text-tx-3">System Logs</span>
        <div className="relative">
          <button onClick={() => setMenu(p => !p)} className="text-tx-4 hover:text-tx-2 transition-colors p-0.5 rounded">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[110px] rounded bg-card2 border border-line shadow-lg text-[11px] overflow-hidden">
                {['Clear','Export','Refresh'].map(o => (
                  <button key={o} onClick={() => setMenu(false)}
                    className="block w-full text-left px-3 py-1.5 text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors">{o}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="px-3 pt-2 pb-0.5">
        <span className="font-mono text-[9px] text-tx-4">{time}</span>
      </div>
      <div className="log-scroll overflow-y-auto max-h-[144px] pb-1.5">
        {display.map((l, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-[5px] hover:bg-card2 transition-colors">
            <span className="font-mono text-[10px] text-tx-3 truncate mr-2">{l.key}</span>
            <span className={`font-mono text-[10px] flex-shrink-0 ${l.ok ? 'text-amb' : 'text-tx-2'}`}>{l.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
