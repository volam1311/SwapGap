import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const STYLES = ['examples', 'visual', 'practice', 'discussion']
const PREFS = ['online', 'on-campus', 'either']
const SLOTS = [
  { id: 'today-18', label: 'Today — 6:00 pm' },
  { id: 'tomorrow-14', label: 'Tomorrow — 2:30 pm' },
  { id: 'friday-11', label: 'Later this week — 11:00 am' },
]

function looksGenerated(user) {
  const fromEmail = user?.email?.split('@')[0] || ''
  return !user?.name || user.name === fromEmail
}

export function Onboarding() {
  const { refresh, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: looksGenerated(user) ? '' : user?.name || '',
    university: user?.university || 'QUT',
    courseCode: user?.courseCode || 'IFB104',
    course: user?.course || 'Building IT Systems',
    learningStyle: user?.learningStyle || 'examples',
    preference: user?.preference || 'online',
    availability: ['today-18', 'tomorrow-14'],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggle(list, value) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const subject = [form.courseCode.trim(), form.course.trim()].filter(Boolean).join(' — ')
      await api('/api/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          university: form.university.trim(),
          courseCode: form.courseCode.trim(),
          course: form.course.trim(),
          subjects: subject ? [subject] : [],
          learningStyle: form.learningStyle,
          preference: form.preference,
          availability: form.availability,
          onboarded: true,
        },
      })
      await refresh()
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card pad auth-card stack" onSubmit={submit} style={{ width: 'min(560px, 100%)' }}>
        <h1>Set up your learning profile</h1>
        <p style={{ color: '#5b6b7f' }}>
          Add your name and unit so we can match you with peers in the same course. Strengths and gaps are
          found later, when you test your understanding.
        </p>
        {error && <div className="error">{error}</div>}
        <label className="field">
          <span>Preferred name</span>
          <input
            name="name"
            autoComplete="name"
            placeholder="Maya"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>University</span>
          <input
            name="university"
            placeholder="QUT"
            value={form.university}
            onChange={(e) => set('university', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Course code</span>
          <input
            name="courseCode"
            placeholder="IFB104"
            value={form.courseCode}
            onChange={(e) => set('courseCode', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Course name</span>
          <input
            name="course"
            placeholder="Building IT Systems"
            value={form.course}
            onChange={(e) => set('course', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Preferred learning style</span>
          <select value={form.learningStyle} onChange={(e) => set('learningStyle', e.target.value)}>
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Online or in-person</span>
          <select value={form.preference} onChange={(e) => set('preference', e.target.value)}>
            {PREFS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div>
          <span style={{ fontSize: 13, color: '#5b6b7f', fontWeight: 600 }}>Available session times</span>
          <div className="stack" style={{ marginTop: 8 }}>
            {SLOTS.map((s) => (
              <label key={s.id} className="choice">
                <input
                  type="checkbox"
                  checked={form.availability.includes(s.id)}
                  onChange={() => set('availability', toggle(form.availability, s.id))}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy || !form.name.trim()}>
          {busy ? 'Saving…' : 'Go to dashboard'}
        </button>
      </form>
    </div>
  )
}
