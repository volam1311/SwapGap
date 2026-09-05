import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getToken } from '../api.js'
import { Avatar } from '../components/ui.jsx'

export function Sessions() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api('/api/sessions').then(setData)
  }, [])
  if (!data) return <div className="page">Loading sessions…</div>
  return (
    <div className="page stack">
      <h1 className="page-title">Sessions</h1>
      {data.sessions.map((s) => (
        <Link key={s.id} to={`/sessions/${s.id}`} className="card pad" style={{ textDecoration: 'none' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>GapSwap with {s.partnerName}</h3>
              <p>
                {s.gapConcept} ↔ {s.teachConcept} · {s.status}
              </p>
            </div>
            <span className="tag">{new Date(s.startsAt).toLocaleString()}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    api(`/api/sessions/${id}`).then(setSession)
  }, [id])

  if (!session) return <div className="page">Loading session…</div>
  if (joined || session.status === 'live') {
    return <SessionRoom session={session} setSession={setSession} />
  }
  return <SessionConfirm session={session} onJoin={() => setJoined(true)} onCancel={async () => {
    await api(`/api/sessions/${id}/cancel`, { method: 'POST' })
    navigate('/sessions')
  }} />
}

function packFor(session, concept) {
  const ws = session.workspace || {}
  return ws.packs?.[concept] || ws.pack || {
    concept,
    source: 'Course-approved session pack',
    prompts: [],
    exercise: '',
    facilitatorJob: [],
    code: ws.code,
    annotation: ws.annotation,
    trace: ws.trace,
  }
}

function SessionConfirm({ session, onJoin, onCancel }) {
  const when = new Date(session.startsAt)
  const end = new Date(when.getTime() + session.durationMin * 60000)

  async function downloadIcs() {
    const res = await fetch(`/api/sessions/${session.id}/ics`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gapswap.ics'
    a.click()
  }

  return (
    <div className="page stack">
      <h1 className="page-title">Session confirmed</h1>
      <div className="grid-2">
        <div className="card pad stack">
          <h3>GapSwap with {session.peer.name}</h3>
          <p>
            {when.toLocaleDateString('en-AU', { weekday: 'long' })} · {when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–
            {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
          <p>{session.format === 'online' ? 'Online room' : 'On campus'}</p>
          <div className="row" style={{ justifyContent: 'center', margin: '12px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <Avatar name={session.you.name} color={session.you.color} size={64} />
              <p>You facilitate {session.youFacilitateConcept}</p>
            </div>
            <div className="arrow">↔</div>
            <div style={{ textAlign: 'center' }}>
              <Avatar name={session.peer.name} color={session.peer.color} size={64} />
              <p>They facilitate {session.peerFacilitateConcept}</p>
            </div>
          </div>
          <h3>Preparation</h3>
          <ul>
            {session.checklist.map((c) => (
              <li key={c}>✓ {c}</li>
            ))}
          </ul>
        </div>
        <div className="stack">
          <div className="card pad stack">
            <label className="field">
              <span>Reminder</span>
              <select defaultValue="15">
                <option value="15">15 minutes before</option>
                <option value="5">5 minutes before</option>
              </select>
            </label>
            <button className="btn btn-secondary" onClick={downloadIcs}>
              Add to calendar
            </button>
            <a className="btn btn-secondary" href={session.meetingUrl} target="_blank" rel="noreferrer">
              Open meeting link
            </a>
            <button className="btn btn-primary btn-lg" onClick={onJoin}>
              Join when ready
            </button>
            <button className="btn btn-danger" onClick={onCancel}>
              Cancel session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionRoom({ session, setSession }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [seconds, setSeconds] = useState(session.durationMin * 60)
  const [notes, setNotes] = useState(session.privateNotes)
  const [shared, setShared] = useState(session.notesShared)
  const [hint, setHint] = useState('')
  const [phase, setPhase] = useState(session.rolePhase || 'b_teaches')

  useEffect(() => {
    api(`/api/sessions/${session.id}`, { method: 'PATCH', body: { status: 'live' } })
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {})
  }, [session.id])

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const hostFacilitating = phase === 'a_teaches'
  const youFacilitate = session.youAreHost ? hostFacilitating : !hostFacilitating
  const currentConcept = youFacilitate ? session.youFacilitateConcept : session.peerFacilitateConcept
  const pack = packFor(session, currentConcept)
  const code = pack.code || session.workspace?.code || ''
  const annotation = pack.annotation || session.workspace?.annotation
  const trace = pack.trace?.length ? pack.trace : session.workspace?.trace

  async function askHint() {
    const res = await api(`/api/sessions/${session.id}/assistant`, {
      method: 'POST',
      body: { action: 'hint', notes: shared },
    })
    setHint(res.hint || res.prompt)
  }

  async function saveNotes() {
    const next = await api(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      body: { privateNotes: notes, notesShared: shared, rolePhase: phase },
    })
    setSession(next)
  }

  async function switchRoles() {
    const nextPhase = phase === 'a_teaches' ? 'b_teaches' : 'a_teaches'
    setPhase(nextPhase)
    await api(`/api/sessions/${session.id}`, { method: 'PATCH', body: { rolePhase: nextPhase } })
  }

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Scripted check
        </h1>
        <div className="row">
          <b>{mm}:{ss}</b>
          <a className="btn btn-secondary" href={session.meetingUrl} target="_blank" rel="noreferrer">
            Meeting link
          </a>
          <button className="btn btn-danger" onClick={() => navigate('/sessions')}>
            Leave session
          </button>
        </div>
      </div>
      <div className="session-grid">
        <div className="stack">
          <div className="video-row">
            <div className="video-tile">
              <video ref={videoRef} autoPlay muted playsInline />
              <span className="label">
                {session.you.name} · {youFacilitate ? 'Facilitating' : 'Explaining back'}
              </span>
            </div>
            <div className="video-tile">
              <Avatar name={session.peer.name} color={session.peer.color} size={56} />
              <span className="label">
                {session.peer.name} · {youFacilitate ? 'Explaining back' : 'Facilitating'}
              </span>
            </div>
          </div>
          <div className="card pad workspace">
            <p className="muted" style={{ marginBottom: 8 }}>
              {pack.source || 'Course-approved session pack'}
            </p>
            {code ? <pre className="code-block">{code}</pre> : <p className="muted">Worked example loads with the pack.</p>}
            {annotation && <div className="anno">{annotation}</div>}
            {trace?.length > 0 && (
              <table className="trace">
                <thead>
                  <tr>
                    <th>i</th>
                    <th>j</th>
                    <th>print</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.map((r, i) => (
                    <tr key={i}>
                      <td>{r.i}</td>
                      <td>{r.j}</td>
                      <td>{r.out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="tools">✎ ⌫ T ⬤ ↺ ↻</div>
          </div>
        </div>
        <div className="stack">
          <div className="card pad stack">
            <p>
              <b>Part {youFacilitate ? '1' : '2'} of 2</b> —{' '}
              {youFacilitate
                ? `${session.you.name} facilitates ${session.youFacilitateConcept}`
                : `${session.peer.name} facilitates ${session.peerFacilitateConcept}`}
            </p>
            <p className="muted">Peers do not draft the lesson. Run this pack, then verify.</p>
            <ol className="pack-steps">
              {(pack.prompts || []).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            {pack.exercise && (
              <p>
                <b>Exercise.</b> {pack.exercise}
              </p>
            )}
            {(pack.facilitatorJob || []).length > 0 && (
              <ul className="safety">
                {pack.facilitatorJob.map((job) => (
                  <li key={job}>{job}</li>
                ))}
              </ul>
            )}
            {hint && <p>{hint}</p>}
            <button className="btn btn-secondary" onClick={askHint}>
              Ask for a hint
            </button>
            <button className="btn btn-secondary" onClick={switchRoles}>
              Switch roles
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/sessions/${session.id}/check`)}>
              Ready to verify
            </button>
          </div>
          <div className="card pad stack">
            <label className="field">
              <span>Shared notes</span>
              <textarea value={shared} onChange={(e) => setShared(e.target.value)} />
            </label>
            <label className="field">
              <span>Private notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button className="btn btn-secondary" onClick={saveNotes}>
              Save notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
