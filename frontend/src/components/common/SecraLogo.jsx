import logoImg from '../../assets/secra-logo.jpg'

export default function SecraLogo({ size = 26, className = "" }) {
  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-amb/40 shadow-sm bg-black ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoImg}
        alt="Secra AI Logo"
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/secra-logo.jpg'
        }}
      />
    </div>
  )
}
