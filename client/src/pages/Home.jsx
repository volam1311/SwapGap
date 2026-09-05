import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Icon } from '../components/ui.jsx'

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
  const course = data.user.courseCode || ''
  const courseName = data.user.course || ''
  const courseLabel = [course, courseName].filter(Boolean).join(' — ')
  const gapNode = data.gps?.find((c) => c.status === 'gap')
  const hasGap = Boolean(gapNode || data.counts?.gap)

  return (
    <div className="page stack">
      <div>
        <h1 className="page-title">
          {greeting()}, {data.user.name} 👋
        </h1>
        <p className="page-sub">
          {uni}
          {courseLabel ? ` · ${courseLabel}` : ''} · verified .edu.au peer checks
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
          <small>Verified checks</small>
          <strong>{data.stats.sessionsCompleted}</strong>
        </div>
        <div className="card metric">
          <small>Success metric</small>
          <strong style={{ fontSize: 16, lineHeight: 1.25 }}>GPS gap → green</strong>
        </div>
      </div>
      <div className="grid-2">
        <div className="card pad hero-card">
          <div className="hero-icon">
            <Icon name="search" size={18} />
          </div>
          <h2>Find your next knowledge gap</h2>
          <p className="muted" style={{ margin: '-6px 0 14px' }}>
            Tutors cannot sit with every students. Diagnose why you are stuck, then run a scripted
            check with a peer in the same unit.
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
            <h3>{courseLabel || 'No unit yet'}</h3>
            <Link to={courseLabel ? '/gps' : '/discover'}>{courseLabel ? 'View course' : 'Choose a unit'}</Link>
          </div>
          {session && (
            <div className="card pad">
              <small>Upcoming session</small>
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
          <p className="muted" style={{ margin: '8px 0 12px' }}>
            {gapNode
              ? `${gapNode.name} is on your GPS. Diagnose it if you have not, run a scripted peer check, then prove the gap closed.`
              : hasGap
                ? 'You have an open gap. Open Learning GPS to see it, then run a scripted check and prove it closed.'
                : 'Start a diagnostic or ask a question to place your first gap on the Learning GPS.'}
          </p>
          <div className="row">
            <Link className="btn btn-primary" to={hasGap ? '/gps' : '/discover'}>
              {hasGap ? 'Open Learning GPS' : 'Discover my gaps'}
            </Link>
            <Link className="btn btn-secondary" to="/questions">
              Ask a question
            </Link>
          </div>
        </div>
        <div className="card pad">
          <h3>Concepts you can facilitate</h3>
          {(data.teachable || []).length ? (
            <div className="tags" style={{ marginTop: 10 }}>
              {data.teachable.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>
              None yet. After a diagnostic, GapSwap will ask if you are willing to run a scripted check on a
              verified strength.
            </p>
          )}
          <p className="muted" style={{ marginTop: 12 }}>
            {data.stats.sessionsCompleted} completed sessions · reliability {data.stats.reliability}
          </p>
        </div>
      </div>
      <div className="card pad stack">
        <h3>End-of-semester credential</h3>
        <p className="muted">
          {data.certificate?.eligible
            ? `${data.certificate.title} for ${data.certificate.term} is ready. Add it to LinkedIn or copy a CV bullet.`
            : 'Facilitate a scripted check on a topic you already understand to earn a Peer Teaching & Support certificate for this semester.'}
        </p>
        <Link className="btn btn-secondary" to="/certificate" style={{ alignSelf: 'start' }}>
          {data.certificate?.eligible ? 'Open certificate' : 'Employability certificate'}
        </Link>
      </div>
    </div>
  )
}
