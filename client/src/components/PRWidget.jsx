import { useState, useEffect, useRef } from 'react'
import { animate } from 'animejs'

const LS_KEY = 'fittracker:pinned_prs'

const MUSCLE_COLORS = {
  'Pectoraux':  '#6366f1',
  'Dos':        '#10b981',
  'Épaules':    '#f59e0b',
  'Biceps':     '#ef4444',
  'Triceps':    '#a855f7',
  'Jambes':     '#3b82f6',
  'Abdominaux': '#14b8a6',
  'Autre':      '#71717a',
}

function loadPinned() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? []
  } catch {
    return []
  }
}

export default function PRWidget({ prs }) {
  const [pinned, setPinned] = useState(loadPinned)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const panelRef = useRef(null)
  const cardRefs = useRef({})
  const lastAddedId = useRef(null)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(pinned))
  }, [pinned])

  useEffect(() => {
    if (adding && panelRef.current) {
      animate(panelRef.current, { translateY: [-8, 0], opacity: [0, 1], duration: 280, easing: 'easeOutQuad' })
    }
  }, [adding])

  useEffect(() => {
    if (!lastAddedId.current) return
    const el = cardRefs.current[lastAddedId.current]
    if (el) {
      animate(el, { scale: [0.8, 1], opacity: [0, 1], duration: 380, easing: 'easeOutBack' })
      lastAddedId.current = null
    }
  }, [pinned])

  function addExercise(id) {
    if (!pinned.includes(id)) {
      lastAddedId.current = id
      setPinned((p) => [...p, id])
    }
    setAdding(false)
    setSearch('')
  }

  function removeExercise(id) {
    setPinned((p) => p.filter((x) => x !== id))
  }

  const prMap = Object.fromEntries((prs ?? []).map((p) => [p.exercise_id, p]))
  const pinnedData = pinned.map((id) => prMap[id]).filter(Boolean)

  const available = (prs ?? []).filter((p) => !pinned.includes(p.exercise_id))
  const filtered = search
    ? available.filter((p) => p.exercise_name.toLowerCase().includes(search.toLowerCase()))
    : available

  if (!prs) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Personal Records</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold transition-colors"
            style={{ color: 'rgba(var(--ac-l),0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.5)' }}
          >
            + Épingler un PR
          </button>
        )}
      </div>

      {/* Sélecteur d'exercice */}
      {adding && (
        <div
          ref={panelRef}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.12)' }}
        >
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="rgba(var(--ac-lt),0.3)">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un exercice…"
              className="w-full pl-8 pr-4 py-2 text-white text-sm rounded-lg outline-none placeholder:opacity-20"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
            />
          </div>
          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-sm px-2 py-3 text-center" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>Aucun résultat</p>
            )}
            {filtered.map((p) => {
              const color = MUSCLE_COLORS[p.muscle_group] || 'rgb(var(--ac-l))'
              return (
                <button
                  key={p.exercise_id}
                  onClick={() => addExercise(p.exercise_id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-all"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--ac),0.08)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                >
                  <span>{p.exercise_name}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{p.muscle_group}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => { setAdding(false); setSearch('') }}
            className="text-xs transition-colors"
            style={{ color: 'rgba(var(--ac-lt),0.25)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.25)' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Empty state */}
      {pinnedData.length === 0 && !adding && (
        <p className="text-sm" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>
          Aucun PR épinglé — clique sur "Épingler un PR" pour suivre tes records.
        </p>
      )}

      {/* Cartes PR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pinnedData.map((pr) => {
          const color = MUSCLE_COLORS[pr.muscle_group] || 'rgb(var(--ac-l))'
          return (
            <div
              key={pr.exercise_id}
              ref={(el) => { cardRefs.current[pr.exercise_id] = el }}
              className="rounded-xl p-4 relative group transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}30` }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.1)' }}
            >
              <button
                onClick={() => removeExercise(pr.exercise_id)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)' }}
              >
                ✕
              </button>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1 truncate"
                style={{ color: `${color}99` }}
              >
                {pr.muscle_group}
              </p>
              <p className="text-white text-sm font-medium truncate mb-2.5">{pr.exercise_name}</p>
              <p className="font-black text-2xl" style={{ color }}>
                {pr.weight_kg}
                <span className="text-sm font-normal ml-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>kg</span>
              </p>
              {pr.reps != null && (
                <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
                  1RM est. <span className="font-bold" style={{ color: `${color}cc` }}>{Math.round(pr.weight_kg * (1 + pr.reps / 30) * 10) / 10} kg</span>
                  <span className="ml-1.5" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>({pr.reps} reps)</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
