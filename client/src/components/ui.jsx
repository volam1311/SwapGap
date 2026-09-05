import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import logo from '../assets/logo-lockup.png'

const ICONS = {
  check: <path d="M5 12.2 9.5 16.6 19 7" />,
  progress: (
    <>
      <circle cx="12" cy="12" r="7" opacity="0.32" />
      <path d="M12 5a7 7 0 0 1 6.1 10" />
    </>
  ),
  alert: (
    <>
      <path d="M12 7.5v6" />
      <circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h13" />
      <path d="M13.5 6.5 19 12l-5.5 5.5" />
    </>
  ),
  empty: <circle cx="12" cy="12" r="6.5" />,
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6.5 10.5V19h4v-5h3v5h4v-8.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 4 4" />
    </>
  ),
  gps: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 6.2 14.7 15.4 12 13.2 9.3 15.4Z" fill="currentColor" stroke="none" />
    </>
  ),
  swap: (
    <>
      <path d="M7 8h10" />
      <path d="M14 5l3 3-3 3" />
      <path d="M17 16H7" />
      <path d="M10 13l-3 3 3 3" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 11h16" />
    </>
  ),
  chat: (
    <>
      <path d="M5 16.5V9a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 9v4.5a3.5 3.5 0 0 1-3.5 3.5H10L5 20z" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16h11" />
      <path d="M12 4a5 5 0 0 0-5 5v3.2L5.4 16h13.2L17 12.2V9a5 5 0 0 0-5-5z" />
      <path d="M10 16.2a2 2 0 0 0 4 0" />
    </>
  ),
  pencil: <path d="M13.2 5.3 18.7 10.8 9 20.5H3.5V15zM11.4 7.1l5.5 5.5" />,
  erase: <path d="M6 16.5 14.5 8l3 3L9 19.5H6zM8.2 14.3l3 3" />,
  type: (
    <>
      <path d="M5 7h14" />
      <path d="M12 7v11" />
      <path d="M8.5 18h7" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />,
  undo: <path d="M8 8H4.5v3.5M4.8 10.8A7 7 0 1 1 6 17" />,
  redo: <path d="M16 8h3.5v3.5M19.2 10.8A7 7 0 1 0 18 17" />,
}

export function Icon({ name, size = 18, stroke }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke ?? (size >= 20 ? 2.3 : 1.95)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export function StatusGlyph({ status, size = 18 }) {
  const name =
    status === 'mastered' ? 'check' : status === 'developing' ? 'progress' : status === 'gap' ? 'alert' : status === 'unmapped' ? 'empty' : 'arrow'
  return <Icon name={name} size={size} />
}

export function Brand({ to = '/' }) {
  const img = <img src={logo} alt="GapSwap" className="brand-logo" />
  if (!to) return <div className="brand">{img}</div>
  return (
    <Link to={to} className="brand">
      {img}
    </Link>
  )
}

export function Avatar({ name, color, size = 34 }) {
  return (
    <span className="avatar" style={{ background: color || '#7c5cbf', width: size, height: size }}>
      {(name || 'S').trim()[0].toUpperCase()}
    </span>
  )
}

export function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState({ unread: 0, notifications: [] })

  function goToLogin() {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    api('/api/notifications')
      .then(setNotes)
      .catch(() => {})
    const t = setInterval(() => {
      api('/api/notifications')
        .then(setNotes)
        .catch(() => {})
    }, 12000)
    return () => clearInterval(t)
  }, [])

  async function markAll() {
    await api('/api/notifications/read', { method: 'POST', body: {} })
    setNotes((n) => ({ ...n, unread: 0, notifications: n.notifications.map((x) => ({ ...x, read: true })) }))
  }

  return (
    <header className="topbar">
      <button className="bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Icon name="bell" size={18} />
        {notes.unread > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="notif-pop">
          <div className="row pad" style={{ justifyContent: 'space-between' }}>
            <b>Notifications</b>
            <button className="btn btn-ghost" onClick={markAll}>
              Mark read
            </button>
          </div>
          {notes.notifications.length === 0 && <div className="pad">You are all caught up.</div>}
          {notes.notifications.map((n) => (
            <Link key={n.id} to={n.link || '/home'} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => setOpen(false)}>
              <b>{n.title}</b>
              <small>{n.body}</small>
            </Link>
          ))}
        </div>
      )}
      <Link to="/profile" className="who" style={{ textDecoration: 'none' }}>
        <Avatar name={user?.name} color={user?.avatarColor} />
        {user?.name}
      </Link>
      <button className="btn btn-ghost" type="button" onClick={goToLogin}>
        Log in
      </button>
    </header>
  )
}

export function StatusPills({ counts }) {
  return (
    <div className="grid-3">
      <div className="card stat green">
        <span className="mark">
          <StatusGlyph status="mastered" size={13} />
        </span>
        {counts?.mastered ?? 0} Mastered
      </div>
      <div className="card stat amber">
        <span className="mark">
          <StatusGlyph status="developing" size={13} />
        </span>
        {counts?.developing ?? 0} Developing
      </div>
      <div className="card stat red">
        <span className="mark">
          <StatusGlyph status="gap" size={13} />
        </span>
        {counts?.knowledgeGaps ?? counts?.gap ?? 0} Knowledge gaps
      </div>
    </div>
  )
}

export function GpsPath({ path = [] }) {
  return (
    <ol className="gps">
      {path.map((node, i) => {
        const status = node.status || 'next'
        const last = i === path.length - 1
        return (
          <li key={node.id || node.name} className={`gps-step${last ? ' last' : ''}`}>
            <div className={`gps-node ${status}`}>
              <div className="orb">
                <StatusGlyph status={status} size={20} />
              </div>
              <small>{node.name}</small>
            </div>
            {!last && <div className={`gps-line ${status}`} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

export function SafetyNote() {
  return (
    <div className="card pad">
      <h3>Safety and oversight</h3>
      <ul className="safety">
        <li>Same-course matching · verified .edu.au where possible</li>
        <li>AI diagnoses; the pack explains; a peer checks understanding</li>
        <li>Report, leave, or hide contact anytime</li>
        <li>Failed checks escalate to Student Success — we do not replace tutors</li>
      </ul>
    </div>
  )
}
