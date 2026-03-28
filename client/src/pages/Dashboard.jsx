import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import VolumeChart from '../components/VolumeChart'
import ActivityGrid from '../components/ActivityGrid'
import PRWidget from '../components/PRWidget'
import RecentSessions from '../components/RecentSessions'
import { useAuth } from '../hooks/useAuth'
import { getSummary, getVolume, getActivity, getPRs, getRecentSessions } from '../api/stats'

function formatDuration(minutes) {
  if (!minutes) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export default function Dashboard() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [volume7, setVolume7] = useState([])
  const [volume30, setVolume30] = useState([])
  const [activity, setActivity] = useState([])
  const [prs, setPrs] = useState(null)
  const [recent, setRecent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSummary(token),
      getVolume(token, 7),
      getVolume(token, 30),
      getActivity(token),
      getPRs(token),
      getRecentSessions(token),
    ])
      .then(([sum, v7, v30, act, prData, recentData]) => {
        setSummary(sum)
        setVolume7(v7)
        setVolume30(v30)
        setActivity(act)
        setPrs(prData)
        setRecent(recentData)
      })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <h2 className="text-2xl font-bold">Bonjour, {user?.username}</h2>

        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-6 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Séances totales"
                value={summary?.total_sessions ?? 0}
                delay={0}
              />
              <StatCard
                label="Volume total"
                value={Math.round(summary?.total_volume ?? 0).toLocaleString('fr-FR')}
                unit="kg"
                delay={100}
              />
              <StatCard
                label="Meilleure charge"
                value={summary?.best_weight ?? 0}
                unit="kg"
                delay={200}
              />
              <StatCard
                label="Temps ce mois"
                value={formatDuration(summary?.monthly_duration_min)}
                delay={300}
              />
            </div>

            {/* PR widget */}
            <PRWidget prs={prs} />

            {/* Volume chart */}
            <VolumeChart data7={volume7} data30={volume30} />

            {/* Séances récentes + Activité */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentSessions sessions={recent} />
              <ActivityGrid data={activity} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
