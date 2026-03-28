import { Link } from 'react-router-dom'

const ACCENT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#a855f7',
]

const ICONS = [
  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />,
  <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />,
  <path d="M7 2v11h3v9l7-12h-4l4-8z" />,
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />,
  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />,
]

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

function formatDuration(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function VolumeDelta({ current, previous }) {
  if (previous == null || previous === 0) return null
  const delta = current - previous
  const pct = Math.round((delta / previous) * 100)
  return (
    <span
      className="text-xs font-bold"
      style={{ color: delta >= 0 ? '#34d399' : '#f87171' }}
    >
      {delta >= 0 ? '+' : ''}{pct}%
    </span>
  )
}

export default function RecentSessions({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div>
        <p className="text-white font-bold uppercase tracking-wider text-xs mb-4">Séances récentes</p>
        <p className="text-sm" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>Aucune séance enregistrée.</p>
      </div>
    )
  }

  const displayed = sessions.slice(0, 3)
  const maxVolume = Math.max(...displayed.map((s) => s.volume), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-bold uppercase tracking-wider text-xs">Séances récentes</p>
        <Link
          to="/history"
          className="text-xs font-bold uppercase tracking-wider transition-colors"
          style={{ color: 'rgba(var(--ac-l),0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.5)' }}
        >
          Voir tout
        </Link>
      </div>

      <div className="space-y-2">
        {displayed.map((session, i) => {
          const prev = sessions[i + 1]
          const duration = formatDuration(session.duration_min)
          const volumePct = (session.volume / maxVolume) * 100
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length]

          return (
            <Link
              key={session.id}
              to={`/sessions/${session.id}`}
              className="flex items-center gap-4 rounded-2xl p-4 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; e.currentTarget.style.borderColor = `${color}25` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.08)' }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
                  {ICONS[i % ICONS.length]}
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{session.name || 'Séance sans nom'}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
                  {formatDate(session.session_date)}
                  {duration && <span className="ml-1.5">· {duration}</span>}
                </p>
              </div>

              {/* Volume */}
              <div className="text-right shrink-0 min-w-20">
                <p className="text-white font-black text-base leading-tight">
                  {Math.round(session.volume).toLocaleString('fr-FR')}
                  <span className="text-xs font-normal ml-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>kg</span>
                </p>
                <VolumeDelta current={session.volume} previous={prev?.volume} />
                <div className="mt-1.5 h-0.5 rounded-full w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${volumePct}%`, background: color, opacity: 0.6 }}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
