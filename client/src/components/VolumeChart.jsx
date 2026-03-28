import { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const MUSCLE_COLORS = {
  'Pectoraux':   'rgba(99,  102, 241, 0.85)',
  'Dos':         'rgba(16,  185, 129, 0.85)',
  'Épaules':     'rgba(245, 158,  11, 0.85)',
  'Biceps':      'rgba(239,  68,  68, 0.85)',
  'Triceps':     'rgba(168,  85, 247, 0.85)',
  'Jambes':      'rgba(59,  130, 246, 0.85)',
  'Abdominaux':  'rgba(20,  184, 166, 0.85)',
  'Autre':       'rgba(113, 113, 122, 0.85)',
}

function fillDays(volumeByDate, days) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    result.push({ date, volume: volumeByDate[date] ?? 0 })
  }
  return result
}

function formatLabel(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  if (days <= 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function VolumeChart({ data7, data30 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const [period, setPeriod] = useState(7)
  const [muscleFilter, setMuscleFilter] = useState('Tous')

  const rawData = period === 7 ? data7 : data30

  // Groupes musculaires disponibles dans les données
  const muscleGroups = useMemo(() => {
    const groups = [...new Set(rawData.map((d) => d.muscle_group))].sort()
    return ['Tous', ...groups]
  }, [rawData])

  // Si le filtre actuel n'existe plus dans les nouvelles données, reset
  useEffect(() => {
    if (muscleFilter !== 'Tous' && !muscleGroups.includes(muscleFilter)) {
      setMuscleFilter('Tous')
    }
  }, [muscleGroups, muscleFilter])

  // Données agrégées selon le filtre
  const chartData = useMemo(() => {
    const filtered =
      muscleFilter === 'Tous'
        ? rawData
        : rawData.filter((d) => d.muscle_group === muscleFilter)

    // Agrège par date
    const byDate = {}
    filtered.forEach(({ date, volume }) => {
      byDate[date] = (byDate[date] ?? 0) + volume
    })

    return fillDays(byDate, period)
  }, [rawData, muscleFilter, period])

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    const color =
      muscleFilter === 'Tous'
        ? 'rgba(99, 102, 241, 0.85)'
        : (MUSCLE_COLORS[muscleFilter] ?? 'rgba(99, 102, 241, 0.85)')

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: chartData.map((d) => formatLabel(d.date, period)),
        datasets: [
          {
            data: chartData.map((d) => d.volume),
            backgroundColor: chartData.map((d) =>
              d.volume > 0 ? color : color.replace('0.85', '0.15')
            ),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Math.round(ctx.raw).toLocaleString('fr-FR')} kg`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#71717a', font: { size: 11 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#71717a',
              font: { size: 11 },
              callback: (v) => `${v} kg`,
            },
            beginAtZero: true,
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [chartData, period, muscleFilter])

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="text-white font-semibold">Volume d'entraînement</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtre groupe musculaire */}
          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {muscleGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {/* Toggle période */}
          <div className="flex gap-1">
            {[7, 30].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                  period === p ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {p}j
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-52">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
