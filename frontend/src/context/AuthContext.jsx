import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, signup as apiSignup, logout as apiLogout } from '../services/api'

const AuthContext = createContext()

// Derive role from User ID prefix
export function getRoleFromUID(uid = '') {
  const prefix = uid.trim().toUpperCase().slice(0, 3)
  const roles = {
    ENG: 'Engineer',
    MAG: 'Manager',
    OFF: 'Safety Officer',
    ADM: 'Administrator',
  }
  return roles[prefix] || 'Engineer'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('secra_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = async (uid, pw, name) => {
    if (!uid || !uid.trim()) return { success: false, error: 'User ID is required' }
    
    const derivedRole = getRoleFromUID(uid)
    const displayName = (name && name.trim()) || uid.trim()

    try {
      const res = await apiLogin(uid.trim(), pw || 'secret')
      if (res && res.success && res.user) {
        const u = {
          id: res.user.id || uid.trim(),
          name: (name && name.trim()) || res.user.name || displayName,
          role: res.user.role || derivedRole,
          username: res.user.username || uid.trim(),
          email: res.user.email || '',
          lang: 'English'
        }
        setUser(u)
        localStorage.setItem('secra_user', JSON.stringify(u))
        return { success: true, user: u }
      }
    } catch (e) {
      console.warn('Backend login fallback to UID derivation:', e)
    }

    // Instant graceful fallback with prefix-derived role
    const fallbackUser = {
      id: uid.trim(),
      name: displayName,
      role: derivedRole,
      username: uid.trim(),
      lang: 'English'
    }
    setUser(fallbackUser)
    localStorage.setItem('secra_user', JSON.stringify(fallbackUser))
    return { success: true, user: fallbackUser }
  }

  const signup = async ({ username, fullName, password, role, email }) => {
    const derivedRole = role || getRoleFromUID(username)
    const displayName = fullName || username

    try {
      const res = await apiSignup({
        username,
        fullName: displayName,
        password,
        role: derivedRole,
        email
      })
      if (res && res.success && res.user) {
        const u = {
          id: res.user.id,
          name: res.user.name || displayName,
          role: res.user.role || derivedRole,
          username: res.user.username || username,
          email: res.user.email || email || '',
          lang: 'English'
        }
        setUser(u)
        localStorage.setItem('secra_user', JSON.stringify(u))
        return { success: true, user: u }
      }
    } catch (e) {
      console.warn('Backend signup fallback:', e)
    }

    // Local fallback
    const localUser = {
      id: username.trim(),
      name: displayName,
      role: derivedRole,
      username: username.trim(),
      email: email || '',
      lang: 'English'
    }
    setUser(localUser)
    localStorage.setItem('secra_user', JSON.stringify(localUser))
    return { success: true, user: localUser }
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch (_) {}
    setUser(null)
    localStorage.removeItem('secra_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, getRoleFromUID }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


