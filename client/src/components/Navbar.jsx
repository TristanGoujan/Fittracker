import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg text-white">FitTracker</Link>
      <div className="flex items-center gap-6">
        <Link
          to="/new"
          className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          + Nouvelle séance
        </Link>
        <span className="text-zinc-500 text-sm">@{user?.username}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
