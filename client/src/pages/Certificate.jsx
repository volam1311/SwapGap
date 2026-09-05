import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'

function copy(text) {
  return navigator.clipboard.writeText(text)
}

function linkedinUrl(cert) {
  const origin = window.location.origin
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${cert.title} — ${cert.holder.course}`,
    organizationName: 'GapSwap',
    issueYear: String(cert.term.year),
    issueMonth: String(cert.term.issueMonth),
    certUrl: `${origin}/c/${cert.id}`,
    certId: cert.id,
  })
  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

export function CertificateMark({ cert }) {
  return (
    <div className="cert-sheet">
      <p className="cert-kicker">GapSwap · {cert.holder.university}</p>
      <h2>{cert.title}</h2>
      <p className="cert-awarded">This is to recognise</p>
      <p className="cert-name">{cert.holder.name}</p>
      <p>
        for verified peer teaching and support in <b>{cert.holder.course || 'their unit'}</b> during{' '}
        {cert.term.teachingPeriod}.
      </p>
      <div className="tags" style={{ marginTop: 14, justifyContent: 'center' }}>
        {(cert.stats.topics || []).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="cert-meta">
        <div>
          <small>Teaching swaps</small>
          <b>{cert.stats.sessionsTaught}</b>
        </div>
        <div>
          <small>Peer ratings</small>
          <b>{cert.stats.ratings}</b>
        </div>
        <div>
          <small>Helpfulness</small>
          <b>{cert.stats.avgHelpfulness || '—'}</b>
        </div>
      </div>
      <p className="cert-id">
        Issued for {cert.term.label} · {cert.term.issueMonthLabel} · ID {cert.id}
      </p>
    </div>
  )
}

export function Certificate() {
  const [cert, setCert] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api('/api/me/certificate').then(setCert)
  }, [])

  async function onCopy(key, text) {
    await copy(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!cert) return <div className="page">Preparing your credential…</div>

  if (!cert.eligible) {
    return (
      <div className="page stack">
        <h1 className="page-title">Semester credential</h1>
        <p className="page-sub">
          A Peer Teaching & Support certificate is issued for {cert.term.label} once you have helped a
          classmate. Add it to your CV or LinkedIn at the end of the teaching period.
        </p>
        <div className="card pad stack">
          <h3>How to unlock it</h3>
          <label className="choice">
            <input type="checkbox" checked={cert.progress.teachASwap} readOnly />
            Teach in a GapSwap (you explain a topic you already understand)
          </label>
          <label className="choice">
            <input type="checkbox" checked={cert.progress.getARating} readOnly />
            Receive a peer rating after a session
          </label>
          <label className="choice">
            <input type="checkbox" checked={cert.progress.supportOnBoard} readOnly />
            Or support someone on the questions board
          </label>
          <div className="row">
            <Link className="btn btn-primary" to="/match">
              Find a match to teach
            </Link>
            <Link className="btn btn-secondary" to="/questions">
              Answer a question
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page stack">
      <h1 className="page-title">Semester credential</h1>
      <p className="page-sub">
        Issued for {cert.term.label}. Use this on a CV or LinkedIn as evidence of peer teaching — not as a
        university award.
      </p>
      <CertificateMark cert={cert} />
      <div className="card pad stack cert-actions">
        <h3>Add to LinkedIn or your CV</h3>
        <p style={{ color: '#5b6b7f' }}>
          LinkedIn → Add profile section → Licenses & certifications. Organisation: GapSwap. Issue date:{' '}
          {cert.term.issueMonthLabel}. Credential ID: {cert.id}.
        </p>
        <div className="row">
          <a className="btn btn-primary" href={linkedinUrl(cert)} target="_blank" rel="noreferrer">
            Add to LinkedIn
          </a>
          <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
            Print / save PDF
          </button>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => onCopy('cv', cert.cvBullet)}>
          {copied === 'cv' ? 'Copied CV bullet' : 'Copy CV bullet'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => onCopy('li', cert.linkedinText)}>
          {copied === 'li' ? 'Copied LinkedIn text' : 'Copy LinkedIn summary'}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => onCopy('url', `${window.location.origin}/c/${cert.id}`)}
        >
          {copied === 'url' ? 'Copied credential URL' : 'Copy credential URL'}
        </button>
      </div>
      <p style={{ color: '#5b6b7f', fontSize: 13 }}>{cert.disclaimer}</p>
    </div>
  )
}

export function CredentialPublic() {
  const { code } = useParams()
  const [cert, setCert] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/credentials/${code}`)
      .then(setCert)
      .catch((err) => setError(err.message))
  }, [code])

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="card pad auth-card stack">
          <h1>Credential not found</h1>
          <p style={{ color: '#5b6b7f' }}>{error}</p>
          <Link className="btn btn-primary" to="/">
            Back to GapSwap
          </Link>
        </div>
      </div>
    )
  }
  if (!cert) return <div className="page">Checking credential…</div>
  return (
    <div className="auth-wrap">
      <div className="stack" style={{ width: 'min(720px, 100%)' }}>
        <Link to="/" className="brand" style={{ color: '#0e2744', margin: 0 }}>
          GapSwap
        </Link>
        <p className="page-sub">Verified peer-learning credential</p>
        <CertificateMark cert={cert} />
        <p style={{ color: '#5b6b7f', fontSize: 13 }}>{cert.disclaimer}</p>
      </div>
    </div>
  )
}
