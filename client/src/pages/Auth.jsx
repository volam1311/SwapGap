import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export function Login() {
  const { login, demo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(email, password)
      navigate(user.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onDemo() {
    setError('')
    setBusy(true)
    try {
      const user = await demo()
      navigate(user.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card pad auth-card stack" onSubmit={onSubmit}>
        <Link to="/" className="brand" style={{ color: '#0e2744', margin: 0 }}>
          GapSwap
        </Link>
        <h1>Welcome back</h1>
        <p style={{ color: '#5b6b7f' }}>Use your university email, or continue as Maya for the demo.</p>
        {error && <div className="error">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@qut.edu.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
        <button className="btn btn-secondary btn-lg" type="button" onClick={onDemo} disabled={busy}>
          Continue as Maya (demo)
        </button>
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register({ email, password })
      navigate('/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card pad auth-card stack" onSubmit={onSubmit}>
        <Link to="/" className="brand" style={{ color: '#0e2744', margin: 0 }}>
          GapSwap
        </Link>
        <h1>Create an account</h1>
        <p style={{ color: '#5b6b7f' }}>
          Email and password first. You can add your name and course on the next screen.
        </p>
        {error && <div className="error">{error}</div>}
        <label className="field">
          <span>University email</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@qut.edu.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Continue'}
        </button>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
