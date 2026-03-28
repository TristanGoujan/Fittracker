import { useState } from 'react'

const PERIODS = [
  { label: '7j',    days: 7 },
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '1 an',  days: 364 },
]

function intensityStyle(count) {
  if (count === 0) return { background: 'rgba(255,255,255,0.04)' }
  if (count === 1) return { background: 'rgba(var(--ac-d),0.35)' }
  if (count === 2) return { background: 'rgba(var(--ac-d),0.6)' }
  return { background: 'rgba(var(--ac),0.9)' }
}

export default function ActivityGrid({ data }) {
  const [days, setDays] = useState(182)

  const map = Object.fromEntries((data ?? []).map((d) => [d.date, d.count]))

  const today = new Date()
  const allDays = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    allDays.push({ date, count: map[date] ?? 0 })
  }

  const firstDay = new Date(allDays[0].date + 'T00:00:00').getDay()
  const offset = days >= 364 ? (firstDay === 0 ? 6 : firstDay - 1) : 0
  const totalCols = Math.ceil((allDays.length + offset) / 7)

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

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Activité</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={
                days === p.days
                  ? { background: 'rgba(var(--ac-d),0.25)', color: 'rgb(var(--ac-lt))', border: '1px solid rgba(var(--ac),0.4)' }
                  : { color: 'rgba(var(--ac-lt),0.3)', border: '1px solid transparent' }
              }
              onMouseEnter={(e) => { if (days !== p.days) e.currentTarget.style.color = 'rgba(var(--ac-lt),0.7)' }}
              onMouseLeave={(e) => { if (days !== p.days) e.currentTarget.style.color = 'rgba(var(--ac-lt),0.3)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Labels des mois */}
      {months.length > 0 && (
        <div
          className="grid h-4 mb-1"
          style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}
        >
          {months.map((m) => (
            <span
              key={m.label + m.col}
              style={{ gridColumn: m.col, color: 'rgba(var(--ac-lt),0.3)', fontSize: '10px' }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Grille */}
      <div className="flex gap-2" style={{ height: '112px' }}>
        {/* Labels des jours */}
        <div
          className="grid shrink-0"
          style={{ gridTemplateRows: 'repeat(7, 1fr)', fontSize: '10px', color: 'rgba(var(--ac-lt),0.25)' }}
        >
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="flex items-center leading-none">{d}</span>
          ))}
        </div>

        {/* Cellules */}
        <div
          className="grid gap-0.5 flex-1"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, 1fr)`,
            gridTemplateRows: 'repeat(7, 1fr)',
            gridAutoFlow: 'column',
          }}
        >
          {Array(offset).fill(null).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {allDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date} — ${day.count} séance${day.count > 1 ? 's' : ''}`}
              className="rounded-sm"
              style={intensityStyle(day.count)}
            />
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>Séances —</span>
        <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>Moins</span>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="w-3 h-3 rounded-sm" style={intensityStyle(n)} />
        ))}
        <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>Plus</span>
      </div>
    </div>
  )
}
