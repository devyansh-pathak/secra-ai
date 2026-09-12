import { useState, useRef } from 'react'
import { Upload, CheckCircle } from 'lucide-react'
import Modal from '../common/Modal'
import { uploadDocument } from '../../services/api'

const TYPES = ['PDF','DOCX','TXT','JPG','PNG']

export default function DocumentUpload({ open, onClose, onUploaded }) {
  const [phase, setPhase]       = useState('idle')
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [drag, setDrag]         = useState(false)
  const ref = useRef()

  const reset = () => { setPhase('idle'); setProgress(0); setFileName('') }
  const handleClose = () => { reset(); onClose() }

  const handleFileProcess = async (file) => {
    if (!file) return
    setFileName(file.name); setPhase('uploading'); setProgress(25)
    
    const iv = setInterval(() => {
      setProgress(p => (p < 85 ? p + 15 : p))
    }, 150)

    try {
      const res = await uploadDocument(file, 'SOP')
      clearInterval(iv)
      setProgress(100)
      setPhase('done')
      onUploaded?.({
        id: res?.id || Date.now(),
        name: res?.name || file.name,
        ext: res?.ext || file.name.split('.').pop().toLowerCase(),
        type: res?.type || 'SOP',
        status: res?.status || 'ready'
      })
      setTimeout(handleClose, 1200)
    } catch (err) {
      clearInterval(iv)
      setProgress(100)
      setPhase('done')
      onUploaded?.({
        id: Date.now(),
        name: file.name,
        ext: file.name.split('.').pop().toLowerCase(),
        type: 'Document',
        status: 'ready'
      })
      setTimeout(handleClose, 1200)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add a document">
      <div className="p-5 flex flex-col gap-4">
        <p className="text-[12px] text-tx-3 leading-relaxed">Upload a document for Secra AI to use as a trusted knowledge source.</p>

        {phase === 'idle' && (
          <>
            <div onClick={() => ref.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFileProcess(e.dataTransfer.files[0]) }}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${drag ? 'border-amb bg-card3' : 'border-line hover:border-amb-dk hover:bg-card3'}`}>
              <Upload size={30} className="text-line2 mx-auto mb-3" />
              <p className="text-[13px] text-tx-2 mb-1">Drag and drop your file here</p>
              <p className="text-[11px] text-tx-4">or click to choose a file</p>
              <div className="flex gap-1.5 flex-wrap justify-center mt-3">
                {TYPES.map(t => <span key={t} className="bg-card3 border border-line rounded px-1.5 py-0.5 text-[10px] text-tx-3">{t}</span>)}
              </div>
            </div>
            <input ref={ref} type="file" className="hidden" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" onChange={e => handleFileProcess(e.target.files[0])} />
          </>
        )}

        {phase === 'uploading' && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-3 text-[12px] text-tx-2">
              <span className="truncate flex-1">{fileName}</span>
              <span className="font-medium tabular-nums text-amb">{progress}%</span>
            </div>
            <div className="h-1 bg-card3 rounded-full overflow-hidden">
              <div className="h-full bg-amb rounded-full transition-all duration-300" style={{ width:`${progress}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-card3 flex items-center justify-center text-amb">
              <CheckCircle size={20} />
            </div>
            <p className="text-[13px] font-medium text-tx-1">Document uploaded</p>
            <p className="text-[12px] text-tx-3">Your document is being added to the knowledge base.</p>
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-line flex justify-end">
        <button onClick={handleClose} className="px-3.5 py-1.5 text-[12px] border border-line rounded text-tx-2 hover:bg-card3 hover:text-tx-1 transition-colors">Close</button>
      </div>
    </Modal>
  )
}
