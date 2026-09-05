import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import logo from '../assets/logo-lockup.png'

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
        🔔
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
        <span className="mark">✓</span>
        {counts?.mastered ?? 0} Mastered
      </div>
      <div className="card stat amber">
        <span className="mark">~</span>
        {counts?.developing ?? 0} Developing
      </div>
      <div className="card stat red">
        <span className="mark">!</span>
        {counts?.knowledgeGaps ?? counts?.gap ?? 0} Knowledge gaps
      </div>
    </div>
  )
}

export function GpsPath({ path = [] }) {
  const icon = (status) => {
    if (status === 'mastered') return '✓'
    if (status === 'developing') return '~'
    if (status === 'gap') return '!'
    if (status === 'unmapped') return '○'
    return '→'
  }
  return (
    <div className="gps">
      {path.map((node, i) => (
        <div key={node.id || node.name} style={{ display: 'flex', flex: i < path.length - 1 ? 1 : 'none', alignItems: 'center' }}>
          <div className={`gps-node ${node.status || 'next'}`}>
            <div className="orb">{icon(node.status)}</div>
            <small>{node.name}</small>
          </div>
          {i < path.length - 1 && <div className="gps-line" />}
        </div>
      ))}
    </div>
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
