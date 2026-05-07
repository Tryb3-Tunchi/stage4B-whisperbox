import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './store/AuthContext'
import { loadPersistedRefresh } from './api/client'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import ChatPage from './pages/Chat'

// ── Protected route ────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SplashScreen() {
  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-medium">Tunchi Whisper</p>
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  const { setLoading, user } = useAuth()

  // ── Session restore on mount ─────────────────────────
  // If user refreshes the page, try to restore session using:
  // 1. Persisted refresh token in sessionStorage
  // 2. But we can't restore privateKey without password
  // So we redirect to login with a "session expired" note
  useEffect(() => {
    async function restoreSession() {
      const storedRefresh = loadPersistedRefresh()
      if (!storedRefresh) {
        setLoading(false)
        return
      }

      // We have a refresh token but no private key in memory
      // The private key requires the password to unwrap
      // We can't auto-restore crypto state without password
      // → redirect to login (this is correct E2EE behavior)
      setLoading(false)
    }
    if (!user) restoreSession()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/chat/*"
        element={
          <Protected>
            <ChatPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}