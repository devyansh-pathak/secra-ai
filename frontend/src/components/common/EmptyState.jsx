export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      {Icon && <Icon size={36} className="text-line2 mb-1" />}
      <h3 className="text-[15px] font-medium text-tx-2">{title}</h3>
      {description && <p className="text-[12px] text-tx-3 max-w-[260px] leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}
