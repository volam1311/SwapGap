import { NavLink, Outlet } from 'react-router-dom'
import { TopBar } from './ui.jsx'

const links = [
  { to: '/home', label: 'Home', icon: '⌂' },
  { to: '/discover', label: 'Discover Gaps', icon: '?' },
  { to: '/gps', label: 'Learning GPS', icon: '◎' },
  { to: '/match', label: 'Find a Match', icon: '⇄' },
  { to: '/sessions', label: 'Sessions', icon: '▣' },
  { to: '/questions', label: 'Questions', icon: '✎' },
]

export function AppShell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/home" className="brand">
          <span className="brand-mark">⇄</span>
          GapSwap
        </NavLink>
        <nav className="nav-list">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/help" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Help & support
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Settings
          </NavLink>
        </div>
      </aside>
      <div className="main">
        <TopBar />
        <Outlet />
      </div>
    </div>
  )
}
