import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Trash2, Settings } from 'lucide-react'

const GROUPS = ['Today', 'Yesterday', 'Earlier']

export default function Sidebar({
  conversations = [],
  activeConv,
  onSelectConv,
  onNewChat,
  onDeleteConv
}) {
  const navigate = useNavigate()

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden bg-card border-r border-line select-none">
      {/* New Chat Button */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium py-2.5 transition-all
            bg-amb hover:bg-amb-lt text-bg shadow-amb-sm cursor-pointer"
        >
          <Plus size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1 space-y-3">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-3 text-tx-4 text-[12px]">
            No previous chats yet.<br />Start a conversation above!
          </div>
        ) : (
          GROUPS.map(group => {
            const convs = conversations.filter(c => (c.group || 'Today') === group)
            if (!convs.length) return null
            return (
              <div key={group}>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-tx-4">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {convs.map(c => {
                    const isActive = String(activeConv) === String(c.id)
                    return (
                      <div
                        key={c.id}
                        className={`group relative flex items-center justify-between rounded-md px-2.5 py-2 text-[12.5px] transition-all cursor-pointer
                          ${isActive
                            ? 'bg-card3 text-amb-lt font-medium'
                            : 'text-tx-2 hover:bg-card2 hover:text-tx-1'}`}
                        onClick={() => onSelectConv(c.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                          <MessageSquare size={13} className={`flex-shrink-0 ${isActive ? 'text-amb' : 'text-tx-4 group-hover:text-tx-2'}`} />
                          <span className="truncate">{c.title || 'Untitled Chat'}</span>
                        </div>

                        {onDeleteConv && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteConv(c.id)
                            }}
                            title="Delete Chat"
                            className="opacity-0 group-hover:opacity-100 p-1 text-tx-4 hover:text-red-400 hover:bg-card rounded transition-all flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Simple Clean Footer for non-tech users */}
      <div className="border-t border-line p-2 flex flex-col gap-1 flex-shrink-0 bg-card">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-tx-3 hover:bg-card2 hover:text-tx-1 rounded-md transition-colors"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
