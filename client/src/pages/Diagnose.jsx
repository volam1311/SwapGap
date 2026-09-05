import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'

export function Diagnose() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [answer, setAnswer] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [confidence, setConfidence] = useState('Unsure')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [willing, setWilling] = useState([])

  useEffect(() => {
    api(`/api/diagnose/${id}`).then((row) => {
      if (row.complete || row.status === 'complete') {
        const offers = (row.teachOffers || []).map((o) => o.name)
        setWilling((row.alreadyTeaching || []).filter((name) => offers.includes(name)))
        setResult(row)
      } else {
        setData(row)
      }
    })
  }, [id])

  function toggle(name) {
    setWilling((list) => (list.includes(name) ? list.filter((x) => x !== name) : [...list, name]))
  }

  async function submit() {
    setBusy(true)
    try {
      const next = await api(`/api/diagnose/${id}/answer`, {
        method: 'POST',
        body: { answer, reasoning, confidence },
      })
      setAnswer('')
      setReasoning('')
      if (next.complete) {
        const already = next.alreadyTeaching || []
        const offers = (next.teachOffers || []).map((o) => o.name)
        setWilling(already.filter((name) => offers.includes(name)))
        setResult(next)
      } else {
        setData(next)
      }
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    try {
      const offers = (result.teachOffers || []).map((o) => o.name)
      const kept = (result.alreadyTeaching || []).filter((name) => !offers.includes(name))
      await api('/api/me', { method: 'PATCH', body: { teachable: [...kept, ...willing] } })
      navigate('/gps')
    } finally {
      setBusy(false)
    }
  }

  if (result?.complete || result?.status === 'complete') {
    const diagnosis = result.diagnosis || result.result || {}
    const offers = result.teachOffers || []
    const gap = diagnosis.gap?.concept || 'this concept'
    return (
      <div className="page stack">
        <h1 className="page-title">Here’s what we found</h1>
        <p className="page-sub">
          {result.courseCode ? `${result.courseCode} · ` : ''}
          The diagnostic evaluated your answers. You choose which strengths you are willing to facilitate.
        </p>
        <div className="gap-banner">
          <h3>Gap: {gap}</h3>
          <p style={{ marginTop: 8 }}>{diagnosis.gap?.misconception}</p>
        </div>
        <div className="card pad stack">
          <h3>Strengths we can see</h3>
          <p className="muted">
            These showed up as solid in this check. Tick any you are willing to facilitate for a peer.
          </p>
          {offers.length === 0 && <p>No verified facilitation topics yet — keep practising and we’ll ask again.</p>}
          {offers.map((o) => (
            <label key={o.id} className={`choice${willing.includes(o.name) ? ' active' : ''}`}>
              <input type="checkbox" checked={willing.includes(o.name)} onChange={() => toggle(o.name)} />
              <span>
                <b>{o.name}</b>
                <span> Willing to run a scripted check on this</span>
              </span>
            </label>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={finish} disabled={busy}>
          {busy ? 'Saving…' : 'See my Learning GPS'}
        </button>
      </div>
    )
  }

  if (!data) return <div className="page">Locating the gap…</div>
  const pct = Math.round((data.currentStep / data.totalSteps) * 100)

  return (
    <div className="page stack">
      <h1 className="page-title">Let’s locate the gap</h1>
      <p className="page-sub">
        {data.courseCode ? `${data.courseCode} · ` : ''}
        {data.question}
      </p>
      <div>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>
          Checkpoint {data.currentStep} of {data.totalSteps}
        </p>
        <div className="progress-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid-2">
        <div className="card pad stack">
          <p>{data.checkpoint.problem}</p>
          {data.checkpoint.code && <pre className="code-block">{data.checkpoint.code}</pre>}
        </div>
        <div className="card pad stack prompt-card">
          <b>Learning GPS asks</b>
          <p>{data.checkpoint.prompt}</p>
        </div>
      </div>
      <div className="card pad stack">
        <label className="field">
          <span>Your answer</span>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </label>
        <label className="field">
          <span>Explain your reasoning</span>
          <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
        </label>
        <div className="row">
          {['Guessing', 'Unsure', 'Confident'].map((c) => (
            <button key={c} type="button" className={`choice${confidence === c ? ' active' : ''}`} onClick={() => setConfidence(c)}>
              {c}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>{data.checkpoint.checking}</p>
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy || !answer}>
          Check my thinking
        </button>
      </div>
    </div>
  )
}
