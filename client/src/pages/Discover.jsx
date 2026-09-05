import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const MAYA_QUESTION = 'Why does the inner loop restart every time?'

function courseLabel(code, name) {
  return [code, name].filter(Boolean).join(' — ')
}

export function Discover() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const isMaya = user?.id === 'maya' || user?.email === 'maya@qut.edu.au'
  const savedCode = user?.courseCode || ''
  const savedName = user?.course || ''
  const hasSaved = Boolean(savedCode || savedName)
  const [mode, setMode] = useState('stuck')
  const [courseMode, setCourseMode] = useState(hasSaved ? 'current' : 'new')
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [question, setQuestion] = useState(isMaya ? MAYA_QUESTION : '')
  const [notes, setNotes] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const usingCode = courseMode === 'current' ? savedCode : courseCode.trim()
  const usingName = courseMode === 'current' ? savedName : courseName.trim()
  const usingLabel = courseLabel(usingCode, usingName)
  const savedLabel = courseLabel(savedCode, savedName)

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function start() {
    setError('')
    if (!usingCode && !usingName) {
      setError('Choose your current unit or enter a new one.')
      return
    }
    if (!question.trim()) {
      setError('Add a question or something you want to test.')
      return
    }
    setBusy(true)
    try {
      if (courseMode === 'new') {
        const subjects = [...(user?.subjects || [])]
        if (usingLabel && !subjects.includes(usingLabel)) subjects.push(usingLabel)
        await api('/api/me', {
          method: 'PATCH',
          body: {
            courseCode: usingCode,
            course: usingName,
            subjects,
            onboarded: true,
          },
        })
        await refresh()
      }
      const data = await api('/api/diagnose/start', {
        method: 'POST',
        body: {
          mode,
          question,
          notes,
          imageDataUrl,
          courseCode: usingCode,
          course: usingName,
        },
      })
      navigate(`/diagnose/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page stack">
      <h1 className="page-title">What would you like to understand?</h1>
      <p className="page-sub">
        Pick the unit this question belongs to, then we’ll locate the misconception.
      </p>
      <div className="grid-2">
        <button
          className={`choice${courseMode === 'current' ? ' active' : ''}`}
          onClick={() => setCourseMode('current')}
          disabled={!hasSaved}
          type="button"
        >
          <b>Use my current unit</b>
          <span>{hasSaved ? savedLabel : 'No unit saved yet — enter one below.'}</span>
        </button>
        <button
          className={`choice${courseMode === 'new' ? ' active' : ''}`}
          onClick={() => setCourseMode('new')}
          type="button"
        >
          <b>Enter a different unit</b>
          <span>Test something from another course you are taking.</span>
        </button>
      </div>
      {courseMode === 'new' && (
        <div className="card pad stack">
          <label className="field">
            <span>Course code</span>
            <input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="IFB104"
            />
          </label>
          <label className="field">
            <span>Course name</span>
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Building IT Systems"
            />
          </label>
        </div>
      )}
      <div className="grid-2">
        <button className={`choice${mode === 'stuck' ? ' active' : ''}`} onClick={() => setMode('stuck')} type="button">
          <b>I’m stuck on something</b>
          <span>Ask about a question you cannot get past.</span>
        </button>
        <button className={`choice${mode === 'test' ? ' active' : ''}`} onClick={() => setMode('test')} type="button">
          <b>Test my understanding</b>
          <span>We’ll evaluate strengths and gaps from your explanation.</span>
        </button>
      </div>
      <div className="card pad stack">
        <p className="muted">
          {usingLabel ? (
            <>
              Diagnosing for <b>{usingLabel}</b>
            </>
          ) : (
            'Choose a unit above before you start.'
          )}
        </p>
        <label className="field">
          <span>{mode === 'stuck' ? 'Your question' : 'Explain what you think you know'}</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Why does my function print None instead of returning a value?"
          />
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
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              setNotes((n) => n || (isMaya ? 'Lecture: nested for-loops and trace tables.' : 'Lecture notes from this week.'))
            }
          >
            Add lecture notes
          </button>
        </div>
        {imageDataUrl && <img src={imageDataUrl} alt="Uploaded work" style={{ maxHeight: 160, borderRadius: 12 }} />}
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-lg" onClick={start} disabled={busy || !question.trim() || !usingLabel}>
          {busy ? 'Starting diagnosis…' : 'Start diagnosis'}
        </button>
      </div>
    </div>
  )
}
