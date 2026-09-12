import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, Settings, LogOut, User } from 'lucide-react'
import SecraLogo from '../common/SecraLogo'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { label: 'Chat',      path: '/chat'      },
  { label: 'Documents', path: '/documents' },
  { label: 'Settings',  path: '/settings'  },
]
const ADMIN_NAV = [
  { label: 'Audit Log',     path: '/audit'  },
  { label: 'System Health', path: '/health' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const [ddOpen, setDdOpen] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAdmin   = user?.role === 'Administrator'
  const allNav    = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="h-12 flex items-center px-5 gap-4 flex-shrink-0 bg-card border-b border-line relative z-20">
      {/* Logo + name */}
      <Link to="/chat" className="flex items-center gap-2.5 no-underline">
        <SecraLogo size={26} />
        <span className="font-semibold text-[14px] tracking-tight text-amb-lt">Secra AI</span>
      </Link>

      {/* Nav */}
      <nav className="flex items-stretch h-full gap-0.5 ml-3">
        {allNav.map(n => {
          const active = location.pathname.startsWith(n.path)
          return (
            <Link key={n.path} to={n.path} className={`
              flex items-center px-4 text-[13px] border-b-2 mb-[-1px] transition-colors no-underline whitespace-nowrap
              ${active ? 'text-amb-lt border-amb font-medium' : 'text-tx-3 border-transparent hover:text-tx-1'}
            `}>{n.label}</Link>
          )
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-1.5 text-[11px] text-tx-3 ml-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amb blink" />
        System ready
      </div>

      {/* User */}
      <div className="ml-auto relative">
        <button onClick={() => setDdOpen(p => !p)}
          className="flex items-center gap-2 rounded pl-1 pr-3 py-1 border border-line bg-card2 hover:bg-card3 transition-colors">
          <div className="w-7 h-7 rounded-full bg-card4 flex items-center justify-center text-[11px] font-semibold text-amb">
            {user?.name?.[0] || 'P'}
          </div>
          <div className="text-left">
            <div className="text-[12px] font-medium text-tx-1 leading-none">{user?.name}</div>
            <div className="text-[10px] text-tx-3 mt-0.5">{user?.role}</div>
          </div>
          <ChevronDown size={11} className="text-tx-3" />
        </button>

        {ddOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDdOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[160px] rounded-lg overflow-hidden bg-card2 border border-line shadow-xl">
              <button onClick={() => { setDdOpen(false); navigate('/settings') }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors">
                <User size={13} className="text-tx-3" /> Profile
              </button>
              <button onClick={() => { setDdOpen(false); navigate('/settings') }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors">
                <Settings size={13} className="text-tx-3" /> Preferences
              </button>
              <div className="h-px bg-line mx-3 my-1" />
              <button onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-red-400 hover:bg-card3 transition-colors">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
