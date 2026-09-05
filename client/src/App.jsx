import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { AppShell } from './components/AppShell.jsx'
import { Landing } from './pages/Landing.jsx'
import { Login, Signup } from './pages/Auth.jsx'
import { Onboarding } from './pages/Onboarding.jsx'
import { Home } from './pages/Home.jsx'
import { Discover } from './pages/Discover.jsx'
import { Diagnose } from './pages/Diagnose.jsx'
import { Gps } from './pages/Gps.jsx'
import { Match } from './pages/Match.jsx'
import { SessionPage, Sessions } from './pages/Session.jsx'
import { PostSession } from './pages/PostSession.jsx'
import { Help, Profile, Questions, Settings } from './pages/Community.jsx'
import { Certificate, CredentialPublic } from './pages/Certificate.jsx'

function Private({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="page">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/c/:code" element={<CredentialPublic />} />
          <Route
            path="/onboarding"
            element={
              <Private>
                <Onboarding />
              </Private>
            }
          />
          <Route
            element={
              <Private>
                <AppShell />
              </Private>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/diagnose/:id" element={<Diagnose />} />
            <Route path="/gps" element={<Gps />} />
            <Route path="/match" element={<Match />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionPage />} />
            <Route path="/sessions/:id/check" element={<PostSession />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
