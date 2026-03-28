function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function VolumeDelta({ current, previous }) {
  if (previous == null || previous === 0) return null
  const delta = current - previous
  const pct = Math.round((delta / previous) * 100)
  const positive = delta >= 0
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        positive
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-red-500/10 text-red-400'
      }`}
    >
      {positive ? '+' : ''}{pct}%
    </span>
  )
}

export default function RecentSessions({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2">Séances récentes</h3>
        <p className="text-zinc-600 text-sm">Aucune séance enregistrée.</p>
      </div>
    )
  }

  // On affiche les 5 premières, la 6ème sert uniquement à calculer le delta de la 5ème
  const displayed = sessions.slice(0, 5)

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Séances récentes</h3>
      <div className="space-y-3">
        {displayed.map((session, i) => {
          const prev = sessions[i + 1]
          return (
            <div
              key={session.id}
              className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white font-medium text-sm truncate">
                    {session.name || 'Séance sans nom'}
                  </span>
                  {session.duration_min && (
                    <span className="text-zinc-600 text-xs shrink-0">
                      {session.duration_min} min
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 text-xs">{formatDate(session.session_date)}</p>
                {session.exercises && session.exercises.length > 0 && (
                  <p className="text-zinc-500 text-xs mt-1 truncate">
                    {session.exercises.slice(0, 4).join(', ')}
                    {session.exercises.length > 4 && ` +${session.exercises.length - 4}`}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-white text-sm font-semibold">
                  {Math.round(session.volume).toLocaleString('fr-FR')}
                  <span className="text-zinc-500 text-xs font-normal ml-1">kg</span>
                </p>
                <VolumeDelta current={session.volume} previous={prev?.volume} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
