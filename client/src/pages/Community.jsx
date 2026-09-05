import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Avatar } from '../components/ui.jsx'

export function Questions() {
  const [data, setData] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [concept, setConcept] = useState('')
  const [reply, setReply] = useState({})
  const [posted, setPosted] = useState('')

  async function load() {
    setData(await api('/api/questions'))
  }
  useEffect(() => {
    load()
  }, [])

  async function post(e) {
    e.preventDefault()
    const res = await api('/api/questions', { method: 'POST', body: { title, body, concept } })
    setTitle('')
    setBody('')
    setConcept('')
    setPosted(`Pinned ${res.concept || 'your question'} on your Learning GPS.`)
    load()
  }

  async function answer(id) {
    await api(`/api/questions/${id}/answers`, { method: 'POST', body: { body: reply[id] } })
    setReply((r) => ({ ...r, [id]: '' }))
    load()
  }

  if (!data) return <div className="page">Loading board…</div>
  return (
    <div className="page stack">
      <h1 className="page-title">Questions board</h1>
      <form className="card pad stack" onSubmit={post}>
        <h3>Ask asynchronously</h3>
        <p className="muted">Posting a question also places that topic on your Learning GPS.</p>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="What are you stuck on?" value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="field">
          <span>Topic (optional — we infer it if you leave this blank)</span>
          <select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option value="">Infer from my question</option>
            {(data.concepts || []).map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary">Post question</button>
        {posted && <p>{posted}</p>}
      </form>
      {data.questions.map((q) => (
        <div className="card pad stack" key={q.id}>
          <div className="row">
            <Avatar name={q.authorName} color={q.authorColor} />
            <div>
              <h3>{q.title}</h3>
              <small>
                {q.authorName} {q.concept ? `· ${q.concept}` : ''}
              </small>
            </div>
          </div>
          <p>{q.body}</p>
          {q.answers.map((a) => (
            <div key={a.id} className="card pad">
              <b>{a.authorName}</b>
              <p>{a.body}</p>
            </div>
          ))}
          <div className="row">
            <input
              style={{ flex: 1 }}
              placeholder="Write a reply"
              value={reply[q.id] || ''}
              onChange={(e) => setReply((r) => ({ ...r, [q.id]: e.target.value }))}
            />
            <button className="btn btn-secondary" type="button" onClick={() => answer(q.id)}>
              Reply
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Profile() {
  const { refresh } = useAuth()
  const [dash, setDash] = useState(null)
  const [form, setForm] = useState(null)

  useEffect(() => {
    api('/api/me/dashboard').then((d) => {
      setDash(d)
      setForm({
        name: d.user.name,
        university: d.user.university || '',
        courseCode: d.user.courseCode || '',
        course: d.user.course || '',
        bio: d.user.bio || '',
        learningStyle: d.user.learningStyle,
        preference: d.user.preference,
        teachable: (d.teachable || []).join(', '),
      })
    })
  }, [])

  if (!form || !dash) return <div className="page">Loading profile…</div>

  async function save(e) {
    e.preventDefault()
    await api('/api/me', {
      method: 'PATCH',
      body: {
        ...form,
        teachable: form.teachable.split(',').map((s) => s.trim()).filter(Boolean),
      },
    })
    await refresh()
  }

  return (
    <div className="page stack">
      <h1 className="page-title">Profile</h1>
      <form className="card pad stack" onSubmit={save}>
        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          <span>University</span>
          <input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
        </label>
        <label className="field">
          <span>Course code</span>
          <input value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} />
        </label>
        <label className="field">
          <span>Course name</span>
          <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </label>
        <label className="field">
          <span>Learning style</span>
          <input value={form.learningStyle} onChange={(e) => setForm({ ...form, learningStyle: e.target.value })} />
        </label>
        <label className="field">
          <span>Session preference</span>
          <input value={form.preference} onChange={(e) => setForm({ ...form, preference: e.target.value })} />
        </label>
        <label className="field">
          <span>Skills you can teach</span>
          <input value={form.teachable} onChange={(e) => setForm({ ...form, teachable: e.target.value })} />
        </label>
        <p className="muted" style={{ fontSize: 13 }}>
          These are suggested after a diagnostic. Only keep topics you are willing to teach a peer.
        </p>
        <button className="btn btn-primary">Save profile</button>
      </form>
      <div className="card pad">
        <h3>Reputation</h3>
        <p>Reliability {dash.stats.reliability} · {dash.stats.sessionsCompleted} sessions · {dash.stats.ratingsCount} ratings</p>
        <div className="tags" style={{ marginTop: 10 }}>
          {dash.stats.badges.map((b) => (
            <span className="tag" key={b.id}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <div className="card pad stack">
        <h3>Employability credential</h3>
        <p className="muted">
          {dash.certificate?.eligible
            ? `${dash.certificate.title} for ${dash.certificate.term} is ready to add to your CV and LinkedIn.`
            : 'Teach or support a peer this semester to earn a certificate you can put on a CV or LinkedIn.'}
        </p>
        <Link className="btn btn-primary" to="/certificate">
          {dash.certificate?.eligible ? 'View certificate' : 'See how to earn it'}
        </Link>
      </div>
      <p className="muted">Email is hidden from other students. Contact details are never shown publicly.</p>
    </div>
  )
}

export function Settings() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const [hide, setHide] = useState(true)
  const [target, setTarget] = useState('alex')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    setHide(user?.privacyHideContact !== false)
  }, [user])

  async function savePrivacy() {
    await api('/api/me', { method: 'PATCH', body: { privacyHideContact: hide } })
    await refresh()
    setDone('Privacy updated')
  }

  async function report(block) {
    await api('/api/reports', { method: 'POST', body: { targetId: target, reason, block } })
    setDone(block ? 'Peer blocked' : 'Report sent')
  }

  return (
    <div className="page stack">
      <h1 className="page-title">Settings</h1>
      <div className="card pad stack">
        <h3>Privacy</h3>
        <label className="choice">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          Hide my email from other students
        </label>
        <button className="btn btn-primary" onClick={savePrivacy}>
          Save privacy
        </button>
      </div>
      <div className="card pad stack">
        <h3>Report or block</h3>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="alex">Alex T.</option>
          <option value="priya">Priya S.</option>
          <option value="jordan">Jordan L.</option>
        </select>
        <textarea placeholder="What happened?" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="row">
          <button className="btn btn-secondary" onClick={() => report(false)}>
            Report
          </button>
          <button className="btn btn-danger" onClick={() => report(true)}>
            Report and block
          </button>
        </div>
      </div>
      {done && <p>{done}</p>}
      <button
        className="btn btn-secondary"
        onClick={() => {
          logout()
          navigate('/')
        }}
      >
        Log out
      </button>
    </div>
  )
}

export function Help() {
  return (
    <div className="page stack">
      <h1 className="page-title">Help & support</h1>
      <div className="card pad stack">
        <h3>Community guidelines</h3>
        <p>Be respectful. Stay on the learning goal. Do not share assessment answers that would constitute academic misconduct.</p>
        <p>
          <b>Peer guidance is not official academic advice.</b> GapSwap matches students to help each other understand
          concepts. It does not replace your lecturer, tutor, or university support services.
        </p>
        <p>You can cancel a session, leave the room, or report a peer at any time from Settings.</p>
      </div>
      <div className="card pad stack">
        <h3>What we measure</h3>
        <p>Diagnostic completed, GPS gap identified, session finished, transfer quiz passed. Booked time is not success.</p>
      </div>
      <div className="card pad stack">
        <h3>Limits, risks and next 90 days</h3>
        <p>
          Matching is heuristic and works best inside one unit. Video, SSO and a full whiteboard are stand-ins.
          Fairness risk: popular students could be over-requested — reliability and reciprocal swaps reduce that.
        </p>
        <p>
          Next: QUT SSO, more first-year units after IFB104, a tutor dashboard of anonymous cohort gaps, and
          live session tools. Accessibility: text-first flow, captions via the meeting link, report/block always
          available.
        </p>
      </div>
      <div className="card pad stack">
        <h3>Semester certificate</h3>
        <p>
          If you teach or support peers, GapSwap issues a Peer Teaching & Support certificate for the teaching
          period (for example Semester 2, 2026). You can print it, copy a CV bullet, or add it to LinkedIn.
          It is evidence of peer support, not a QUT award or professional teaching qualification.
        </p>
      </div>
      <div className="card pad">
        <h3>University verification</h3>
        <p>Accounts with a university email (for example .edu.au) are marked as verified. Full SSO is planned.</p>
      </div>
    </div>
  )
}
