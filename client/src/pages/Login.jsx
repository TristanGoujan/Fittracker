import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { saveAuth } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await login(form.email, form.password)
      saveAuth(token, user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 45%, #050c1a 75%, #020810 100%)' }}
    >
      {/* Glow blob */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--ac-d),0.12) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span style={{ color: 'rgb(var(--ac-l))' }}>Fit</span>
            <span className="text-white">Tracker</span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
            Connecte-toi pour continuer
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: 'rgba(8, 15, 31, 0.85)',
            border: '1px solid rgba(var(--ac),0.15)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="ton@email.com"
              className="w-full text-white rounded-xl px-4 py-3 outline-none text-sm placeholder:opacity-20 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.4)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.12)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full text-white rounded-xl px-4 py-3 outline-none text-sm placeholder:opacity-20 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.4)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.12)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold rounded-xl py-3 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-2"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
              boxShadow: '0 4px 20px rgba(var(--ac-d),0.35)',
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = '0 4px 28px rgba(var(--ac-d),0.55)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--ac-d),0.35)' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-5 text-sm" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            className="font-semibold transition-colors"
            style={{ color: 'rgb(var(--ac-l))' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-lt))' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
