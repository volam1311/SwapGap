import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  async function refresh() {
    if (!getToken()) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      const data = await api('/api/me')
      setUser(data.user)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function login(email, password) {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function register(body) {
    const data = await api('/api/auth/register', { method: 'POST', body })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function demo() {
    const data = await api('/api/auth/demo', { method: 'POST' })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, ready, login, register, demo, logout, refresh, setUser }),
    [user, ready],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
