import { useState, useRef, useEffect } from 'react'
import { Paperclip, Image, Mic, Send, FilePlus, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import { UserMessage, AiMessage, ThinkingMessage, ImageAnalysisMessage } from '../components/chat/ChatMessage'
import DocumentUpload from '../components/documents/DocumentUpload'
import { MOCK_RESPONSES } from '../data/mockData'

const QUICK = [
  { label: 'Ask about a document',  q: 'Ask about a document'        },
  { label: 'Analyze equipment image', q: 'Analyze equipment image'   },
  { label: 'Create a checklist',    q: 'Create a maintenance checklist' },
  { label: 'Find an SOP',           q: 'Find an SOP'                 },
]

function pickResponse(text) {
  const l = text.toLowerCase()
  if (l.includes('checklist')) return MOCK_RESPONSES.checklist
  if (l.includes('sop') || l.includes('procedure')) return MOCK_RESPONSES.sop
  if (l.includes("don't know") || l.includes('unsure')) return MOCK_RESPONSES.uncertain
  return MOCK_RESPONSES.default
}

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages]     = useState([])
  const [text, setText]             = useState('')
  const [thinking, setThinking]     = useState(false)
  const [activeConv, setActiveConv] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingImg, setPendingImg] = useState(null)
  const taRef     = useRef()
  const bottomRef = useRef()

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const startConv = (idx) => {
    setActiveConv(idx)
    const titles = ['Pump vibration analysis','Safety procedure for compressor','Crude unit SOP question','Heat exchanger inspection','Maintenance checklist — V-203','Fire safety evacuation SOP','Corrosion allowance values']
    setMessages([{ type: 'user', text: titles[idx] }])
    setThinking(true)
    const key = idx === 4 ? 'checklist' : idx === 5 ? 'sop' : 'default'
    setTimeout(() => { setThinking(false); setMessages(p => [...p, { type: 'ai', response: MOCK_RESPONSES[key] }]) }, 900)
  }

  const newChat = () => { setMessages([]); setActiveConv(null); setText(''); setPendingImg(null) }

  const send = () => {
    const t = text.trim()
    if (!t && !pendingImg) return
    const wasImg = !!pendingImg
    setMessages(p => [...p, { type: 'user', text: t || 'Please analyze this equipment image.', imageUrl: pendingImg }])
    setText(''); setPendingImg(null)
    if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.placeholder = 'Ask Secra AI anything about refinery operations…' }
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      if (wasImg) setMessages(p => [...p, { type: 'img-analysis' }])
      else setMessages(p => [...p, { type: 'ai', response: pickResponse(t) }])
    }, 1100)
  }

  const onKey   = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const onInput = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }

  const handleImg = (e) => {
    const f = e.target.files[0]; if (!f) return
    new FileReader().onload = ev => { setPendingImg(ev.target.result); taRef.current && (taRef.current.placeholder = 'Image attached — add a note or press Send…'); taRef.current?.focus() }
    const r = new FileReader(); r.onload = ev => { setPendingImg(ev.target.result) }; r.readAsDataURL(f); e.target.value = ''
  }
  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return
    setText(`I've uploaded "${f.name}". Please analyze it.`); taRef.current?.focus(); e.target.value = ''
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar activeConv={activeConv} onSelectConv={startConv} onNewChat={newChat} />

      <div className="flex flex-col flex-1 overflow-hidden bg-bg">

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              {/* subtle glow */}
              <div className="absolute pointer-events-none">
                <div className="w-[500px] h-[500px] rounded-full bg-amb/[0.03] blur-3xl -translate-y-1/4" />
              </div>
              <h2 className="text-[22px] font-medium text-tx-1 mb-2 relative">
                Good {greeting}, <span className="text-amb-lt">{user?.role}.</span>
              </h2>
              <p className="text-[14px] text-tx-3 mb-10 relative">How can Secra AI help you today?</p>
              <div className="flex flex-wrap gap-2.5 justify-center max-w-lg relative">
                {QUICK.map(q => (
                  <button key={q.q} onClick={() => { setText(q.q); taRef.current?.focus() }}
                    className="px-4 py-2.5 rounded text-[12px] transition-all border border-line bg-card2 text-tx-2 hover:border-amb hover:text-amb-lt hover:bg-card3">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-[max(16px,calc(50%-400px))] py-6">
              {messages.map((m, i) => (
                <div key={i}>
                  {m.type === 'user'         && <UserMessage text={m.text} imageUrl={m.imageUrl} />}
                  {m.type === 'ai'           && <AiMessage response={m.response} />}
                  {m.type === 'img-analysis' && <ImageAnalysisMessage />}
                </div>
              ))}
              {thinking && <ThinkingMessage />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Add Document banner */}
        <button onClick={() => setUploadOpen(true)}
          className="mx-[max(16px,calc(50%-400px))] mb-3 flex items-center gap-3 px-4 py-2.5 rounded-lg flex-shrink-0 transition-all bg-card border border-line hover:border-amb-dim group">
          <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-card3 group-hover:bg-card4 transition-colors">
            <FilePlus size={15} className="text-amb" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[12px] font-medium text-tx-1">+ Add Document</div>
            <div className="text-[11px] text-tx-4">Upload SOPs, manuals, reports or technical documents</div>
          </div>
          <ChevronRight size={13} className="text-tx-4 group-hover:text-amb transition-colors" />
        </button>

        {/* Input area */}
        <div className="flex-shrink-0 bg-card border-t border-line px-[max(16px,calc(50%-400px))] py-3">
          <div className="flex items-end gap-2 rounded-lg px-3 py-2 bg-card2 border border-line focus-within:border-amb transition-colors">
            <textarea ref={taRef} rows={1} value={text}
              onChange={e => { setText(e.target.value); onInput(e) }}
              onKeyDown={onKey}
              placeholder="Ask Secra AI anything about refinery operations…"
              className="flex-1 bg-transparent outline-none text-[13px] leading-relaxed max-h-[140px] text-tx-1 placeholder-tx-4"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              {[
                { icon: Paperclip, title: 'Attach file',   accept: '.pdf,.docx,.txt,image/*', onChange: handleFile, img: false },
                { icon: Image,     title: 'Upload image',  accept: 'image/*',                  onChange: handleImg,  img: true  },
              ].map(({ icon: Icon, title, accept, onChange }) => (
                <label key={title} title={title} className="p-1.5 rounded cursor-pointer text-tx-4 hover:text-amb hover:bg-card3 transition-colors">
                  <input type="file" className="hidden" accept={accept} onChange={onChange} />
                  <Icon size={15} />
                </label>
              ))}
              <button title="Voice (coming soon)" className="p-1.5 rounded text-tx-4 hover:text-amb hover:bg-card3 transition-colors">
                <Mic size={15} />
              </button>
              <button onClick={send} disabled={!text.trim() && !pendingImg}
                className="ml-1 p-2 rounded bg-amb hover:bg-amb-lt text-bg transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-amb-sm">
                <Send size={14} />
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-tx-4 mt-2">
            Secra AI uses only your organization's documents · Answers include source references
          </p>
        </div>
      </div>

      <DocumentUpload open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
