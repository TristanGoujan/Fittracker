import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { CATEGORIES, ALL_BADGES } from '../data/badges.jsx'

// ─── Component ─────────────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 12

export default function Badges({ stats }) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const gridRef = useRef(null)

  const badges = activeCategory === 'all'
    ? ALL_BADGES
    : (CATEGORIES.find(c => c.id === activeCategory)?.badges ?? [])

  const visibleBadges = showAll ? badges : badges.slice(0, INITIAL_VISIBLE)
  const hiddenCount = badges.length - INITIAL_VISIBLE

  const unlocked = ALL_BADGES.filter(b => stats && b.check(stats)).length

  useEffect(() => {
    setShowAll(false)
  }, [activeCategory])

  useEffect(() => {
    if (!gridRef.current || !stats) return
    const cells = Array.from(gridRef.current.children)
    cells.forEach(el => { el.style.opacity = '0'; el.style.transform = 'scale(0.75)' })
    requestAnimationFrame(() => {
      cells.forEach((el, i) => {
        animate(el, { opacity: [0, 1], scale: [0.75, 1], duration: 320, delay: i * 18, easing: 'easeOutBack' })
      })
    })
  }, [stats, activeCategory, showAll])

  if (!stats) return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
          Badges
        </p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(var(--ac),0.12)', color: 'rgba(var(--ac-lt),0.6)' }}>
          {unlocked} / {ALL_BADGES.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${(unlocked / ALL_BADGES.length) * 100}%`,
            background: 'linear-gradient(90deg, rgb(var(--ac-d)), rgb(var(--ac-l)))',
          }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button
          onClick={() => setActiveCategory('all')}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: activeCategory === 'all' ? 'rgba(var(--ac),0.18)' : 'rgba(255,255,255,0.04)',
            color: activeCategory === 'all' ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${activeCategory === 'all' ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          Tous
        </button>
        {CATEGORIES.map(cat => {
          const catUnlocked = cat.badges.filter(b => b.check(stats)).length
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: active ? 'rgba(var(--ac),0.18)' : 'rgba(255,255,255,0.04)',
                color: active ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${active ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {cat.label}
              <span className="ml-1.5 opacity-60">{catUnlocked}/{cat.badges.length}</span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}
      >
        {visibleBadges.map(badge => {
          const earned = stats && badge.check(stats)
          return (
            <div
              key={badge.id}
              className="rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5 cursor-default"
              style={{
                background: earned ? `${badge.color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${earned ? badge.color + '28' : 'rgba(255,255,255,0.05)'}`,
                filter: earned ? 'none' : 'grayscale(1)',
                opacity: earned ? 1 : 0.35,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              title={badge.desc}
              onMouseEnter={e => {
                if (earned) e.currentTarget.style.boxShadow = `0 0 16px ${badge.color}25`
              }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: earned ? `${badge.color}20` : 'rgba(255,255,255,0.03)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={earned ? badge.color : 'rgba(255,255,255,0.25)'}>
                  {badge.icon}
                </svg>
              </div>
              <p
                className="font-bold leading-tight"
                style={{
                  fontSize: 10,
                  color: earned ? badge.color : 'rgba(255,255,255,0.25)',
                  lineHeight: 1.2,
                }}
              >
                {badge.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Voir plus / Voir moins */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full text-xs font-bold py-2.5 rounded-xl transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(var(--ac-lt),0.4)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--ac-lt))'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
        >
          {showAll ? 'Voir moins ↑' : `Voir ${hiddenCount} de plus ↓`}
        </button>
      )}
    </div>
  )
}
