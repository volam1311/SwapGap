import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand" style={{ color: '#0e2744', margin: 0 }}>
          <span className="brand-mark" style={{ borderColor: '#1d4e89', color: '#1d4e89' }}>
            ⇄
          </span>
          GapSwap
        </div>
        <div className="row">
          <Link className="btn btn-secondary" to="/login">
            Log in
          </Link>
          <Link className="btn btn-primary" to="/signup">
            Sign up
          </Link>
        </div>
      </nav>
      <section className="hero-copy">
        <div>
          <p className="page-kicker">Built for Australian first-year IT · QUT IFB104</p>
          <h1>Find the exact gap. Swap the knowledge. Prove you improved.</h1>
          <p style={{ fontSize: 18, color: '#5b6b7f', maxWidth: 560 }}>
            Large first-year units share a handful of tutors. Students get stuck, then ask ChatGPT for the
            assignment answer. GapSwap diagnoses the misconception, matches a peer in the same course, and
            checks whether the gap actually closed.
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn btn-primary" to="/signup">
              Create a student profile
            </Link>
            <Link className="btn btn-secondary" to="/login">
              Demo as Maya
            </Link>
          </div>
          <div className="loop">
            <div>1. Diagnose the misconception — not just the wrong answer</div>
            <div>2. See it on a Learning GPS</div>
            <div>3. Match with a peer who can swap knowledge</div>
            <div>4. Verify improvement with a post-session check</div>
          </div>
        </div>
        <div className="card pad">
          <h3>The learning loop</h3>
          <p style={{ color: '#5b6b7f', margin: '8px 0 16px' }}>
            Diagnosis → pathway → human support → verified improvement
          </p>
          <GpsMini />
          <p style={{ marginTop: 16, fontSize: 14, color: '#5b6b7f' }}>
            Success is the red node turning green after a transfer quiz — not a session booked. Coming later:
            live two-way video, calendar sync, university SSO, and a full whiteboard. This demo uses a meeting
            link, structured session room, and an in-app calendar file.
          </p>
        </div>
      </section>
      <section className="landing-proof">
        <div className="card pad">
          <h3>The Australian problem</h3>
          <p>
            First-year IT cohorts at universities like QUT are hundreds of students wide. Tutorials cannot
            diagnose every stuck student, and generic AI tutors create academic-integrity risk.
          </p>
        </div>
        <div className="card pad">
          <h3>How we measure success</h3>
          <p>
            Diagnostic completed → gap on the GPS → reciprocal 20-minute swap → transfer quiz passed. The
            metric is mastery movement, not time on the platform.
          </p>
        </div>
        <div className="card pad">
          <h3>Human oversight</h3>
          <p>
            AI locates the gap. A verified .edu.au peer teaches. GapSwap never writes assessment answers, and
            it does not replace lecturers, tutors, or official support.
          </p>
        </div>
      </section>
    </div>
  )
}

function GpsMini() {
  const nodes = [
    ['Variables', 'mastered'],
    ['Functions', 'mastered'],
    ['Loops', 'developing'],
    ['Nested loops', 'gap'],
    ['Lists', 'next'],
  ]
  return (
    <div className="gps">
      {nodes.map(([name, status], i) => (
        <div key={name} style={{ display: 'flex', flex: i < 4 ? 1 : 'none', alignItems: 'center' }}>
          <div className={`gps-node ${status}`}>
            <div className="orb">{status === 'mastered' ? '✓' : status === 'gap' ? '!' : status === 'developing' ? '~' : '→'}</div>
            <small>{name}</small>
          </div>
          {i < 4 && <div className="gps-line" />}
        </div>
      ))}
    </div>
  )
}
