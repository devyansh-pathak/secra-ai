import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, Settings, LogOut, User, Globe, Check } from 'lucide-react'
import SecraLogo from '../common/SecraLogo'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { language, setLanguage, languages, t } = useLanguage()
  const [ddOpen, setDdOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAdmin   = user?.role === 'Administrator'

  const navItems = [
    { label: t('chat'),      path: '/chat'      },
    { label: t('documents'), path: '/documents' },
    { label: t('settings'),  path: '/settings'  },
  ]
  const adminNavItems = [
    { label: t('audit'),     path: '/audit'  },
    { label: t('health'),    path: '/health' },
  ]
  const allNav = isAdmin ? [...navItems, ...adminNavItems] : navItems

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
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-tx-3 ml-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amb blink" />
        {t('systemReady')}
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-2.5">
        {/* Language Dropdown Selector in Header */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(p => !p)}
            title="Change Language"
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium border border-line bg-card2 hover:bg-card3 text-tx-2 hover:text-tx-1 transition-colors"
          >
            <Globe size={13} className="text-amb" />
            <span>{language}</span>
            <ChevronDown size={11} className="text-tx-4 ml-0.5" />
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[150px] rounded-lg overflow-hidden bg-card2 border border-line shadow-xl py-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-tx-4 uppercase border-b border-line">
                  Select Language
                </div>
                {languages.map(l => {
                  const isSelected = l.name.toLowerCase() === language.toLowerCase()
                  return (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.name)
                        setLangOpen(false)
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-2 text-[12px] transition-colors ${
                        isSelected
                          ? 'bg-card3 text-amb font-medium'
                          : 'text-tx-2 hover:bg-card3 hover:text-tx-1'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{l.native}</span>
                        <span className="text-[10px] text-tx-4">({l.name})</span>
                      </div>
                      {isSelected && <Check size={12} className="text-amb" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* User profile dropdown */}
        <div className="relative">
          <button onClick={() => setDdOpen(p => !p)}
            className="flex items-center gap-2 rounded pl-1 pr-3 py-1 border border-line bg-card2 hover:bg-card3 transition-colors">
            <div className="w-7 h-7 rounded-full bg-card4 flex items-center justify-center text-[11px] font-semibold text-amb">
              {user?.name?.[0] || 'P'}
            </div>
            <div className="text-left hidden md:block">
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
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors border-b border-line">
                  <Settings size={13} className="text-tx-3" /> Settings
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-amb-lt hover:bg-card3 transition-colors">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
