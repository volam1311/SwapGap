import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { Brand, Icon, TopBar } from './ui.jsx'

const primary = [
  { to: '/home', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover Gaps', icon: 'search' },
  { to: '/gps', label: 'Learning GPS', icon: 'gps' },
  { to: '/match', label: 'Find a Match', icon: 'swap' },
  { to: '/sessions', label: 'Sessions', icon: 'calendar' },
  { to: '/questions', label: 'Questions', icon: 'chat' },
]

const utility = [
  { to: '/certificate', label: 'Certificate', icon: 'certificate' },
  { to: '/payment', label: 'Payment', icon: 'card' },
  { to: '/help', label: 'Help & support', icon: 'help' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

const tabs = [
  { to: '/home', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover', icon: 'search' },
  { to: '/match', label: 'Match', icon: 'swap' },
  { to: '/certificate', label: 'Certs', icon: 'certificate' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

const sidebarBrand = {
  className: 'mx-1.5 mb-4 block rounded-lg bg-white px-3.5 py-3 leading-none no-underline',
  logoClassName: 'block h-auto max-h-12 w-full object-contain',
}

function navClass(isActive) {
  return [
    'flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium no-underline transition-colors',
    isActive ? 'bg-white/10 text-white!' : 'text-[#c5d4e8]! hover:bg-white/10 hover:text-white!',
  ].join(' ')
}

function NavItems({ items, onNavigate }) {
  return items.map((l) => (
    <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
      <span className="grid size-[18px] shrink-0 place-items-center opacity-80">
        <Icon name={l.icon} size={18} />
      </span>
      {l.label}
    </NavLink>
  ))
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  function goToLogin() {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="grid min-h-svh grid-cols-1 bg-paper print:block nav:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col overflow-y-auto overscroll-contain bg-navy p-3 pt-[18px] text-[#d7e3f3] print:hidden nav:flex">
        <Brand to="/home" {...sidebarBrand} />
        <nav className="grid gap-0.5" aria-label="Main">
          <NavItems items={primary} />
        </nav>
        <div className="mt-2.5 grid gap-0.5 border-t border-white/10 pt-2.5">
          <NavItems items={utility} />
        </div>
      </aside>
      <div className="min-w-0 bg-paper print:p-0">
        <TopBar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
        {menuOpen && (
          <button
            className="fixed inset-0 z-30 border-0 bg-[rgba(14,39,68,0.46)] p-0 nav:hidden print:hidden"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <div
          id="mobile-nav"
          className={[
            'fixed top-14 bottom-0 left-0 z-40 flex w-[min(300px,86vw)] flex-col overflow-y-auto bg-navy p-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-[#d7e3f3] shadow-[12px_0_40px_rgba(8,22,40,0.28)] transition-transform duration-200 nav:hidden print:hidden',
            menuOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-[105%]',
          ].join(' ')}
          inert={menuOpen ? undefined : true}
        >
          <Brand to="/home" {...sidebarBrand} />
          <nav className="grid gap-0.5" aria-label="All pages">
            <NavItems items={primary} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="mt-2.5 grid gap-0.5 border-t border-white/10 pt-2.5">
            <NavItems items={utility} onNavigate={() => setMenuOpen(false)} />
            <button className={navClass(false)} type="button" onClick={goToLogin}>
              <span className="grid size-[18px] shrink-0 place-items-center opacity-80">
                <Icon name="logout" size={18} />
              </span>
              Log out
            </button>
          </div>
        </div>
        <Outlet />
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around gap-0.5 border-t border-navy-2 bg-navy px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] nav:hidden print:hidden"
          aria-label="Primary"
        >
          {tabs.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 text-[11px] font-semibold tracking-tight whitespace-nowrap no-underline [-webkit-tap-highlight-color:transparent]',
                  isActive ? 'bg-white/10 text-white!' : 'text-[#9fb3cc]! hover:text-white!',
                ].join(' ')
              }
            >
              <Icon name={l.icon} size={20} />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
