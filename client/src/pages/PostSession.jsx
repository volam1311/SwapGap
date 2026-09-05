import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { GpsPath } from '../components/ui.jsx'

export function PostSession() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [rating, setRating] = useState({ helpfulness: 5, clarity: 5, reliability: 5, respectfulness: 5, goalAchieved: true })
  const [rated, setRated] = useState(false)

  useEffect(() => {
    api(`/api/sessions/${id}/quiz`, { method: 'POST', body: { generate: true } }).then((data) => {
      setItems(data.items || [])
      setAnswers((data.items || []).map(() => ''))
    })
  }, [id])

  async function verify() {
    const data = await api(`/api/sessions/${id}/quiz`, { method: 'POST', body: { items, answers } })
    setResult(data)
  }

  async function sendRating() {
    await api(`/api/sessions/${id}/rate`, { method: 'POST', body: rating })
    setRated(true)
  }

  return (
    <div className="page stack">
      <h1 className="page-title">Prove it in a new situation</h1>
      {!result && (
        <div className="card pad stack">
          {items.map((item, i) => (
            <div key={item.id || i} className="stack">
              <p>
                <b>{item.prompt}</b>
              </p>
              {item.code && <pre className="code-block">{item.code}</pre>}
              <textarea value={answers[i] || ''} onChange={(e) => setAnswers((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} />
            </div>
          ))}
          <button className="btn btn-primary btn-lg" onClick={verify} disabled={!items.length}>
            Verify my understanding
          </button>
        </div>
      )}
      {result && (
        <>
          {result.passed && (
            <div className="card pad" style={{ background: '#e7f7ef' }}>
              <h2>{result.mastered} — Mastered</h2>
              <p>
                This is the success metric: after a 20-minute reciprocal swap, the gap moved from red to green
                on the Learning GPS.
              </p>
            </div>
          )}
          {!result.passed && (
            <div className="gap-banner">
              <h3>Still developing</h3>
              <p>Another short session is recommended before this concept turns green.</p>
            </div>
          )}
          <div className="card pad">
            <h3>Learning route</h3>
            <GpsPath
              path={(result.path || []).map((c) => ({
                id: c.id,
                name: c.name,
                status: c.status || 'next',
              }))}
            />
          </div>
          <div className="card pad">
            <h3>Where students struggle most</h3>
            <div className="heat" style={{ marginTop: 10 }}>
              {(result.cohort || []).map((c) => (
                <div className="heat-row" key={c.concept}>
                  <span>{c.concept}</span>
                  <div className="heat-bar">
                    <span style={{ width: `${Math.min(100, c.struggling)}%` }} />
                  </div>
                  <b>{c.struggling}</b>
                </div>
              ))}
            </div>
            <div className="grid-3" style={{ marginTop: 16 }}>
              <div className="card pad">68% mastery after support</div>
              <div className="card pad">{result.correct}/{result.total} transfer items correct</div>
              <div className="card pad">Anonymous cohort insight</div>
            </div>
          </div>
          <div className="card pad stack">
            <h3>Rate your peer</h3>
            <p style={{ color: '#5b6b7f' }}>
              Ratings count toward your end-of-semester Peer Teaching & Support certificate for a CV or
              LinkedIn. They reward good support — they do not certify professional tutors.
            </p>
            {['helpfulness', 'clarity', 'reliability', 'respectfulness'].map((k) => (
              <label className="field" key={k}>
                <span>{k}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={rating[k]}
                  onChange={(e) => setRating({ ...rating, [k]: Number(e.target.value) })}
                />
              </label>
            ))}
            <button className="btn btn-secondary" onClick={sendRating} disabled={rated}>
              {rated ? 'Thanks for the feedback' : 'Submit rating'}
            </button>
          </div>
          <div className="row">
            <Link className="btn btn-primary" to="/gps">
              Create targeted activity
            </Link>
            <Link className="btn btn-secondary" to="/certificate">
              Semester certificate
            </Link>
            <Link className="btn btn-secondary" to="/home">
              Back to dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
