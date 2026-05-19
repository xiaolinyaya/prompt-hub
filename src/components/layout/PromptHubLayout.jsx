import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FileText, GitBranch, Clock } from 'lucide-react'
import './layout.css'

const sidebarItems = [
  { path: '/', icon: FileText, label: 'Prompts', exact: true },
  { path: '/ab-tests', icon: GitBranch, label: 'AB Tests' },
  { path: '/history', icon: Clock, label: 'History' },
]

export default function PromptHubLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(item) {
    if (item.exact) {
      return location.pathname === '/' || location.pathname.startsWith('/prompts')
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <div className="hub-layout">
      <aside className="hub-sidebar">
        <div className="hub-sidebar-title">Prompt Hub</div>
        <nav className="hub-sidebar-nav">
          {sidebarItems.map(({ path, icon: Icon, label, exact }) => (
            <button
              key={path}
              className={`hub-sidebar-item${isActive({ path, exact }) ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="hub-content">
        <Outlet />
      </div>
    </div>
  )
}
