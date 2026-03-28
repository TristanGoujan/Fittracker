import { useState } from 'react'

const PERIODS = [
  { label: '7j', days: 7 },
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '1 an', days: 364 },
]

function intensityClass(count) {
  if (count === 0) return 'bg-zinc-800'
  if (count === 1) return 'bg-indigo-900'
  if (count === 2) return 'bg-indigo-700'
  return 'bg-indigo-500'
}

export default function ActivityGrid({ data }) {
  const [days, setDays] = useState(364)
  const map = Object.fromEntries((data ?? []).map((d) => [d.date, d.count]))

  // Génère les N derniers jours
  const today = new Date()
  const allDays = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    allDays.push({ date, count: map[date] ?? 0 })
  }

  // Décalage lundi = 0
  const firstDay = new Date(allDays[0].date + 'T00:00:00').getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  // Labels des mois (uniquement pour les périodes longues)
  const months = []
  if (days >= 30) {
    let lastMonth = null
    let lastCol = -4
    allDays.forEach((d, i) => {
      const col = Math.floor((i + offset) / 7) + 1
      const month = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })
      if (month !== lastMonth && col - lastCol >= 3) {
        months.push({ label: month, col })
        lastMonth = month
        lastCol = col
      }
    })
  }

  const totalCols = Math.ceil((allDays.length + offset) / 7)

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Activité</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                days === p.days ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Labels des mois */}
      {months.length > 0 && (
        <div
          className="grid text-xs text-zinc-600 mb-1"
          style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}
        >
          {months.map((m) => (
            <span key={m.label + m.col} style={{ gridColumn: m.col }}>
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Grille */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateRows: 'repeat(7, 1fr)',
          gridAutoFlow: 'column',
          gridAutoColumns: '1fr',
        }}
      >
        {Array(offset).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {allDays.map((day) => (
          <div
            key={day.date}
            title={`${day.date} — ${day.count} séance${day.count > 1 ? 's' : ''}`}
            className={`rounded-sm aspect-square ${intensityClass(day.count)}`}
          />
        ))}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs text-zinc-500">Séances —</span>
        <span className="text-xs text-zinc-600">Moins</span>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className={`w-3 h-3 rounded-sm ${intensityClass(n)}`} />
        ))}
        <span className="text-xs text-zinc-600">Plus</span>
      </div>
    </div>
  )
}
