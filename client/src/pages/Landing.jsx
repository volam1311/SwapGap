import { Link } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'

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
            Success is the red node turning green after a transfer quiz — not a session booked. Coming later:
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
          <span>Route to the cheapest sufficient support</span>
        </div>
        <div className="loop-step">
          <b>03</b>
          <span>Run a scripted peer check against approved content</span>
        </div>
        <div className="loop-step">
          <b>04</b>
          <span>Verify improvement — or escalate to Student Success</span>
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
            Diagnostic completed → gap on the GPS → scripted check → transfer quiz passed. The metric is
            mastery movement, not time on the platform.
          </p>
        </div>
        <div className="card pad">
          <h3>Human oversight</h3>
          <p>
            We do not teach. Content is system-provided; peers check whether you can explain it back. We do
            not replace Student Success — we filter foundational gaps and escalate the cases that need a
            trained tutor, complete with a diagnostic profile.
          </p>
        </div>
        <div className="card pad">
          <h3>By-product</h3>
          <p>
            Verified support can become a semester certificate for a CV or LinkedIn. That is evidence of the
            loop, not the product.
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
