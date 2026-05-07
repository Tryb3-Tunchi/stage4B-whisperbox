import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { generateKeyMaterial } from '../crypto/keys'
import { apiRegister, setTokens } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { LockIcon, EyeIcon, EyeOffIcon } from '../components/Icons'
import Toast from '../components/Toast'
import AnimatedBackground from '../components/AnimatedBackground'

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
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'error' | 'success' }>>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'generating'>('form')

  const addToast = (message: string, type: 'error' | 'success') => {
    const id = Math.random().toString(36)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (form.username.length < 3) return addToast('Username must be at least 3 characters', 'error')
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return addToast('Username can only contain letters, numbers, and underscores', 'error')
    if (form.display_name.trim().length < 1) return addToast('Display name is required', 'error')
    if (form.password.length < 8) return addToast('Password must be at least 8 characters', 'error')
    if (form.password !== form.confirm) return addToast('Passwords do not match', 'error')

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
      addToast('Account created! Welcome to Tunchi Whisper 🎉', 'success')
      navigate('/chat', { replace: true })

    } catch (err: any) {
      addToast(err.message || 'Registration failed. Please try again.', 'error')
      setStep('form')
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
          <p className="text-xl text-gray-300 mb-12">Secured ChatBox</p>
          <div className="space-y-6 max-w-xs text-center">
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-300">🔐 <strong>End-to-End Encrypted</strong></p>
            </div>
            <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-300">🔑 <strong>Your Keys, Your Control</strong></p>
            </div>
            <div className="bg-pink-500/20 border border-pink-500/30 rounded-xl p-4">
              <p className="text-sm text-gray-300">⚡ <strong>Instant & Secure</strong></p>
            </div>
          </div>
        </div>

        {/* Right side - Register Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Tunchi Whisper
              </h1>
              <p className="text-sm text-gray-400 mt-1">Secured ChatBox</p>
            </div>

            {/* Register Card */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl backdrop-blur-xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-sm text-gray-400 mb-6">Your keys are generated on your device</p>

              {step === 'generating' ? (
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
                      onChange={update('username')}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                      placeholder="alice_92"
                    />
                    <p className="text-xs text-gray-400 mt-1">3+ characters, letters, numbers, underscores only</p>
                  </div>

                  <div>
                    <label htmlFor="display_name" className="block text-sm font-semibold text-gray-300 mb-2">
                      Display Name
                    </label>
                    <input
                      id="display_name"
                      type="text"
                      autoComplete="name"
                      required
                      value={form.display_name}
                      onChange={update('display_name')}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                      placeholder="Alice"
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
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={update('password')}
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
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters recommended</p>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-semibold text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={form.confirm}
                    onChange={update('confirm')}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                    placeholder="Repeat password"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <LockIcon className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-300 leading-relaxed">
                    Your password protects your keys locally. We never see it. <strong>If lost, messages cannot be recovered.</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all text-sm shadow-lg hover:shadow-purple-500/50 disabled:shadow-none"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            )}

              <p className="text-center text-sm text-gray-400 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
                  Log in
                </Link>
              </p>
            </div>

            {/* Security note */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                🔐 Your encryption keys are generated on your device only.
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