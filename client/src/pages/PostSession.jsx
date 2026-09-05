import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { GpsPath } from '../components/ui.jsx'

export function PostSession() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

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

  async function copyProfile() {
    const e = result?.escalation || {}
    const evidence = e.evidence || {}
    const text = [
      `GapSwap diagnostic profile for Student Success`,
      `Concept: ${e.concept || result?.peerConcept || 'unknown'}`,
      `Misconception: ${e.misconception || ''}`,
      evidence.prediction ? `Prediction: ${evidence.prediction}` : '',
      evidence.reasoning ? `Reasoning: ${evidence.reasoning}` : '',
      evidence.confidence ? `Confidence: ${evidence.confidence}` : '',
      `Transfer check: ${result.correct}/${result.total} — status unchanged.`,
    ]
      .filter(Boolean)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
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
            <div className="card pad success-card">
              <h2>{result.mastered} — Mastered</h2>
              <p>
                This is the success metric: after a scripted check, the gap moved from red to green on the
                Learning GPS.
              </p>
              <p className="muted" style={{ marginTop: 8 }}>
                This pass is recorded against {result.peerName || 'your peer'}’s {result.peerConcept || 'concept'}{' '}
                transfer-check pass rate.
              </p>
            </div>
          )}
          {!result.passed && (
            <>
              <div className="gap-banner">
                <h3>Still developing</h3>
                <p>The concept status does not change. This outcome is also a signal about the session.</p>
              </div>
              <div className="card pad stack escalate-card">
                <h3>Escalate to Student Success</h3>
                <p className="muted">
                  GapSwap filters foundational gaps. This check did not transfer — send the diagnostic
                  profile to a trained tutor rather than another unscripted peer session.
                </p>
                <p>
                  <b>Concept.</b> {result.escalation?.concept || result.peerConcept}
                </p>
                <p>
                  <b>Misconception.</b> {result.escalation?.misconception}
                </p>
                {result.escalation?.evidence?.prediction && (
                  <p>
                    <b>Prediction.</b> {result.escalation.evidence.prediction}
                  </p>
                )}
                {result.escalation?.evidence?.reasoning && (
                  <p>
                    <b>Reasoning.</b> {result.escalation.evidence.reasoning}
                  </p>
                )}
                {result.escalation?.whyItMatters && (
                  <p>
                    <b>Why it matters.</b> {result.escalation.whyItMatters}
                  </p>
                )}
                <p className="muted" style={{ fontSize: 13 }}>
                  Recorded against {result.peerName || 'your peer'}’s {result.peerConcept || 'concept'} pass rate.
                </p>
                <button className="btn btn-primary" onClick={copyProfile}>
                  {copied ? 'Diagnostic profile copied' : 'Copy diagnostic profile'}
                </button>
              </div>
            </>
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
          <div className="row">
            <Link className="btn btn-primary" to="/gps">
              Back to Learning GPS
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
