import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import './layout.css'

export default function Layout() {
  return (
    <div>
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
