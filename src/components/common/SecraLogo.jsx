export default function SecraLogo({ size = 26 }) {
  return (
    <div className="rounded flex items-center justify-center flex-shrink-0 bg-card3 border border-line"
      style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 22 22" fill="none">
        <path d="M11 2L4.5 5v5c0 4.2 2.8 8.1 6.5 9 3.7-.9 6.5-4.8 6.5-9V5L11 2z"
          stroke="#C89A5A" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 10.5c0-1.1.9-2 2-2h.5c1.1 0 2-.9 2-2S13.6 4.5 12.5 4.5h-3"
          stroke="#C89A5A" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M14 12c0 1.1-.9 2-2 2h-.5c-1.1 0-2 .9-2 2"
          stroke="#C89A5A" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
