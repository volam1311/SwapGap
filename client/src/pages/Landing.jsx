import { Link } from 'react-router-dom'
import { Brand, GpsPath } from '../components/ui.jsx'

export function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Brand />
          <div className="row">
            <Link className="btn btn-ghost" to="/login">
              Log in
            </Link>
            <Link className="btn btn-primary" to="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </nav>
      <section className="hero-copy">
        <p className="page-kicker">Built for Australian students</p>
        <h1>
          Find the exact gap.
          <br />
          Route the cheapest sufficient help.
          <br />
          <span className="hero-grad">Prove you improved.</span>
        </h1>
        <p className="hero-lead">
          Large first-year units share a handful of tutors. Students get stuck, then ask ChatGPT for the
          assignment answer. GapSwap diagnoses the missing concept, routes a scripted peer check or official
          support, and proves whether the gap closed.
        </p>
        <div className="row">
          <Link className="btn btn-primary" to="/signup">
            Create a student profile
          </Link>
          <Link className="btn btn-secondary" to="/login">
            Demo Maya / Alex
          </Link>
        </div>
      </section>
      <section className="landing-preview">
        <div className="card pad product-frame">
          <h3>The learning loop</h3>
          <p className="muted" style={{ margin: '8px 0 16px' }}>
            Diagnosis → cheapest sufficient support → human checker → verified improvement
          </p>
          <GpsMini />
          <p className="product-note">
            Success is the red node turning green after a transfer quiz - not a session booked. Coming later:
            live two-way video, calendar sync, university SSO, and a full whiteboard. This demo uses a meeting
            link, a scripted session pack, and an in-app calendar file.
          </p>
        </div>
      </section>
      <section className="loop">
        <div className="loop-step">
          <b>01</b>
          <span>Diagnose the misconception — not just the wrong answer</span>
        </div>
        <div className="loop-step">
          <b>02</b>
          <span>Locate it on a Learning GPS</span>
        </div>
        <div className="loop-step">
          <b>03</b>
          <span>Match with a peer for a reciprocal knowledge swap</span>
        </div>
        <div className="loop-step">
          <b>04</b>
          <span>Verify the gain with a post-session check</span>
        </div>
      </section>
      <section className="landing-proof">
        <div className="card pad">
          <h3>The Australian problem</h3>
          <p>
          First-year IT cohorts at universities like QUT run hundreds of students deep. Tutorials can't diagnose every student who's stuck - and generic AI tutors introduce academic-integrity risk.
          </p>
        </div>
        <div className="card pad">
          <h3>How we measure success</h3>
          <p>
          Diagnostic completed → gap mapped on the GPS → 20-minute reciprocal swap → transfer quiz passed. The metric is mastery movement, not time on the platform.
          </p>
        </div>
        <div className="card pad">
          <h3>Human oversight</h3>
          <p>
          AI locates the gap. A verified .edu.au email peer teaches it. SwapGap never writes assessment answers, and it never replaces lecturers, tutors, or official support.
          </p>
        </div>
        <div className="card pad">
          <h3>Employability</h3>
          <p>
          Verified peer teaching earns a semester certificate for a CV or LinkedIn — proof of communication and support skills, not a university award.
          </p>
        </div>
      </section>
    </div>
  )
}

function GpsMini() {
  return (
    <GpsPath
      path={[
        { id: 'variables', name: 'Variables', status: 'mastered' },
        { id: 'functions', name: 'Functions', status: 'mastered' },
        { id: 'loops', name: 'Loops', status: 'developing' },
        { id: 'nested', name: 'Nested loops', status: 'gap' },
        { id: 'lists', name: 'Lists', status: 'next' },
      ]}
    />
  )
}
