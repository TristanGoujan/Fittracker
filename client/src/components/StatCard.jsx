import { useRef, useEffect } from 'react'
import { animate } from 'animejs'

export default function StatCard({ label, value, unit, delay = 0 }) {
  const ref = useRef(null)

  useEffect(() => {
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay,
      easing: 'easeOutQuad',
    })
  }, [delay])

  return (
    <div ref={ref} className="bg-zinc-900 rounded-xl p-6 opacity-0">
      <p className="text-zinc-500 text-sm mb-2">{label}</p>
      <p className="text-white text-3xl font-bold">
        {value}
        {unit && <span className="text-zinc-500 text-lg font-normal ml-1">{unit}</span>}
      </p>
    </div>
  )
}
