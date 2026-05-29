import { createContext, useContext, useState, useEffect } from 'react'
const API = import.meta.env.VITE_API_URL ?? ''

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  // Hydrate user with full profile (including avatar_url) whenever token is set
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const full = { id: data.id, username: data.username, email: data.email, avatar_url: data.avatar_url }
        localStorage.setItem('user', JSON.stringify(full))
        setUser(full)
      })
      .catch(() => {})
  }, [token])

  function saveAuth(token, user) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function updateUser(patch) {
    const merged = { ...user, ...patch }
    localStorage.setItem('user', JSON.stringify(merged))
    setUser(merged)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, saveAuth, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
