import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-amb' : 'bg-card4'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line last:border-0">
      <div>
        <div className="text-[13px] text-tx-1">{label}</div>
        {hint && <div className="text-[11px] text-tx-3 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] font-semibold tracking-widest uppercase text-tx-3 mb-3 pb-2 border-b border-line">{title}</h2>
      {children}
    </section>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [lang, setLang]     = useState('English')
  const [cites, setCites]   = useState(true)
  const [safety, setSafety] = useState(true)

  return (
    <div className="flex-1 overflow-y-auto bg-bg px-8 py-7">
      <h1 className="text-[18px] font-semibold tracking-tight mb-1 text-tx-1">Settings</h1>
      <p className="text-[13px] text-tx-3 mb-7">Manage your preferences and account</p>

      <div className="max-w-[520px]">
        <Section title="Preferences">
          <Row label="Language" hint="Interface and response language">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="bg-card2 border border-line rounded px-2.5 py-1.5 text-[12px] text-tx-1 outline-none focus:border-amb transition-colors">
              {['English','Hindi','Kannada'].map(l => <option key={l}>{l}</option>)}
            </select>
          </Row>
          <Row label="Show source citations" hint="Display document references with answers">
            <Toggle checked={cites} onChange={setCites} />
          </Row>
          <Row label="Safety warnings" hint="Show notices on critical topics">
            <Toggle checked={safety} onChange={setSafety} />
          </Row>
        </Section>

        <Section title="Account">
          <Row label="User ID"><span className="text-[12px] text-tx-3 font-mono">{user?.id}</span></Row>
          <Row label="Role"><span className="text-[12px] text-tx-3">{user?.role}</span></Row>
          <Row label="Name"><span className="text-[12px] text-tx-3">{user?.name}</span></Row>
        </Section>

        <Section title="Security">
          <Row label="Password">
            <button className="px-3 py-1.5 text-[12px] rounded border border-line text-tx-2 hover:bg-card3 hover:border-line2 transition-colors">
              Change password
            </button>
          </Row>
          <Row label="Active session" hint="Started today at 09:14 AM">
            <span className="flex items-center gap-1 text-[12px] text-amb">
              <CheckCircle size={12} /> Active
            </span>
          </Row>
        </Section>
      </div>
    </div>
  )
}
