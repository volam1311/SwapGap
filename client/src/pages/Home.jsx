import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Home() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api('/api/me/dashboard').then(setData)
  }, [])
  if (!data) return <div className="page">Loading…</div>
  const session = data.upcoming?.[0]
  const when = session ? new Date(session.startsAt) : null

  const uni = data.user.university || 'QUT'
  const course = data.user.courseCode || 'IFB104'

  return (
    <div className="page stack">
      <div>
        <h1 className="page-title">
          {greeting()}, {data.user.name} 👋
        </h1>
        <p className="page-sub">
          {uni} · {course} {data.user.course ? `— ${data.user.course}` : ''} · verified .edu.au peer learning
        </p>
      </div>
      <div className="metric-strip">
        <div className="card metric">
          <small>Mastered</small>
          <strong>{data.counts?.mastered ?? 0}</strong>
        </div>
        <div className="card metric">
          <small>Open gaps</small>
          <strong>{data.counts?.gap ?? 0}</strong>
        </div>
        <div className="card metric">
          <small>Verified swaps</small>
          <strong>{data.stats.sessionsCompleted}</strong>
        </div>
        <div className="card metric">
          <small>Success metric</small>
          <strong style={{ fontSize: 16, lineHeight: 1.25 }}>GPS gap → green</strong>
        </div>
      </div>
      <div className="grid-2">
        <div className="card pad hero-card">
          <div style={{ fontSize: 36, color: '#1d4e89' }}>◎</div>
          <h2>Find your next knowledge gap</h2>
          <p style={{ color: '#5b6b7f', margin: '-6px 0 14px' }}>
            Tutors cannot sit with every first-year student. Diagnose why you are stuck, then swap with a peer
            in the same unit.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/discover">
              Discover my gaps
            </Link>
            <Link className="btn btn-secondary" to="/discover">
              Continue diagnostic
            </Link>
          </div>
        </div>
        <div className="stack">
          <div className="card course-card">
            <small>Current course</small>
            <h3>
              {course} — {data.user.course}
            </h3>
            <Link to="/gps">View course</Link>
          </div>
          {session && (
            <div className="card pad">
              <small style={{ color: '#5b6b7f' }}>Upcoming session</small>
              <h3>GapSwap with {session.partnerName}</h3>
              <p>
                {when.toLocaleDateString('en-AU', { weekday: 'long' })} ·{' '}
                {when.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
              </p>
              <Link className="btn btn-primary" to={`/sessions/${session.id}`} style={{ marginTop: 10 }}>
                Open session
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="grid-2">
        <div className="card pad">
          <h3>Recommended next action</h3>
          <p style={{ color: '#5b6b7f', margin: '8px 0 12px' }}>
            Nested loops is the IFB104 bottleneck. Diagnose it, swap with a peer, then prove the gap closed.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/gps">
              Open Learning GPS
            </Link>
            <Link className="btn btn-secondary" to="/match">
              Find a match
            </Link>
          </div>
        </div>
        <div className="card pad">
          <h3>Skills you can teach</h3>
          {(data.teachable || []).length ? (
            <div className="tags" style={{ marginTop: 10 }}>
              {data.teachable.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: '#5b6b7f', marginTop: 10 }}>
              None yet. After a diagnostic, GapSwap will ask if you are willing to teach a verified strength.
            </p>
          )}
          <p style={{ marginTop: 12, color: '#5b6b7f' }}>
            {data.stats.sessionsCompleted} completed sessions · reliability {data.stats.reliability}
          </p>
        </div>
      </div>
    </div>
  )
}
