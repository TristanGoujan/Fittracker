import { useRef, useEffect, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// Remplit les jours manquants avec 0
function fillDays(data, days) {
  const map = Object.fromEntries(data.map((d) => [d.date, d.volume]))
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    result.push({ date, volume: map[date] ?? 0 })
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

  const rawData = period === 7 ? data7 : data30
  const filled = fillDays(rawData, period)

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current?.destroy()

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: filled.map((d) => formatLabel(d.date, period)),
        datasets: [
          {
            data: filled.map((d) => d.volume),
            backgroundColor: filled.map((d) =>
              d.volume > 0 ? 'rgba(99, 102, 241, 0.85)' : 'rgba(99, 102, 241, 0.15)'
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
  }, [filled, period])

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold">Volume d'entraînement</h3>
        <div className="flex gap-1">
          {[7, 30].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>
      <div className="h-52">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
