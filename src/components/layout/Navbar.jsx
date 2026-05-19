import { useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import './layout.css'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="navbar-hamburger" onClick={() => navigate('/')}>
          <Menu size={20} />
        </button>
        <div className="navbar-logo" onClick={() => navigate('/')}>
          Tipsy Admin
        </div>
      </div>
      <div className="navbar-right">
        <button className="navbar-link">
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </nav>
  )
}
