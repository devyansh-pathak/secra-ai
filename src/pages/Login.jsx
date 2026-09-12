import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SecraLogo from '../components/common/SecraLogo'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [uid, setUid]       = useState('ENG-1042')
  const [name, setName]     = useState('')
  const [pw, setPw]         = useState('secret')
  const [lang, setLang]     = useState('English')
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState('')

  const handle = (e) => {
    e.preventDefault()
        if (!name.trim()) { setError('Please enter your name.'); return }
    if (!uid.trim()) { setError('Please enter your User ID.'); return }
    if (login(uid, pw,name)) navigate('/chat')
    else setError('Invalid credentials.')
  }

  const inp = 'w-full bg-card2 border border-line rounded px-3 py-2.5 text-[13px] text-tx-1 placeholder-tx-4 outline-none focus:border-amb transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      {/* subtle radial glow behind form */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-amb/[0.04] blur-3xl" />
      </div>

      <div className="relative w-[380px] flex flex-col gap-7">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          <SecraLogo size={56} />
          <div>
            <div className="text-[24px] font-semibold tracking-tight text-amb-lt mb-1">Secra AI</div>
            <div className="text-[12px] text-tx-3 leading-relaxed">Sovereign Intelligence for Refinery Operations</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-line rounded-xl p-7 flex flex-col gap-4 shadow-card">
          {error && (
            <div className="bg-card3 border border-line2 text-red-400 text-[12px] rounded px-3 py-2">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Full Name</label>
            <input className={inp} placeholder="Enter your company-provided User ID" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Company User ID</label>
            <input className={inp} placeholder="Enter your company-provided User ID" value={uid} onChange={e => setUid(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className={`${inp} pr-10`}
                placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-3 hover:text-tx-1 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Preferred Language</label>
            <select value={lang} onChange={e => setLang(e.target.value)} className={inp + ' appearance-none'}>
              {['English','Hindi','Kannada'].map(l => <option key={l}>{l}</option>)}
            </select>
            <span className="text-[10px] text-tx-4">You can change this preference later.</span>
          </div>
          <button type="button" onClick={handle}
            className="mt-1 w-full py-2.5 rounded text-[13px] font-semibold transition-all bg-amb hover:bg-amb-lt text-bg shadow-amb-sm">
            Sign in to Secra AI
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-tx-4">
          <Lock size={11} className="text-amb-dk opacity-80" />
          Your data stays within your organization's infrastructure.
        </div>
      </div>
    </div>
  )
}
