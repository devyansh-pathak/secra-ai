import { useState, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { getSystemLogs } from '../../services/api'

export default function SystemLogsPanel() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [menuOpen, setMenu]   = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchLogs = () => {
      // getSystemLogs() hits GET /api/v1/admin/logs and returns
      // the parsed JSON array: [{ key, val, ok, ts }, ...]
      Promise.resolve(getSystemLogs())
        .then((data) => {
          if (cancelled) return
          setErrored(false)
          if (Array.isArray(data)) {
            setLogs(data) // may legitimately be [] if backend has no events yet
          }
        })
        .catch(() => {
          if (cancelled) return
          setErrored(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    fetchLogs()
    const iv = setInterval(fetchLogs, 5000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [])

  const headerTime = logs.length > 0 ? logs[0].ts : '--:--:--'

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
                {['Clear', 'Export', 'Refresh'].map(o => (
                  <button
                    key={o}
                    onClick={() => setMenu(false)}
                    className="block w-full text-left px-3 py-1.5 text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors"
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="px-3 pt-2 pb-0.5">
        <span className="font-mono text-[9px] text-tx-4">{headerTime}</span>
      </div>
      <div className="log-scroll overflow-y-auto max-h-[144px] pb-1.5">
        {loading ? (
          <div className="px-3 py-[5px] font-mono text-[10px] text-tx-4">Loading…</div>
        ) : errored ? (
          <div className="px-3 py-[5px] font-mono text-[10px] text-tx-4">Couldn't reach backend</div>
        ) : logs.length === 0 ? (
          <div className="px-3 py-[5px] font-mono text-[10px] text-tx-4">No data yet</div>
        ) : (
          logs.map((l, i) => (
            <div key={l.ts ? `${l.key}-${l.ts}-${i}` : i} className="flex items-center justify-between px-3 py-[5px] hover:bg-card2 transition-colors">
              <span className="font-mono text-[10px] text-tx-3 truncate mr-2">{l.key}</span>
              <span className={`font-mono text-[10px] flex-shrink-0 ${l.ok ? 'text-amb' : 'text-tx-2'}`}>{l.val}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}