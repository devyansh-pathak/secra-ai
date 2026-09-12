import { useState, useRef, useEffect, useCallback } from 'react'
import { Paperclip, Image, Mic, Send, FilePlus, ChevronRight, FileText, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import Sidebar from '../components/layout/Sidebar'
import { UserMessage, AiMessage, ThinkingMessage, ImageAnalysisMessage } from '../components/chat/ChatMessage'
import DocumentUpload from '../components/documents/DocumentUpload'
import { MOCK_RESPONSES } from '../data/mockData'
import { sendMessage, getSessions, getSessionMessages, deleteSession } from '../services/api'

function pickResponse(text, lang) {
  const l = text.toLowerCase()
  if (l.includes('hi') || l.includes('hello') || l.includes('hey') || l.includes('namaste')) {
    if (lang === 'Hindi') {
      return {
        text: "नमस्ते! 👋 मैं Secra AI हूँ, आपका रिफाइनरी ऑपरेशंस और सुरक्षा सहायक।\n\nमैं आपकी किस प्रकार सहायता कर सकता हूँ?\n• प्लांट SOPs और सुरक्षा दिशा-निर्देश\n• पंप, कंप्रेसer और वॉल्व की तकनीकी जाँच\n• उपकरण फोटो का दृश्य निरीक्षण (Visual Inspection)",
        sources: [],
        safety: false
      }
    }
    if (lang === 'Kannada') {
      return {
        text: "ನಮಸ್ಕಾರ! 👋 ನಾನು Secra AI, ನಿಮ್ಮ ರಿಫೈನರಿ ಕಾರ್ಯಾಚರಣೆಗಳು ಮತ್ತು ಸುರಕ್ಷತಾ ಸಹಾಯಕ.\n\nಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?\n• SOP ಗಳು ಮತ್ತು ಸುರಕ್ಷತಾ ನಿಯಮಗಳು\n• ಪಂಪ್ ಮತ್ತು ಕಂಪ್ರೆಸರ್ ತಾಂತ್ರಿಕ ತಪಾಸಣೆ\n• ಸಲಕರಣೆ ಫೋಟೋ ವಿಶ್ಲೇಷಣೆ",
        sources: [],
        safety: false
      }
    }
    return {
      text: "Hello! 👋 I am Secra AI, your refinery operations and safety intelligence assistant.\n\nHow can I assist you today?\n• Retrieve procedures from plant SOPs & manuals\n• Troubleshoot equipment (pumps, compressors, heat exchangers)\n• Generate Lockout/Tagout (LOTO) and safety checklists\n• Perform visual inspections on equipment photos",
      sources: [],
      safety: false
    }
  }
  if (l.includes('checklist')) return MOCK_RESPONSES.checklist
  if (l.includes('sop') || l.includes('procedure')) return MOCK_RESPONSES.sop
  if (l.includes("don't know") || l.includes('unsure')) return MOCK_RESPONSES.uncertain
  return MOCK_RESPONSES.default
}

export default function Chat() {
  const { user } = useAuth()
  const { language, t } = useLanguage()
  const [messages, setMessages]       = useState([])
  const [text, setText]               = useState('')
  const [thinking, setThinking]       = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv]   = useState(null)
  const [uploadOpen, setUploadOpen]   = useState(false)
  const [pendingImg, setPendingImg]   = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [activeDocContext, setActiveDocContext] = useState(null)
  const taRef     = useRef()
  const bottomRef = useRef()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening')

  const QUICK = [
    { label: t('quick1'), q: t('quick1') },
    { label: t('quick2'), q: t('quick2') },
    { label: t('quick3'), q: t('quick3') },
    { label: t('quick4'), q: t('quick4') },
  ]

  // Fetch conversations list on mount
  const refreshSessions = useCallback(async () => {
    try {
      const data = await getSessions()
      if (data && Array.isArray(data)) {
        setConversations(data)
      } else {
        // Fallback to local storage if backend offline
        const local = JSON.parse(localStorage.getItem('secra_conversations') || '[]')
        setConversations(local)
      }
    } catch {
      const local = JSON.parse(localStorage.getItem('secra_conversations') || '[]')
      setConversations(local)
    }
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const selectConv = async (convId) => {
    setActiveConv(convId)
    setThinking(true)
    try {
      const msgs = await getSessionMessages(convId)
      let loadedMsgs = msgs
      if (!loadedMsgs || loadedMsgs.length === 0) {
        loadedMsgs = JSON.parse(localStorage.getItem(`secra_msgs_${convId}`) || '[]')
      }
      if (loadedMsgs && loadedMsgs.length > 0) {
        setMessages(loadedMsgs)
        // Find if any message has fileInfo
        const fileMsg = loadedMsgs.find(m => m.fileInfo)
        if (fileMsg) {
          setActiveDocContext({ name: fileMsg.fileInfo.name, size: fileMsg.fileInfo.size })
        } else {
          setActiveDocContext(null)
        }
      } else {
        const found = conversations.find(c => c.id === convId)
        if (found) {
          setMessages([
            { type: 'user', text: found.title },
            { type: 'ai', response: pickResponse(found.title, language) }
          ])
          setActiveDocContext(null)
        }
      }
    } catch {
      setMessages([])
    } finally {
      setThinking(false)
    }
  }

  const handleDeleteConv = async (convId) => {
    await deleteSession(convId)
    setConversations(p => p.filter(c => c.id !== convId))
    const local = JSON.parse(localStorage.getItem('secra_conversations') || '[]')
    localStorage.setItem('secra_conversations', JSON.stringify(local.filter(c => c.id !== convId)))
    localStorage.removeItem(`secra_msgs_${convId}`)
    if (activeConv === convId) {
      newChat()
    }
  }

  const newChat = () => {
    setMessages([])
    setActiveConv(null)
    setActiveDocContext(null)
    setText('')
    setPendingImg(null)
    setPendingFile(null)
    if (taRef.current) {
      taRef.current.placeholder = t('askPlaceholder')
    }
  }

  const send = async (customPrompt) => {
    const rawText = (typeof customPrompt === 'string' ? customPrompt : text).trim()
    if (!rawText && !pendingImg && !pendingFile) return
    const wasImg = !!pendingImg
    const currentImg = pendingImg
    const currentFile = pendingFile

    if (currentFile) {
      setActiveDocContext({
        name: currentFile.name,
        size: currentFile.size
      })
    }

    const userMessageText = rawText || (currentFile ? `Please analyze "${currentFile.name}" and provide key technical insights.` : 'Please inspect this equipment photo.')

    const newUserMsg = {
      type: 'user',
      text: userMessageText,
      imageUrl: currentImg,
      fileInfo: currentFile ? { name: currentFile.name, size: currentFile.size } : null
    }

    setMessages(p => [...p, newUserMsg])
    setText('')
    setPendingImg(null)
    setPendingFile(null)
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.placeholder = t('askPlaceholder')
    }
    setThinking(true)

    // Automatically register chat title in sidebar if starting a new chat
    let currentConvId = activeConv
    if (!currentConvId) {
      const generatedTitle = (userMessageText.length > 30 ? userMessageText.substring(0, 30) + '...' : userMessageText) || (currentFile ? currentFile.name : 'New Conversation')
      const tempId = 'conv_' + Date.now()
      currentConvId = tempId
      setActiveConv(tempId)

      const newConvItem = {
        id: tempId,
        title: generatedTitle,
        group: 'Today',
        createdAt: new Date().toISOString()
      }
      setConversations(p => [newConvItem, ...p.filter(c => c.id !== tempId)])

      // Store in localStorage
      const local = JSON.parse(localStorage.getItem('secra_conversations') || '[]')
      localStorage.setItem('secra_conversations', JSON.stringify([newConvItem, ...local.filter(c => c.id !== tempId)]))
    }

    try {
      const res = await sendMessage(
        userMessageText,
        currentConvId,
        currentImg,
        language,
        currentFile
      )
      setThinking(false)

      let newAiMsg = null
      if (res && res.type === 'img-analysis') {
        newAiMsg = { type: 'img-analysis', analysis: res.analysis }
      } else if (res && res.type === 'ai' && res.response) {
        newAiMsg = { type: 'ai', response: res.response }
      } else {
        if (wasImg) newAiMsg = { type: 'img-analysis' }
        else newAiMsg = { type: 'ai', response: pickResponse(userMessageText, language) }
      }

      setMessages(p => {
        const updated = [...p, newAiMsg]
        try {
          localStorage.setItem(`secra_msgs_${currentConvId}`, JSON.stringify(updated))
        } catch (_) {}
        return updated
      })

      // If backend returned a persistent UUID for session, update activeConv
      if (res && res.conversationId && res.conversationId !== currentConvId) {
        setActiveConv(res.conversationId)
        refreshSessions()
      }

    } catch (err) {
      setThinking(false)
      const fallbackMsg = wasImg ? { type: 'img-analysis' } : { type: 'ai', response: pickResponse(userMessageText, language) }
      setMessages(p => {
        const updated = [...p, fallbackMsg]
        try {
          localStorage.setItem(`secra_msgs_${currentConvId}`, JSON.stringify(updated))
        } catch (_) {}
        return updated
      })
    }
  }

  const onKey   = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const onInput = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }

  const handleImg = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      setPendingImg(ev.target.result)
      if (taRef.current) {
        taRef.current.placeholder = 'Image attached — add specific questions or click Send…'
        taRef.current.focus()
      }
    }
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      setPendingFile({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        base64: ev.target.result
      })
      if (taRef.current) {
        taRef.current.placeholder = `Analyzing ${f.name} — add specific questions or click Send…`
        taRef.current.focus()
      }
    }
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConv={activeConv}
        onSelectConv={selectConv}
        onNewChat={newChat}
        onDeleteConv={handleDeleteConv}
      />

      <div className="flex flex-col flex-1 overflow-hidden bg-bg">
        {/* Active Knowledge Source / Document Context Header */}
        {activeDocContext && (
          <div className="flex items-center justify-between px-6 py-2 bg-card2/80 border-b border-line text-[12px] flex-shrink-0">
            <div className="flex items-center gap-2 text-tx-2">
              <span className="w-2 h-2 rounded-full bg-amb animate-pulse" />
              <span className="text-tx-4">Active Document Context:</span>
              <span className="font-semibold text-tx-1 flex items-center gap-1.5 bg-card3 px-2 py-0.5 rounded border border-line">
                <FileText size={12} className="text-amb" />
                {activeDocContext.name}
              </span>
              {activeDocContext.size && <span className="text-tx-4 text-[11px]">({activeDocContext.size})</span>}
            </div>
            <button
              onClick={() => setActiveDocContext(null)}
              className="text-[11px] text-tx-4 hover:text-tx-2 hover:underline"
            >
              Clear Focus
            </button>
          </div>
        )}

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="absolute pointer-events-none">
                <div className="w-[500px] h-[500px] rounded-full bg-amb/[0.03] blur-3xl -translate-y-1/4" />
              </div>
              <h2 className="text-[22px] font-medium text-tx-1 mb-2 relative">
                {greeting}, <span className="text-amb-lt">{user?.role}.</span>
              </h2>
              <p className="text-[14px] text-tx-3 mb-10 relative">{t('howCanHelp')}</p>
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
                  {m.type === 'user'         && <UserMessage text={m.text} imageUrl={m.imageUrl} fileInfo={m.fileInfo} />}
                  {m.type === 'ai'           && <AiMessage response={m.response} />}
                  {m.type === 'img-analysis' && <ImageAnalysisMessage analysis={m.analysis} />}
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
            <div className="text-[12px] font-medium text-tx-1">{t('addDocument')}</div>
            <div className="text-[11px] text-tx-4">{t('addDocDesc')}</div>
          </div>
          <ChevronRight size={13} className="text-tx-4 group-hover:text-amb transition-colors" />
        </button>

        {/* Input area */}
        <div className="flex-shrink-0 bg-card border-t border-line px-[max(16px,calc(50%-400px))] py-3">

          {/* Pending File Attachment Pill (like ChatGPT) */}
          {pendingFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-md bg-card3 border border-line w-fit">
              <FileText size={15} className="text-amb" />
              <span className="text-[12px] font-medium text-tx-1">{pendingFile.name}</span>
              <span className="text-[10px] text-tx-4">({pendingFile.size})</span>
              <button onClick={() => setPendingFile(null)} className="p-0.5 hover:text-amb text-tx-4 ml-1">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Pending Image Attachment Pill */}
          {pendingImg && (
            <div className="flex items-center gap-2 mb-2 p-1.5 rounded-md bg-card3 border border-line w-fit">
              <img src={pendingImg} alt="Preview" className="w-8 h-8 object-cover rounded" />
              <span className="text-[12px] font-medium text-tx-1">Equipment Image</span>
              <button onClick={() => setPendingImg(null)} className="p-0.5 hover:text-amb text-tx-4 ml-1">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-lg px-3 py-2 bg-card2 border border-line focus-within:border-amb transition-colors">
            <textarea ref={taRef} rows={1} value={text}
              onChange={e => { setText(e.target.value); onInput(e) }}
              onKeyDown={onKey}
              placeholder={t('askPlaceholder')}
              className="flex-1 bg-transparent outline-none text-[13px] leading-relaxed max-h-[140px] text-tx-1 placeholder-tx-4"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              {[
                { icon: Paperclip, title: 'Attach file (PDF, DOCX, TXT)', accept: '.pdf,.docx,.txt,.csv,.md', onChange: handleFile, img: false },
                { icon: Image,     title: 'Upload image',                  accept: 'image/*',                  onChange: handleImg,  img: true  },
              ].map(({ icon: Icon, title, accept, onChange }) => (
                <label key={title} title={title} className="p-1.5 rounded cursor-pointer text-tx-4 hover:text-amb hover:bg-card3 transition-colors">
                  <input type="file" className="hidden" accept={accept} onChange={onChange} />
                  <Icon size={15} />
                </label>
              ))}
              <button title="Voice (coming soon)" className="p-1.5 rounded text-tx-4 hover:text-amb hover:bg-card3 transition-colors">
                <Mic size={15} />
              </button>
              <button onClick={send} disabled={!text.trim() && !pendingImg && !pendingFile}
                className="ml-1 p-2 rounded bg-amb hover:bg-amb-lt text-bg transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-amb-sm">
                <Send size={14} />
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-tx-4 mt-2">
            {t('disclaimer')}
          </p>
        </div>
      </div>

      <DocumentUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => {
          setUploadOpen(false)
          const prompt = `Please analyze the uploaded document "${doc.name}" and provide key technical insights.`
          send(prompt)
        }}
      />
    </div>
  )
}
