import { useNavigate } from 'react-router-dom'
import { Plus, HelpCircle, Settings } from 'lucide-react'
import SystemLogsPanel from '../admin/SystemLogsPanel'

const GROUPS = ['Today', 'Yesterday', 'Earlier']

export default function Sidebar({ activeConv, onSelectConv, onNewChat, conversations = [] }) {
  const navigate = useNavigate()

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden bg-card border-r border-line">
      {/* New Chat */}
      <div className="p-3 flex-shrink-0">
        <button onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 rounded text-[13px] font-medium py-2 transition-all
            bg-amb-dim text-amb-lt border border-amb-dim hover:bg-amb hover:text-bg">
          <Plus size={13} /> New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {GROUPS.map(group => {
          const convs = conversations.filter(c => c.group === group)
          if (!convs.length) return null
          return (
            <div key={group}>
              <div className="px-4 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-tx-4">{group}</div>
              {convs.map(c => (
                <button key={c.id} onClick={() => onSelectConv(c.id)}
                  className={`relative w-full text-left flex items-center px-4 py-[7px] text-[12px] truncate transition-colors
                    ${activeConv === c.id
                      ? 'bg-card3 text-amb-lt'
                      : 'text-tx-3 hover:bg-card2 hover:text-tx-1'}`}>
                  {activeConv === c.id && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-amb rounded-r" />}
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* System Logs */}
      <div className="px-2 pb-2 flex-shrink-0">
        <SystemLogsPanel />
      </div>

      {/* Footer */}
      <div className="border-t border-line p-2 flex flex-col gap-0.5 flex-shrink-0">
        <button className="flex items-center gap-2 px-2.5 py-[7px] text-[12px] text-tx-3 hover:bg-card2 hover:text-tx-1 rounded transition-colors">
          <HelpCircle size={13} /> Help
        </button>
        <button onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-2.5 py-[7px] text-[12px] text-tx-3 hover:bg-card2 hover:text-tx-1 rounded transition-colors">
          <Settings size={13} /> Settings
        </button>
      </div>
    </aside>
  )
}