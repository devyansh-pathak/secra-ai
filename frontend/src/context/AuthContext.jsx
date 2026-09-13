
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

function getRoleFromUID(uid) {
  const prefix = uid.trim().toUpperCase().slice(0, 3)
  return { ENG:'Engineer', MAG:'Manager', OFF:'Safety Officer', ADM:'Administrator' }[prefix] || 'Engineer'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('secra_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const login = async (uid, pw, name) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, password: pw, name }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.token) localStorage.setItem('secra_token', data.token)
        localStorage.setItem('secra_user', JSON.stringify(data.user))
        setUser(data.user)
        return true
      }
      return false
    } catch {
      // fallback if backend offline
      if (uid.trim()) {
        const u = { name: name.trim() || uid, role: getRoleFromUID(uid), id: uid }
        localStorage.setItem('secra_user', JSON.stringify(u))
        setUser(u)
        return true
      }
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('secra_token')
    localStorage.removeItem('secra_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
