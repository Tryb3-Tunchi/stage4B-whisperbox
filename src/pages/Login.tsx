import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiLogin, setTokens } from '../api/client'
import { unwrapPrivateKey } from '../crypto/keys'
import { useAuth } from '../store/AuthContext'
import { LockIcon, EyeIcon, EyeOffIcon } from '../components/Icons'
import Toast from '../components/Toast'
import AnimatedBackground from '../components/AnimatedBackground'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'error' | 'success' }>>([])
  const [loading, setLoading] = useState(false)

  const addToast = (message: string, type: 'error' | 'success') => {
    const id = Math.random().toString(36)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.username.trim() || !form.password) {
      return addToast('Please enter your username and password.', 'error')
    }

    setLoading(true)

    try {
      // 1. Login — server returns wrapped private key + salt
      const res = await apiLogin({
        username: form.username.trim(),
        password: form.password,
      })

      // 2. Re-derive wrapping key from password and unwrap private key
      //    Private key goes into memory ONLY — never stored anywhere
      const privateKey = await unwrapPrivateKey(
        res.user.wrapped_private_key,
        res.user.pbkdf2_salt,
        form.password
      )

      // 3. Store tokens and set auth state
      setTokens(res.access_token, res.refresh_token)
      setAuth(res.user, privateKey)
      addToast('Welcome back! 🎉', 'success')
      navigate('/chat', { replace: true })

    } catch (err: any) {
      // unwrapPrivateKey throws if wrong password (auth tag mismatch)
      if (err.name === 'OperationError') {
        addToast('Incorrect password. Please try again.', 'error')
      } else if (err.message?.includes('AES-KW')) {
        addToast('Password is incorrect or account data is corrupted. Please try again.', 'error')
      } else {
        addToast(err.message || 'Login failed. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatedBackground />
      
      <div className="relative min-h-full flex items-stretch z-10">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-8 text-white">
          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Tunchi Whisper
          </h1>
          <p className="text-xl text-gray-300 mb-8">Secured ChatBox</p>
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-2xl">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div className="mt-12 text-center max-w-xs">
            <p className="text-gray-400 text-sm leading-relaxed">
              🔐 End-to-end encrypted messaging. Only you and your recipient can read your messages.
            </p>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Tunchi Whisper
              </h1>
              <p className="text-sm text-gray-400 mt-1">Secured ChatBox</p>
            </div>

            {/* Login Card */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl backdrop-blur-xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-sm text-gray-400 mb-6">Your messages stay encrypted on your device</p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                      placeholder="alice_92"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                        placeholder="PassWordSecure1!"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                    <LockIcon className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-cyan-300 leading-relaxed">
                      Your password decrypts your keys locally. We never see it. It must be at least 8 characters.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all text-sm shadow-lg hover:shadow-purple-500/50 disabled:shadow-none"
                  >
                    {loading ? 'Logging in...' : 'Log In'}
                  </button>
                </form>
              )}

              <p className="text-center text-sm text-gray-400 mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
                  Create one
                </Link>
              </p>
            </div>

            {/* Security note */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                🔐 All messages are encrypted end-to-end.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none z-50">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </>
  )
}