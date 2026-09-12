import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, UserPlus, LogIn, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import SecraLogo from '../components/common/SecraLogo'

export default function Login() {
  const { login, signup } = useAuth()
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Login form state
  const [loginId, setLoginId] = useState('ENG-1042')
  const [loginPw, setLoginPw] = useState('secret')

  // Signup form state
  const [signupUsername, setSignupUsername] = useState('')
  const [signupFullName, setSignupFullName] = useState('')
  const [signupPw, setSignupPw] = useState('')
  const [signupRole, setSignupRole] = useState('Engineer')
  const [signupEmail, setSignupEmail] = useState('')

  const [showPw, setShowPw] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!loginId.trim()) {
      setError('Please enter your Username or User ID.')
      return
    }
    setLoading(true)
    const res = await login(loginId.trim(), loginPw)
    setLoading(false)
    if (res && res.success) {
      navigate('/chat')
    } else {
      setError(res?.error || 'Invalid credentials.')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!signupUsername.trim()) {
      setError('Please enter a username.')
      return
    }
    if (!signupPw.trim()) {
      setError('Please enter a password.')
      return
    }
    setLoading(true)
    const res = await signup({
      username: signupUsername.trim(),
      fullName: signupFullName.trim(),
      password: signupPw,
      role: signupRole,
      email: signupEmail.trim()
    })
    setLoading(false)
    if (res && res.success) {
      setSuccessMsg('Account created successfully! Redirecting...')
      setTimeout(() => navigate('/chat'), 800)
    } else {
      setError(res?.error || 'Registration failed.')
    }
  }

  const inp = 'w-full bg-card2 border border-line rounded-lg px-3.5 py-2.5 text-[13px] text-tx-1 placeholder-tx-4 outline-none focus:border-amb transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg select-none">
      {/* Subtle radial background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-amb/[0.04] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px] flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <SecraLogo size={52} />
          <div>
            <div className="text-[22px] font-semibold tracking-tight text-amb-lt">Secra AI</div>
            <div className="text-[12px] text-tx-3">Sovereign Intelligence & Technical Assistant</div>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-4 shadow-card">
          
          {/* Tabs: Sign In / Create Account */}
          <div className="flex rounded-lg bg-card2 p-1 border border-line">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
              className={`flex-1 py-1.5 text-[12.5px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5
                ${mode === 'login' ? 'bg-card3 text-amb-lt shadow-sm border border-line2' : 'text-tx-3 hover:text-tx-1'}`}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg('') }}
              className={`flex-1 py-1.5 text-[12.5px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5
                ${mode === 'signup' ? 'bg-card3 text-amb-lt shadow-sm border border-line2' : 'text-tx-3 hover:text-tx-1'}`}
            >
              <UserPlus size={13} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[12px] rounded-lg px-3.5 py-2.5 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-[12px] rounded-lg px-3.5 py-2.5 flex items-center gap-2">
              <CheckCircle size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Username / User ID</label>
                <input
                  className={inp}
                  placeholder="e.g. ENG-1042, Pari, admin"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`${inp} pr-10`}
                    placeholder="Enter your password"
                    value={loginPw}
                    onChange={e => setLoginPw(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-4 hover:text-tx-2 transition-colors p-1"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all bg-amb hover:bg-amb-lt text-bg shadow-amb-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Signing in…' : 'Sign In to Secra AI'}
              </button>
            </form>
          ) : (
            /* SIGNUP FORM */
            <form onSubmit={handleSignup} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Full Name</label>
                <input
                  className={inp}
                  placeholder="e.g. Pari Sharma, Alex Doe"
                  value={signupFullName}
                  onChange={e => setSignupFullName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Username</label>
                <input
                  className={inp}
                  placeholder="Choose a username (e.g. pari, john123)"
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Role</label>
                  <select
                    value={signupRole}
                    onChange={e => setSignupRole(e.target.value)}
                    className={`${inp} appearance-none cursor-pointer`}
                  >
                    <option value="Engineer">Engineer</option>
                    <option value="Safety Officer">Safety Officer</option>
                    <option value="Manager">Manager</option>
                    <option value="Operator">Operator</option>
                    <option value="Administrator">Admin</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className={`${inp} appearance-none cursor-pointer`}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-tx-3">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`${inp} pr-10`}
                    placeholder="Create a password"
                    value={signupPw}
                    onChange={e => setSignupPw(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-4 hover:text-tx-2 transition-colors p-1"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all bg-amb hover:bg-amb-lt text-bg shadow-amb-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating account…' : 'Create New Account'}
              </button>
            </form>
          )}

          {/* Language / Footer toggle info */}
          <div className="text-center text-[11px] text-tx-4 mt-1">
            {mode === 'login' ? (
              <span>
                New user?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); setSuccessMsg('') }}
                  className="text-amb hover:underline font-medium ml-0.5"
                >
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
                  className="text-amb hover:underline font-medium ml-0.5"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-tx-4">
          <Lock size={12} className="text-amb opacity-80" />
          <span>Secure authentication & sovereign on-premise storage</span>
        </div>
      </div>
    </div>
  )
}

