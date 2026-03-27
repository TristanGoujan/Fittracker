function intensityClass(count) {
  if (count === 0) return 'bg-zinc-800'
  if (count === 1) return 'bg-indigo-900'
  if (count === 2) return 'bg-indigo-700'
  return 'bg-indigo-500'
}

export default function ActivityGrid({ data }) {
  const map = Object.fromEntries((data ?? []).map((d) => [d.date, d.count]))

  // Génère les 364 derniers jours
  const today = new Date()
  const days = []
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    days.push({ date, count: map[date] ?? 0 })
  }

  // Décalage pour commencer le grid un lundi
  const firstDay = new Date(days[0].date + 'T00:00:00').getDay() // 0=dim
  const offset = firstDay === 0 ? 6 : firstDay - 1

  const months = []
  let lastMonth = null
  let lastCol = -4
  days.forEach((d, i) => {
    const col = Math.floor((i + offset) / 7) + 1
    const month = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })
    if (month !== lastMonth && col - lastCol >= 3) {
      months.push({ label: month, col })
      lastMonth = month
      lastCol = col
    }
  })

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Activité — 12 derniers mois</h3>

      {/* Labels des mois */}
      <div className="relative mb-1" style={{ paddingLeft: '1px' }}>
        <div
          className="grid text-xs text-zinc-600"
          style={{ gridTemplateColumns: `repeat(53, 1fr)` }}
        >
          {months.map((m) => (
            <span
              key={m.label + m.col}
              style={{ gridColumn: m.col }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateRows: 'repeat(7, 1fr)',
          gridAutoFlow: 'column',
          gridAutoColumns: '1fr',
        }}
      >
        {Array(offset).fill(null).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date} — ${day.count} séance${day.count > 1 ? 's' : ''}`}
            className={`rounded-sm aspect-square ${intensityClass(day.count)}`}
          />
        ))}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs text-zinc-600">Moins</span>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className={`w-3 h-3 rounded-sm ${intensityClass(n)}`} />
        ))}
        <span className="text-xs text-zinc-600">Plus</span>
      </div>
    </div>
  )
}
