import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const navigate = useNavigate()
  const { saveAuth } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
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
      const { token, user } = await register(form.username, form.email, form.password)
      saveAuth(token, user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">FitTracker</h1>
        <p className="text-zinc-500 text-center mb-8">Crée ton compte</p>

        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-8 space-y-5">
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5">Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
              placeholder="ton@email.com"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
              placeholder="8 caractères minimum"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-zinc-500 text-center mt-6 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
