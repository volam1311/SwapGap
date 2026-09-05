import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export function Discover() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('stuck')
  const [question, setQuestion] = useState('Why does the inner loop restart every time?')
  const [notes, setNotes] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const courseLabel = [user?.courseCode, user?.course].filter(Boolean).join(' — ') || 'IFB104 — Building IT Systems'

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function start() {
    setBusy(true)
    try {
      const data = await api('/api/diagnose/start', {
        method: 'POST',
        body: { mode, question, notes, imageDataUrl },
      })
      navigate(`/diagnose/${data.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page stack">
      <h1 className="page-title">What would you like to understand?</h1>
      <p className="page-sub">
        {courseLabel}. We locate the misconception and, if you are strong on a topic, we ask whether you will teach it.
      </p>
      <div className="grid-2">
        <button className={`choice${mode === 'stuck' ? ' active' : ''}`} onClick={() => setMode('stuck')}>
          <b>I’m stuck on something</b>
          <span>Ask about a question you cannot get past.</span>
        </button>
        <button className={`choice${mode === 'test' ? ' active' : ''}`} onClick={() => setMode('test')}>
          <b>Test my understanding</b>
          <span>We’ll evaluate strengths and gaps from your explanation.</span>
        </button>
      </div>
      <div className="card pad stack">
        <p style={{ color: '#5b6b7f' }}>
          Using your enrolled unit: <b>{courseLabel}</b>
        </p>
        <label className="field">
          <span>{mode === 'stuck' ? 'Your question' : 'Explain what you think you know'}</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <label className="field">
          <span>Working / lecture notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste working or an attempted solution" />
        </label>
        <div className="row">
          <label className="btn btn-secondary">
            Upload file
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
          <button className="btn btn-secondary" type="button" onClick={() => setNotes((n) => n || 'Lecture: nested for-loops and trace tables.')}>
            Add lecture notes
          </button>
        </div>
        {imageDataUrl && <img src={imageDataUrl} alt="Uploaded work" style={{ maxHeight: 160, borderRadius: 12 }} />}
        <button className="btn btn-primary btn-lg" onClick={start} disabled={busy}>
          {busy ? 'Starting diagnosis…' : 'Start diagnosis'}
        </button>
      </div>
    </div>
  )
}
