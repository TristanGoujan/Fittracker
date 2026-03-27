import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import VolumeChart from '../components/VolumeChart'
import ActivityGrid from '../components/ActivityGrid'
import { useAuth } from '../hooks/useAuth'
import { getSummary, getVolume, getActivity } from '../api/stats'

export default function Dashboard() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [volume7, setVolume7] = useState([])
  const [volume30, setVolume30] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSummary(token),
      getVolume(token, 7),
      getVolume(token, 30),
      getActivity(token),
    ])
      .then(([sum, v7, v30, act]) => {
        setSummary(sum)
        setVolume7(v7)
        setVolume30(v30)
        setActivity(act)
      })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <h2 className="text-2xl font-bold">Bonjour, {user?.username}</h2>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-6 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
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
            </div>

            <VolumeChart data7={volume7} data30={volume30} />
            <ActivityGrid data={activity} />
          </>
        )}
      </main>
    </div>
  )
}
