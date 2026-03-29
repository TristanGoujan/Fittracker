import { useRef, useEffect } from 'react'
import { animate } from 'animejs'

export default function StatCard({ label, value, unit, counter, delay = 0 }) {
  const cardRef = useRef(null)
  const numRef  = useRef(null)

  // Entrance fade-in
  useEffect(() => {
    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      delay,
      easing: 'easeOutQuad',
    })
  }, [delay])

  // Counter roll-up (only when `counter` prop is a positive number)
  useEffect(() => {
    if (counter === undefined || counter === 0 || !numRef.current) return
    const target = counter
    const start  = performance.now()
    const dur    = 1200
    const ease   = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
    let raf
    const tick = now => {
      const t   = Math.min((now - start - delay) / dur, 1)
      if (t < 0) { raf = requestAnimationFrame(tick); return }
      if (numRef.current) numRef.current.textContent = Math.round(ease(t) * target).toLocaleString('fr-FR')
      if (t < 1) raf = requestAnimationFrame(tick)
      else if (numRef.current) numRef.current.textContent = target.toLocaleString('fr-FR')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [counter, delay])

  return (
    <div
      ref={cardRef}
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
        {counter !== undefined ? <span ref={numRef}>0</span> : value}
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
