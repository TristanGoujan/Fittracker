import { useRef, useEffect } from 'react'
import { animate } from 'animejs'

export default function StatCard({ label, value, unit, delay = 0 }) {
  const ref = useRef(null)

  useEffect(() => {
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      delay,
      easing: 'easeOutQuad',
    })
  }, [delay])

  return (
    <div
      ref={ref}
      className="rounded-xl p-5 opacity-0"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(var(--ac), 0.1)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'rgba(var(--ac-lt), 0.45)' }}
      >
        {label}
      </p>
      <p className="text-white text-2xl font-black">
        {value}
        {unit && (
          <span
            className="text-base font-normal ml-1.5"
            style={{ color: 'rgba(var(--ac-lt), 0.35)' }}
          >
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}
