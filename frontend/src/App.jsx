import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Header from './components/layout/Header'
import Login from './pages/Login'
import Chat from './pages/Chat'
import Documents from './pages/Documents'
import Settings from './pages/Settings'
import AuditLog from './pages/AuditLog'
import SystemHealth from './pages/SystemHealth'
import { useState } from 'react'

function ProtectedLayout({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()

  // ← lifted state so chat doesn't reset on page switch
  const [messages, setMessages]         = useState([])
  const [convList, setConvList]         = useState([])
  const [convMessages, setConvMessages] = useState({})
  const [activeConv, setActiveConv]     = useState(null)

  const chatProps = { messages, setMessages, convList, setConvList, convMessages, setConvMessages, activeConv, setActiveConv }

  return (
    <Routes>
      <Route path="/login"     element={user ? <Navigate to="/chat" /> : <Login />} />
      <Route path="/chat"      element={<ProtectedLayout><Chat {...chatProps} /></ProtectedLayout>} />
      <Route path="/documents" element={<ProtectedLayout><Documents /></ProtectedLayout>} />
      <Route path="/settings"  element={<ProtectedLayout><Settings /></ProtectedLayout>} />
      <Route path="/audit"     element={<ProtectedLayout><AuditLog /></ProtectedLayout>} />
      <Route path="/health"    element={<ProtectedLayout><SystemHealth /></ProtectedLayout>} />
      <Route path="*"          element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}