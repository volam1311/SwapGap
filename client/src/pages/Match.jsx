import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { Avatar, Icon, SafetyNote } from '../components/ui.jsx'

const MODES = [
  { id: 'swap', label: 'Knowledge swap' },
  { id: 'help', label: 'Peer help' },
  { id: 'group', label: 'Study group' },
  { id: 'mentor', label: 'Mentor match' },
  { id: 'async', label: 'Async question' },
]

export function Match() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('swap')
  const [data, setData] = useState(null)
  const [picked, setPicked] = useState(null)
  const [slotId, setSlotId] = useState('today-18')
  const [format, setFormat] = useState('online')
  const [busy, setBusy] = useState(false)
  const [queued, setQueued] = useState(false)

  useEffect(() => {
    setPicked(null)
    api(`/api/matches?mode=${mode}`).then((res) => {
      setData(res)
      setPicked(res.matches?.[0] || null)
      if (res.slots?.[0]) setSlotId(res.slots[0].id)
    })
  }, [mode])

  async function confirm() {
    setBusy(true)
    try {
      if (mode === 'async') {
        navigate('/questions')
        return
      }
      if (!picked) {
        await api('/api/matches', { method: 'POST', body: { gapConcept: data.youNeed, mode } })
        setQueued(true)
        return
      }
      const res = await api('/api/matches', {
        method: 'POST',
        body: {
          partnerId: picked.userId,
          mode,
          gapConcept: data.youNeed,
          teachConcept: data.youCanTeach,
          slotId,
          format,
        },
      })
      navigate(`/sessions/${res.sessionId}`)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <div className="page">Finding compatible peers…</div>

  return (
    <div className="page stack">
      <h1 className="page-title">Schedule a scripted check</h1>
      <p className="page-sub">Same unit, complementary gaps, overlapping Australian evening / class times. Two-way is preferred; one-way is still valid.</p>
      <div className="row">
        {MODES.map((m) => (
          <button key={m.id} className={`choice${mode === m.id ? ' active' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="swap-heads">
        <div className="card">You need a check on: <b>{data.youNeed || 'Not mapped yet'}</b></div>
        <div className="arrow">
          <Icon name="swap" size={20} />
        </div>
        <div className="card">You can facilitate: <b>{data.youCanTeach || 'After a diagnostic'}</b></div>
      </div>
      {!data.youNeed && (
        <div className="card pad stack">
          <h3>Map a gap first</h3>
          <p className="muted">
            Matching uses your Learning GPS. Diagnose a misconception or ask a question so we know what you need.
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => navigate('/discover')}>
              Discover my gaps
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/questions')}>
              Ask a question
            </button>
          </div>
        </div>
      )}

      {mode === 'async' ? (
        <div className="card pad">
          <h3>Asynchronous help</h3>
          <p>Post your gap on the questions board. Peers can answer later.</p>
          <button className="btn btn-primary" onClick={() => navigate('/questions')} style={{ marginTop: 12 }}>
            Open questions board
          </button>
        </div>
      ) : (
        <div className="grid-2">
          <div className="stack">
            <h3>Best match for you</h3>
            {(data.matches || []).slice(0, 4).map((m) => (
              <button key={m.userId} className={`match-card${picked?.userId === m.userId ? ' active' : ''}`} onClick={() => setPicked(m)}>
                <Avatar name={m.name} color={m.avatarColor} />
                <div>
                  <b>{m.name}</b>
                  <div className="match-trust">
                    {m.verified ? <span>Concept verified</span> : <span>Not yet verified</span>}
                    <span>{m.sessionsOnConcept || 0} sessions on this concept</span>
                    <span>{m.passRate != null ? `${m.passRate}% pass rate` : 'No pass rate yet'}</span>
                    <span>{m.onTimeRate != null ? `${m.onTimeRate}% on time` : 'On-time n/a'}</span>
                  </div>
                  <div className="tags" style={{ marginTop: 6 }}>
                    {m.reasons.map((r) => (
                      <span className="tag" key={r}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="score">{m.score}%</div>
              </button>
            ))}
            {(!data.matches || data.matches.length === 0) && (
              <div className="card pad empty-fallback">
                <h3>No peer is free right now</h3>
                <p>We will never leave you on an empty page. Queue, study with AI, or post asynchronously.</p>
                <button className="btn btn-primary" onClick={confirm}>
                  Join matching queue
                </button>
              </div>
            )}
          </div>
          <div className="stack">
            <div className="card pad">
              <h3>Choose a time</h3>
              <div className="radio-list" style={{ marginTop: 8 }}>
                {(data.slots || []).map((s) => (
                  <label key={s.id}>
                    <input type="radio" checked={slotId === s.id} onChange={() => setSlotId(s.id)} />
                    {s.label}
                  </label>
                ))}
              </div>
              <h3 style={{ marginTop: 16 }}>Format</h3>
              <div className="radio-list" style={{ marginTop: 8 }}>
                <label>
                  <input type="radio" checked={format === 'online'} onChange={() => setFormat('online')} />
                  Online room
                </label>
                <label>
                  <input type="radio" checked={format === 'on-campus'} onChange={() => setFormat('on-campus')} />
                  On campus
                </label>
              </div>
            </div>
            <div className="card pad">
              <h3>Agenda · 20 minutes</h3>
              <p>10 min scripted check on {data.youCanTeach || 'your strength'}</p>
              <p>10 min scripted check on {data.youNeed || 'your gap'}</p>
            </div>
            <SafetyNote />
            <button className="btn btn-primary btn-lg" onClick={confirm} disabled={busy}>
              Confirm session
            </button>
            {queued && <p>You are in the queue — we will notify you when a helper is free.</p>}
            <div className="card pad">
              <h3>If nobody is free</h3>
              <p>{data.fallback.socratic.title}</p>
              <button className="btn btn-secondary" onClick={() => navigate('/gps')} style={{ marginTop: 8 }}>
                Start AI-guided lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
