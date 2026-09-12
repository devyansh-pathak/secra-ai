import { useState, useEffect } from 'react'
import { AUDIT_LOGS } from '../data/mockData'
import { getAuditLogs } from '../services/api'

const ROLE_CLS = {
  Engineer: 'text-amb bg-card3 border-line2',
  Safety:   'text-amb-lt bg-card3 border-line2',
  Manager:  'text-tx-2 bg-card3 border-line2',
}

export default function AuditLog() {
  const [logs, setLogs] = useState(AUDIT_LOGS)

  useEffect(() => {
    getAuditLogs().then(data => {
      if (data && data.length > 0) {
        setLogs(data)
      }
    })
  }, [])
  return (
    <div className="flex-1 overflow-y-auto bg-bg px-8 py-7">
      <h1 className="text-[18px] font-semibold tracking-tight mb-1 text-tx-1">Audit Log</h1>
      <p className="text-[13px] text-tx-3 mb-6">All user activity within Secra AI</p>
      <div className="bg-card border border-line rounded-lg overflow-hidden">
        <div className="grid gap-4 px-4 py-2.5 border-b border-line bg-card2 [grid-template-columns:80px_1fr_1fr_100px]">
          {['Time','User','Activity','Role'].map(h => (
            <span key={h} className="text-[10px] font-semibold tracking-wide uppercase text-tx-3">{h}</span>
          ))}
        </div>
        {logs.map((log, i) => (
          <div key={i} className="grid gap-4 px-4 py-3 border-b border-line last:border-0 hover:bg-card2 transition-colors items-center [grid-template-columns:80px_1fr_1fr_100px]">
            <span className="text-[12px] tabular-nums text-tx-3 font-mono">{log.time}</span>
            <span className="text-[13px] text-tx-1">{log.user}</span>
            <span className="text-[12px] text-tx-2">{log.activity}</span>
            <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-medium border ${ROLE_CLS[log.role] || ROLE_CLS.Engineer}`}>{log.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
