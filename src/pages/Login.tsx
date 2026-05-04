import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiLogin, setTokens } from '../api/client'
import { unwrapPrivateKey } from '../crypto/keys'
import { useAuth } from '../store/AuthContext'
import { LockIcon, EyeIcon, EyeOffIcon } from '../components/Icons'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      return setError('Please enter your username and password.')
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
      navigate('/chat', { replace: true })

    } catch (err: any) {
      // unwrapPrivateKey throws if wrong password (auth tag mismatch)
      if (err.name === 'OperationError') {
        setError('Incorrect password. Could not decrypt your keys.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-sky-500 items-center justify-center mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WhisperBox</h1>
          <p className="text-sm text-gray-500 mt-1">End-to-end encrypted messaging</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Your password decrypts your keys on this device.</p>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="alice_92"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100" role="alert">
                  <span className="text-red-500 text-sm mt-0.5">⚠</span>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <LockIcon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-sky-700 leading-relaxed">
                  Your password never leaves this device. It's used locally to unlock your encryption keys.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {loading ? 'Logging in…' : 'Log In'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}