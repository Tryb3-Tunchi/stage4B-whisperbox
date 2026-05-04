import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { generateKeyMaterial } from '../crypto/keys'
import { apiRegister, setTokens } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { LockIcon, EyeIcon, EyeOffIcon } from '../components/Icons'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({
    username: '',
    display_name: '',
    password: '',
    confirm: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'generating'>('form')

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (form.username.length < 3) return setError('Username must be at least 3 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return setError('Username can only contain letters, numbers, and underscores')
    if (form.display_name.trim().length < 1) return setError('Display name is required')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')

    setLoading(true)
    setStep('generating')

    try {
      // Generate cryptographic key material
      const keyMaterial = await generateKeyMaterial(form.password)

      // Register with server — sends public key + wrapped private key
      const res = await apiRegister({
        username: form.username,
        display_name: form.display_name.trim(),
        password: form.password,
        public_key: keyMaterial.publicKeyB64,
        wrapped_private_key: keyMaterial.wrappedPrivateKeyB64,
        pbkdf2_salt: keyMaterial.pbkdf2SaltB64,
      })

      // Store tokens, set auth state with private key in memory
      setTokens(res.access_token, res.refresh_token)
      setAuth(res.user, keyMaterial.privateKey)
      navigate('/chat', { replace: true })

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
      setStep('form')
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
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Your encryption keys are generated on your device.</p>

          {step === 'generating' ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              <div className="text-center">
                <p className="font-medium text-gray-800">Generating your encryption keys</p>
                <p className="text-sm text-gray-500 mt-1">This happens on your device — we never see your keys.</p>
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
                  onChange={update('username')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="alice_92"
                />
              </div>

              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="display_name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.display_name}
                  onChange={update('display_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="Alice"
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
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={update('password')}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    placeholder="8+ characters"
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

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirm}
                  onChange={update('confirm')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100" role="alert">
                  <span className="text-red-500 text-sm mt-0.5">⚠</span>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* E2EE notice */}
              <div className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <LockIcon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-sky-700 leading-relaxed">
                  Your password is used to protect your encryption keys on your device. 
                  We never see it in plaintext. <strong>If you forget it, your messages cannot be recovered.</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}