import { useRef, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default function ProgressChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return
    chartRef.current?.destroy()

    const style = getComputedStyle(document.documentElement)
    const ac    = style.getPropertyValue('--ac').trim()    || '59,130,246'
    const acD   = style.getPropertyValue('--ac-d').trim()  || '37,99,235'
    const acL   = style.getPropertyValue('--ac-l').trim()  || '96,165,250'
    const acLt  = style.getPropertyValue('--ac-lt').trim() || '147,197,253'

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) =>
          new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
          })
        ),
        datasets: [
          {
            data: data.map((d) => d.weight_kg),
            borderColor: `rgba(${ac},0.9)`,
            backgroundColor: `rgba(${acD},0.08)`,
            pointBackgroundColor: `rgba(${acL},1)`,
            pointBorderColor: `rgba(${acL},0.3)`,
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeInOutQuart',
          delay: (ctx) => ctx.type === 'data' ? ctx.dataIndex * 50 : 0,
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
              label: (ctx) => ` ${ctx.raw} kg`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: `rgba(${ac},0.05)` },
            ticks: { color: `rgba(${acLt},0.3)`, font: { size: 11 } },
          },
          y: {
            grid: { color: `rgba(${ac},0.05)` },
            ticks: {
              color: `rgba(${acLt},0.3)`,
              font: { size: 11 },
              callback: (v) => `${v} kg`,
            },
            beginAtZero: false,
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [data])

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>
        Aucune donnée de progression pour cet exercice.
      </p>
    )
  }

  return (
    <div>
      {data.length >= 2 && (
        <p className="text-xs mb-3" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
          Progression : {data[0].weight_kg} kg →{' '}
          <span style={{ color: data[data.length - 1].weight_kg >= data[0].weight_kg ? '#34d399' : '#f87171', fontWeight: 700 }}>
            {data[data.length - 1].weight_kg} kg
          </span>
        </p>
      )}
      <div className="h-52">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
