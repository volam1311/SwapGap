import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { GpsPath } from '../components/ui.jsx'

export function Gps() {
  const [data, setData] = useState(null)
  const [lesson, setLesson] = useState(null)

  useEffect(() => {
    api('/api/gps').then(setData)
  }, [])

  async function socratic() {
    const res = await api('/api/matches/socratic', { method: 'POST', body: { topic: data?.current } })
    setLesson(res)
  }

  if (!data) return <div className="page">Building your route…</div>
  const d = data.diagnosis
  const gap = d?.gap
  const course = data.courseCode || 'IFB104'

  return (
    <div className="page stack">
      <h1 className="page-title">Your route to mastery</h1>
      <p className="page-sub">
        {data.mapped
          ? 'Success is this node turning green after a verified swap — not a session booked.'
          : 'This fills in when you diagnose a misconception or ask a question.'}
      </p>
      <div className="card pad">
        <GpsPath path={data.path} />
      </div>

      {gap ? (
        <>
          <div className="gap-banner">
            <h3>Knowledge gap detected{gap.concept ? `: ${gap.concept}` : ''}</h3>
            <p style={{ marginTop: 8 }}>{gap.misconception}</p>
            <p style={{ marginTop: 8 }}>
              <b>Why this matters for {course}.</b> {gap.whyItMatters}
            </p>
          </div>
          <div className="evidence">
            <div className="card">
              <h4>Prediction</h4>
              <p>{d.evidence?.prediction}</p>
            </div>
            <div className="card">
              <h4>Reasoning</h4>
              <p>{d.evidence?.reasoning}</p>
            </div>
            <div className="card">
              <h4>Confidence</h4>
              <p>{d.evidence?.confidence}</p>
            </div>
          </div>
          <div className="card pad stack">
            <h3>Personalised plan</h3>
            <p>
              <b>Already knows:</b> {data.plan?.alreadyKnows}
            </p>
            <p>
              <b>Misunderstood:</b> {data.plan?.misunderstood}
            </p>
            <p>
              <b>Learn first:</b> {data.plan?.learnFirst}
            </p>
            <p>{data.plan?.explanation}</p>
            <ul>
              {(data.plan?.practice || []).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          <div className="row">
            <button className="btn btn-secondary" onClick={socratic}>
              Guided challenge
            </button>
            <a className="btn btn-secondary" href="https://pythontutor.com/" target="_blank" rel="noreferrer">
              Review example
            </a>
            <Link className="btn btn-secondary" to="/match">
              Learn with a peer
            </Link>
          </div>
          {lesson && (
            <div className="card pad stack">
              <h3>{lesson.title}</h3>
              {(lesson.steps || []).map((s) => (
                <p key={s.ask}>
                  <b>{s.ask}</b> — {s.hint}
                </p>
              ))}
            </div>
          )}
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={socratic} style={{ flex: 1 }}>
              Start guided practice
            </button>
            <Link className="btn btn-secondary btn-lg" to="/match" style={{ flex: 1 }}>
              Schedule a GapSwap
            </Link>
          </div>
        </>
      ) : data.fromQuestion ? (
        <div className="card pad stack">
          <h3>Pinned from your question</h3>
          <p>
            You asked about <b>{data.fromQuestion.concept || data.fromQuestion.title}</b>. Run a short diagnostic
            to turn that into a confirmed gap and a practice plan.
          </p>
          <p style={{ color: '#5b6b7f' }}>{data.fromQuestion.title}</p>
          <div className="row">
            <Link className="btn btn-primary" to="/discover">
              Diagnose this gap
            </Link>
            <Link className="btn btn-secondary" to="/questions">
              Back to questions
            </Link>
          </div>
        </div>
      ) : data.mapped ? (
        <div className="card pad stack">
          <h3>{data.current || 'A topic'} is on your map</h3>
          <p style={{ color: '#5b6b7f' }}>
            Finish a diagnostic so we can name the misconception, or keep asking questions to add more nodes.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/discover">
              Continue diagnostic
            </Link>
            <Link className="btn btn-secondary" to="/questions">
              Ask a question
            </Link>
          </div>
        </div>
      ) : (
        <div className="card pad stack">
          <h3>Nothing mapped yet</h3>
          <p style={{ color: '#5b6b7f' }}>
            Start a diagnostic with a question you are stuck on, or post on the questions board. Either one places a
            node on your Learning GPS.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/discover">
              Discover my gaps
            </Link>
            <Link className="btn btn-secondary" to="/questions">
              Ask a question
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
