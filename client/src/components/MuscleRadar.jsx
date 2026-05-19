import { useRef, useEffect } from 'react'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const MUSCLE_ORDER = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux']

export default function MuscleRadar({ volumeData }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !volumeData || volumeData.length === 0) return
    chartRef.current?.destroy()

    // Aggregate volume by muscle group
    const totals = {}
    volumeData.forEach(({ muscle_group, volume }) => {
      if (!muscle_group || muscle_group === 'Autre') return
      totals[muscle_group] = (totals[muscle_group] || 0) + volume
    })

    const labels = MUSCLE_ORDER.filter((m) => totals[m] != null || true)
    const values = labels.map((m) => totals[m] || 0)
    const max    = Math.max(...values, 1)
    const normalized = values.map((v) => Math.round((v / max) * 100))

    const style  = getComputedStyle(document.documentElement)
    const ac     = style.getPropertyValue('--ac').trim()  || '59,130,246'
    const acL    = style.getPropertyValue('--ac-l').trim()  || '96,165,250'
    const acLt   = style.getPropertyValue('--ac-lt').trim() || '147,197,253'

    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          data: normalized,
          borderColor: `rgba(${ac},0.8)`,
          backgroundColor: `rgba(${ac},0.12)`,
          pointBackgroundColor: `rgba(${acL},0.9)`,
          pointBorderColor: 'transparent',
          pointRadius: 3,
          borderWidth: 2,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8,15,31,0.95)',
            borderColor: `rgba(${ac},0.2)`,
            borderWidth: 1,
            titleColor: `rgba(${acLt},0.6)`,
            bodyColor: '#fff',
            callbacks: {
              label: (ctx) => ` ${ctx.raw}% d'intensité`,
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: `rgba(${ac},0.08)` },
            angleLines: { color: `rgba(${ac},0.08)` },
            pointLabels: {
              color: `rgba(${acLt},0.5)`,
              font: { size: 11 },
            },
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [volumeData])

  if (!volumeData || volumeData.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>
        Pas assez de données (enregistre des séances pour voir ta répartition musculaire).
      </p>
    )
  }

  return (
    <div className="h-56">
      <canvas ref={canvasRef} />
    </div>
  )
}
