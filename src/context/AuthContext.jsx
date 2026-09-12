import { createContext, useContext, useState } from 'react'

// MOCK — replace with real backend calls via services/api.js
const MOCK_USER = { name: 'Pari', role: 'Engineer', id: 'ENG-1042', lang: 'English' }

const AuthContext = createContext()

function getRoleFromUID(uid) {
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
  const [user, setUser] = useState(null)

  const login = (uid, _pw,name) => {
    // TODO: return api.login(uid, pw)
    if (uid.trim()) {
      setUser({ name: name.trim() || uid, role: getRoleFromUID(uid), id: uid, lang: 'English' })
      return true
    }
    return false
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
