import { AlertTriangle } from 'lucide-react'
import SourceCitation from './SourceCitation'

export function UserMessage({ text, imageUrl }) {
  return (
    <div className="flex flex-col gap-1.5 items-end">
      <span className="text-[10px] text-tx-4 px-0.5">You</span>
      {imageUrl && (
        <div className="rounded-lg overflow-hidden border border-line max-w-[220px]">
          <img src={imageUrl} alt="Uploaded" className="w-full block" />
        </div>
      )}
      {text && (
        <div className="max-w-[72%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed bg-card3 border border-line2 text-tx-1">
          {text}
        </div>
      )}
    </div>
  )
}

export function AiMessage({ response }) {
  if (!response) return null
  if (response.uncertain) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-amb px-0.5">Secra AI</span>
        <div className="max-w-[88%] rounded-lg px-4 py-3.5 text-[13px] leading-relaxed bg-card2 border border-line text-tx-1">
          <p className="font-medium text-tx-1 mb-2">I couldn't find enough reliable information.</p>
          <div className="bg-card3 rounded px-3 py-2.5 text-[12px] text-tx-2">
            No supporting information found in available documents.
            <div className="mt-2 font-medium text-tx-1">Recommended next step</div>
            <div className="mt-1 text-tx-3">Please upload the relevant SOP, manual, or inspection report.</div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-amb px-0.5">Secra AI</span>
      <div className="max-w-[88%] rounded-lg px-4 py-3.5 text-[13px] leading-relaxed bg-card2 border border-line text-tx-1">
        <div className="whitespace-pre-line mb-3 text-tx-1">{response.text}</div>
        {response.safety && (
          <div className="flex items-start gap-2 rounded px-3 py-2.5 text-[12px] mb-3 bg-card3 border border-line2 text-amb">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-amb" />
            <div><strong>Safety-critical.</strong> Verify with an authorized engineer or safety officer before action.</div>
          </div>
        )}
        {response.sources?.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-tx-3 mb-1.5">Sources</div>
            <div className="flex flex-wrap gap-1.5">
              {response.sources.map((s, i) => <SourceCitation key={i} source={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ImageAnalysisMessage() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-amb px-0.5">Secra AI</span>
      <div className="max-w-[88%] rounded-lg px-4 py-3.5 text-[13px] leading-relaxed bg-card2 border border-line text-tx-1">
        <p className="font-medium mb-2.5 text-amb-lt">Visual inspection</p>
        <p className="text-[12px] text-tx-3 mb-2">Possible observations:</p>
        <ul className="text-[12px] text-tx-2 space-y-1.5 mb-3">
          {['Surface corrosion visible — early-stage oxidation','Possible leakage around connection flange','No obvious structural crack visible'].map((o,i) => (
            <li key={i} className="flex gap-2"><span className="text-line2">·</span>{o}</li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-[12px] mb-3">
          <span className="text-tx-3">Confidence:</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-card3 text-amb border border-line2">Moderate</span>
        </div>
        <div className="bg-card3 rounded px-3 py-2.5 text-[12px] text-tx-2 mb-3">
          <strong className="text-tx-1">Recommended:</strong> Physical inspection per maintenance SOP required.
        </div>
        <div>
          <div className="text-[11px] font-semibold text-tx-3 mb-1.5">Supporting document</div>
          <SourceCitation source={{ name:'Equipment Inspection Manual', page:'Page 12', section:'Section 3.4' }} />
        </div>
      </div>
    </div>
  )
}

export function ThinkingMessage() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-amb px-0.5">Secra AI</span>
      <div className="w-fit rounded-lg px-4 py-3 flex items-center gap-2.5 text-[12px] italic bg-card2 border border-line text-tx-3">
        <div className="tdot flex gap-1">
          {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-line2 block" />)}
        </div>
        Looking through your documents…
      </div>
    </div>
  )
}
