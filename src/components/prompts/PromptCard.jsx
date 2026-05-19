import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import StatusBadge from '../shared/StatusBadge'
import { formatRelativeTime } from '../../utils/dateFormatter'

export default function PromptCard({ prompt }) {
  const navigate = useNavigate()

  return (
    <div className="prompt-card" onClick={() => navigate(`/prompts/${prompt.id}`)}>
      <div className="prompt-card-header">
        <h3 className="prompt-card-name">{prompt.name}</h3>
        <StatusBadge status={prompt.status} />
      </div>
      <p className="prompt-card-desc">{prompt.description}</p>
      <div className="prompt-card-tags">
        {prompt.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        {prompt.tags?.length > 3 && (
          <span className="tag">+{prompt.tags.length - 3}</span>
        )}
      </div>
      <div className="prompt-card-meta">
        <span>{prompt.variables?.length || 0} 个变量</span>
        <span>v{prompt.versions?.[0]?.versionNumber || 1}</span>
        <span>{formatRelativeTime(prompt.updatedAt)}</span>
      </div>
      <div className="prompt-card-env">
        {prompt.environments?.prod?.versionId && <span className="env-badge prod">PROD</span>}
        {prompt.environments?.test?.versionId && <span className="env-badge test">TEST</span>}
        {prompt.environments?.dev?.versionId && <span className="env-badge dev">DEV</span>}
      </div>
    </div>
  )
}
