import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Zap, Users, ShoppingBag, Settings, FileText, BarChart3, ArrowRight } from 'lucide-react'
import { useAppContext, emptyState } from '../../context/AppContext'
import { generateMockPrompts } from '../../data/mockPrompts'
import { generateMockTemplates } from '../../data/mockTemplates'
import { generateMockABTests } from '../../data/mockABTests'
import { generateMockAuditLog } from '../../data/mockAuditLog'
import './home.css'

const modules = [
  { to: '/', icon: Zap, label: 'Prompt Hub', color: '#3b82f6', desc: 'LLM Prompt 管理' },
  { to: '#', icon: Users, label: 'User Center', color: '#8b5cf6', desc: '用户管理' },
  { to: '#', icon: ShoppingBag, label: 'Products', color: '#10b981', desc: '商品管理' },
  { to: '#', icon: FileText, label: 'Content', color: '#f59e0b', desc: '内容管理' },
  { to: '#', icon: BarChart3, label: 'Analytics', color: '#ec4899', desc: '数据分析' },
  { to: '#', icon: Settings, label: 'Settings', color: '#6b7280', desc: '系统设置' },
]

export default function HomePage() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!state) {
      dispatch({
        type: 'INIT_STATE',
        payload: {
          ...emptyState,
          prompts: generateMockPrompts(),
          templates: generateMockTemplates(),
          abTests: generateMockABTests(),
          auditLog: generateMockAuditLog(),
        }
      })
    }
  }, [state, dispatch])

  return (
    <div>
      <h2 className="home-title">Modules</h2>
      <div className="home-grid">
        {modules.map(({ to, icon: Icon, label, color, desc }) => (
          <div
            key={label}
            className={`module-card${to === '#' ? ' module-card-disabled' : ''}`}
            onClick={() => to !== '#' && navigate(to)}
          >
            <div className="module-icon" style={{ background: `${color}15` }}>
              <Icon size={22} color={color} />
            </div>
            <div className="module-text">
              <span className="module-label">{label}</span>
              <span className="module-desc">{desc}</span>
            </div>
            <span className="module-arrow"><ArrowRight size={18} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}
