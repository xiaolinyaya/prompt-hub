import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = '暂无数据', description, action }) {
  return (
    <div className="empty-state">
      <Icon size={48} strokeWidth={1} />
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
