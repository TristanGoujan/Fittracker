import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">FitTracker</span>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm">@{user?.username}</span>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-2">Bonjour, {user?.username} 👋</h2>
        <p className="text-zinc-500">Ton tableau de bord arrive bientôt.</p>
      </main>
    </div>
  )
}
