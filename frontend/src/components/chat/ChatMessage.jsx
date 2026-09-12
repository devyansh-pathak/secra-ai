import { AlertTriangle, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import SourceCitation from './SourceCitation'

export function UserMessage({ text, imageUrl, fileInfo }) {
  return (
    <div className="flex flex-col gap-1.5 items-end">
      <span className="text-[10px] text-tx-4 px-0.5">You</span>
      {imageUrl && (
        <div className="rounded-lg overflow-hidden border border-line max-w-[220px]">
          <img src={imageUrl} alt="Uploaded" className="w-full block" />
        </div>
      )}
      {fileInfo && (
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-card3 border border-line max-w-[320px]">
          <div className="w-8 h-8 rounded bg-card4 flex items-center justify-center flex-shrink-0 text-amb">
            <FileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-tx-1 truncate">{fileInfo.name}</div>
            <div className="text-[10px] text-tx-4">{fileInfo.size || 'Document attached'}</div>
          </div>
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
        
        {/* Rich ChatGPT-style Markdown Renderer */}
        <div className="text-[13px] leading-relaxed mb-3 text-tx-1 space-y-2">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-[16px] font-bold text-amb-lt pb-1.5 border-b border-line mb-2 mt-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-[14px] font-semibold text-tx-1 pb-1 border-b border-line mb-2 mt-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[13px] font-semibold text-amb mt-3 mb-1.5">{children}</h3>,
              h4: ({ children }) => <h4 className="text-[12px] font-semibold text-tx-2 mt-2 mb-1 uppercase tracking-wider">{children}</h4>,
              p: ({ children }) => <p className="mb-2 text-[13px] leading-relaxed text-tx-1">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2 text-tx-2 text-[12.5px]">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2 text-tx-2 text-[12.5px]">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-amb-lt">{children}</strong>,
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-lg border border-line bg-card3 shadow-sm">
                  <table className="w-full text-left text-[12px] border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-card4 text-[11px] font-semibold uppercase tracking-wider text-amb border-b border-line">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-line/60">{children}</tbody>,
              tr: ({ children }) => <tr className="hover:bg-card2/50 transition-colors">{children}</tr>,
              th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
              td: ({ children }) => <td className="px-3 py-2 text-tx-2">{children}</td>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amb bg-card3 px-3 py-2 rounded-r my-2 text-[12px] text-tx-2 italic">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => <code className="bg-card4 text-amb-lt px-1.5 py-0.5 rounded text-[11px] font-mono border border-line">{children}</code>
            }}
          >
            {response.text}
          </ReactMarkdown>
        </div>

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

export function ImageAnalysisMessage({ analysis }) {
  const obs = analysis?.observations || [
    'Surface corrosion visible — early-stage oxidation',
    'Possible leakage around connection flange',
    'No obvious structural crack visible'
  ]
  const conf = analysis?.confidence || 'Moderate (84%)'
  const rec = analysis?.recommendation || 'Physical inspection per maintenance SOP required.'
  const src = analysis?.supporting_source || { name: 'Equipment Inspection Manual', page: 'Page 12', section: 'Section 3.4' }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-amb px-0.5">Secra AI</span>
      <div className="max-w-[88%] rounded-lg px-4 py-3.5 text-[13px] leading-relaxed bg-card2 border border-line text-tx-1">
        <p className="font-medium mb-2.5 text-amb-lt">{analysis?.title || 'Visual inspection'}</p>
        <p className="text-[12px] text-tx-3 mb-2">Key observations:</p>
        <ul className="text-[12px] text-tx-2 space-y-1.5 mb-3">
          {obs.map((o, i) => (
            <li key={i} className="flex gap-2"><span className="text-line2">·</span>{o}</li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-[12px] mb-3">
          <span className="text-tx-3">Confidence:</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-card3 text-amb border border-line2">{conf}</span>
        </div>
        <div className="bg-card3 rounded px-3 py-2.5 text-[12px] text-tx-2 mb-3">
          <strong className="text-tx-1">Recommended:</strong> {rec}
        </div>
        <div>
          <div className="text-[11px] font-semibold text-tx-3 mb-1.5">Supporting document</div>
          <SourceCitation source={src} />
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
        Analyzing document and extracting insights…
      </div>
    </div>
  )
}
