import { useReducer, useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { animate } from 'animejs'
import { createSession } from '../api/sessions'
import { getLastSession } from '../api/stats'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  name: '',
  date: new Date().toISOString().split('T')[0],
  duration_min: '',
  notes: '',
  exercises: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value }
    case 'SET_DATE':
      return { ...state, date: action.value }
    case 'SET_DURATION':
      return { ...state, duration_min: action.value }
    case 'SET_NOTES':
      return { ...state, notes: action.value }
    case 'ADD_EXERCISE':
      return {
        ...state,
        exercises: [
          ...state.exercises,
          { exercise_id: '', rest_seconds: 90, sets: [{ weight_kg: '', reps: '' }] },
        ],
      }
    case 'REMOVE_EXERCISE':
      return { ...state, exercises: state.exercises.filter((_, i) => i !== action.index) }
    case 'SET_EXERCISE_FIELD':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index ? { ...ex, [action.field]: action.value } : ex
        ),
      }
    case 'ADD_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? { ...ex, sets: [...ex.sets, action.prefill ?? { weight_kg: '', reps: '' }] }
            : ex
        ),
      }
    case 'REMOVE_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? { ...ex, sets: ex.sets.filter((_, j) => j !== action.setIndex) }
            : ex
        ),
      }
    case 'UPDATE_SET':
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.index
            ? {
                ...ex,
                sets: ex.sets.map((set, j) =>
                  j === action.setIndex ? { ...set, [action.field]: action.value } : set
                ),
              }
            : ex
        ),
      }
    case 'SET_TEMPLATE':
      return {
        ...state,
        name: action.template.name || '',
        notes: action.template.notes || '',
        exercises: action.template.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          rest_seconds: ex.rest_seconds ?? 90,
          sets: ex.sets.map((s) => ({
            weight_kg: s.weight_kg != null ? String(s.weight_kg) : '',
            reps: s.reps != null ? String(s.reps) : '',
          })),
        })),
      }
    default:
      return state
  }
}

// ─── Muscle icons ─────────────────────────────────────────────────────────────

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

function MuscleIcon({ muscle, size = 18 }) {
  const color = MUSCLE_COLORS[muscle] || 'rgb(var(--ac-l))'
  const icons = {
    'Pectoraux': (
      // Deux pectoraux en V symétrique
      <path d="M12 10c-1.5-2-4-3-6-2C4 9 4 11 5 13l7 6 7-6c1-2 1-4-1-5-2-1-4.5 0-6 2z" />
    ),
    'Dos': (
      // Dos large en V (trapèze + dorsaux)
      <path d="M5 8l7-4 7 4v4l-3 5-4-2-4 2-3-5z" />
    ),
    'Épaules': (
      // Deux épaules arrondies
      <>
        <circle cx="7" cy="10" r="3.5" />
        <circle cx="17" cy="10" r="3.5" />
        <path d="M7 13.5Q10 16 12 16Q14 16 17 13.5" fill="none" stroke={color} strokeWidth="1.5" />
      </>
    ),
    'Biceps': (
      // Bras avec renflement biceps
      <path d="M9 3h6l1 7q0 5-4 6.5L13 21h-2l1-4.5Q8 15 8 10z" />
    ),
    'Triceps': (
      // Arrière du bras
      <path d="M8 3h8l2 9q0 6-6 8-6-2-6-8z" />
    ),
    'Jambes': (
      // Deux cuisses / quadriceps
      <>
        <path d="M7 3h4l-1 10-1 8H7l-1-8z" />
        <path d="M13 3h4l1 10-1 8h-2l-1-8z" />
      </>
    ),
    'Abdominaux': (
      // Grille abdos 2×3
      <>
        {[4, 9, 14].map((y) => (
          <>
            <rect key={`l${y}`} x="8" y={y} width="3.5" height="3.5" rx="0.8" />
            <rect key={`r${y}`} x="12.5" y={y} width="3.5" height="3.5" rx="0.8" />
          </>
        ))}
      </>
    ),
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {icons[muscle] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  )
}

// ─── NumberControl avec clic pour saisie directe ──────────────────────────────

function NumberControl({ label, value, onChange, step = 1, min = 0 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const num = parseFloat(value) || 0

  function startEdit() {
    setDraft(value !== '' ? String(value) : '0')
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function commit() {
    const v = parseFloat(String(draft).replace(',', '.'))
    if (!isNaN(v) && v >= min) onChange(String(v))
    setEditing(false)
  }

  return (
    <div
      className="flex-1 rounded-2xl p-6 flex flex-col"
      style={{ background: 'rgba(30, 58, 138, 0.15)', border: '1px solid rgba(59, 130, 246, 0.12)' }}
    >
      <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'rgba(147, 197, 253, 0.45)' }}>
        {label}
      </p>
      <div className="flex items-center justify-between flex-1">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(min, Math.round((num - step) * 10) / 10)))}
          className="w-11 h-11 rounded-full flex items-center justify-center text-2xl text-blue-300 transition-all hover:text-white hover:scale-110"
          style={{ background: 'rgba(59, 130, 246, 0.15)' }}
        >
          −
        </button>

        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="text-center text-white font-black bg-transparent outline-none"
            style={{
              fontSize: '3.2rem',
              lineHeight: 1,
              width: '7rem',
              borderBottom: '2px solid rgba(59, 130, 246, 0.7)',
            }}
            min={min}
            step={step}
          />
        ) : (
          <span
            onClick={startEdit}
            title="Cliquer pour saisir directement"
            className="text-white font-black select-none transition-opacity hover:opacity-60 cursor-text"
            style={{ fontSize: '3.2rem', lineHeight: 1 }}
          >
            {value !== '' ? value : '0'}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(String(Math.round((num + step) * 10) / 10))}
          className="w-11 h-11 rounded-full flex items-center justify-center text-2xl text-blue-300 transition-all hover:text-white hover:scale-110"
          style={{ background: 'rgba(59, 130, 246, 0.15)' }}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Exercise groups for two-step picker ──────────────────────────────────────

const PICKER_GROUPS = {
  'Pectoraux': [
    { name: 'Développé incliné', variants: [
      { label: 'Machine',  fullName: 'Développé incliné machine' },
      { label: 'Barre',    fullName: 'Développé incliné barre' },
      { label: 'Haltères', fullName: 'Développé incliné haltères' },
    ]},
    { name: 'Développé couché', variants: [
      { label: 'Machine',  fullName: 'Développé couché machine' },
      { label: 'Barre',    fullName: 'Développé couché barre' },
      { label: 'Haltères', fullName: 'Développé couché haltères' },
    ]},
    { name: 'Pec deck', variants: [
      { label: 'Machine',  fullName: 'Pec deck machine' },
      { label: 'Poulies',  fullName: 'Pec deck poulies' },
    ]},
    { name: 'Écarté haltères',  variants: null },
    { name: 'Pompes',           variants: null },
  ],
  'Dos': [
    { name: 'Tractions',        variants: null },
    { name: 'Tirage vertical', variants: [
      { label: 'Machine',       fullName: 'Tirage vertical machine' },
      { label: 'Poulies',       fullName: 'Tirage vertical poulies' },
    ]},
    { name: 'Tirage horizontal machine', variants: [
      { label: 'Prise large',   fullName: 'Tirage horizontal machine prise large' },
      { label: 'Prise serrée',  fullName: 'Tirage horizontal machine prise serrée' },
    ]},
    { name: 'Tirage horizontal poulies', variants: [
      { label: 'Prise large',   fullName: 'Tirage horizontal poulies prise large' },
      { label: 'Prise serrée',  fullName: 'Tirage horizontal poulies prise serrée' },
    ]},
    { name: 'Tirage unilatéral poulies', variants: null },
    { name: 'Shrugs',           variants: null },
    { name: 'Soulevé de terre', variants: null },
    { name: 'Pullover',         variants: null },
  ],
  'Épaules': [
    { name: 'Développé militaire',  variants: null },
    { name: 'Élévations latérales', variants: null },
    { name: 'Oiseau',               variants: null },
  ],
  'Biceps': [
    { name: 'Curl marteau', variants: [
      { label: 'Poulies',  fullName: 'Curl marteau poulies' },
      { label: 'Haltères', fullName: 'Curl marteau haltères' },
    ]},
    { name: 'Curl classique', variants: null },
    { name: 'Curl barre',     variants: null },
    { name: 'Preacher curl', variants: [
      { label: 'Machine',  fullName: 'Preacher curl machine' },
      { label: 'Haltères', fullName: 'Preacher curl haltères' },
    ]},
  ],
  'Triceps': [
    { name: 'Pushdown poulies', variants: null },
    { name: 'Dips',             variants: null },
    { name: 'Kickback', variants: [
      { label: 'Poulies',  fullName: 'Kickback poulies' },
      { label: 'Haltères', fullName: 'Kickback haltères' },
    ]},
    { name: 'Skull crusher', variants: [
      { label: 'Haltères', fullName: 'Skull crusher haltères' },
      { label: 'Barre',    fullName: 'Skull crusher barre' },
    ]},
    { name: 'Extension horizontale poulies haute', variants: null },
  ],
  'Jambes': [
    { name: 'Presse à cuisses',        variants: null },
    { name: 'Squat',                   variants: null },
    { name: 'Leg extension',           variants: null },
    { name: 'Leg curl', variants: [
      { label: 'Assis',   fullName: 'Leg curl assis' },
      { label: 'Allongé', fullName: 'Leg curl allongé' },
    ]},
    { name: 'Fentes bulgares',         variants: null },
    { name: 'Hip-thrust',              variants: null },
    { name: 'Hack squat',              variants: null },
    { name: 'Soulevé de terre roumain', variants: null },
    { name: 'Extension mollet', variants: [
      { label: 'Machine',    fullName: 'Extension mollet machine' },
      { label: 'Presse',     fullName: 'Extension mollet presse' },
      { label: 'Barre',      fullName: 'Extension mollet barre' },
      { label: 'Hack squat', fullName: 'Extension mollet hack squat' },
    ]},
  ],
  'Abdominaux': [
    { name: 'Crunchs',           variants: null },
    { name: 'Planche',           variants: null },
    { name: 'Relevés de jambes', variants: null },
  ],
}

// ─── ExercisePicker modal ─────────────────────────────────────────────────────

function ExercisePicker({ options, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('Tous')
  const [pickerStep, setPickerStep] = useState('groups')
  const [pendingGroup, setPendingGroup] = useState(null)
  const searchRef = useRef(null)
  const [favs, setFavs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fittracker:fav_exercises') || '[]')
    } catch {
      return []
    }
  })

  // name → id lookup
  const nameToId = {}
  for (const ex of options) nameToId[ex.name] = ex.id

  function toggleFav(e, exId) {
    e.stopPropagation()
    setFavs((prev) => {
      const next = prev.includes(exId) ? prev.filter((id) => id !== exId) : [...prev, exId]
      localStorage.setItem('fittracker:fav_exercises', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => { searchRef.current?.focus() }, [])

  const muscles = ['Tous', ...Object.keys(PICKER_GROUPS)]
  const isSearching = search !== ''

  // flat list used in search mode and favorites
  const flatFiltered = options.filter((e) => {
    const matchMuscle = muscleFilter === 'Tous' || e.muscle_group === muscleFilter
    const matchSearch = !isSearching || e.name.toLowerCase().includes(search.toLowerCase())
    return matchMuscle && matchSearch
  })
  const flatGrouped = flatFiltered.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Autre'
    ;(acc[g] = acc[g] || []).push(ex)
    return acc
  }, {})

  const groupedEntries = Object.entries(PICKER_GROUPS).filter(
    ([muscle]) => muscleFilter === 'Tous' || muscle === muscleFilter
  )

  function handleGroupItemClick(item, muscle) {
    if (!item.variants) {
      const id = nameToId[item.name]
      if (id != null) { onSelect(id); onClose() }
    } else {
      setPendingGroup({ ...item, muscle })
      setPickerStep('variants')
    }
  }

  function handleVariantClick(fullName) {
    const id = nameToId[fullName]
    if (id != null) { onSelect(id); onClose() }
  }

  function FlatExerciseButton({ ex }) {
    const color = MUSCLE_COLORS[ex.muscle_group] || '#3b82f6'
    const isFav = favs.includes(ex.id)
    return (
      <button
        onClick={() => { onSelect(ex.id); onClose() }}
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
        style={{ color: 'rgba(255,255,255,0.65)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.color = 'white' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <MuscleIcon muscle={ex.muscle_group} size={16} />
        </div>
        <span className="font-medium text-sm flex-1">{ex.name}</span>
        <button
          onClick={(e) => toggleFav(e, ex.id)}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all"
          style={{ color: isFav ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f59e0b' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isFav ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFav ? '★' : '☆'}
        </button>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0c1a35 0%, #060e1e 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          maxHeight: '82vh',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: 'rgba(255,255,255,0.15)' }} />

          {pickerStep === 'variants' && pendingGroup ? (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => { setPickerStep('groups'); setPendingGroup(null) }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                ‹
              </button>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base leading-none">{pendingGroup.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: MUSCLE_COLORS[pendingGroup.muscle] || '#3b82f6' }}>
                  {pendingGroup.muscle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-zinc-500 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base">Choisir un exercice</h3>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-zinc-500 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="rgba(var(--ac-lt),0.3)">
                  <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white text-sm outline-none placeholder:text-blue-950"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--ac),0.15)' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Muscle filter pills — groups step only */}
        {pickerStep === 'groups' && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0" style={{ borderBottom: '1px solid rgba(var(--ac),0.08)' }}>
            {muscles.map((m) => {
              const isActive = muscleFilter === m
              const color = MUSCLE_COLORS[m] || 'rgb(var(--ac-l))'
              return (
                <button
                  key={m}
                  onClick={() => setMuscleFilter(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                  style={{
                    background: isActive ? `${color}22` : 'rgba(255,255,255,0.04)',
                    border: isActive ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? color : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {m !== 'Tous' ? (
                    <MuscleIcon muscle={m} size={13} />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                    </svg>
                  )}
                  {m}
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-3">

          {/* ── VARIANTS STEP ── */}
          {pickerStep === 'variants' && pendingGroup && (
            <div className="flex flex-col gap-2 pt-1">
              {pendingGroup.variants.map((v) => {
                const color = MUSCLE_COLORS[pendingGroup.muscle] || '#3b82f6'
                const id = nameToId[v.fullName]
                const isFav = id != null && favs.includes(id)
                return (
                  <button
                    key={v.fullName}
                    onClick={() => handleVariantClick(v.fullName)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
                    style={{ background: `${color}10`, border: `1px solid ${color}25`, color: 'rgba(255,255,255,0.8)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${color}22`
                      e.currentTarget.style.color = 'white'
                      e.currentTarget.style.borderColor = `${color}55`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${color}10`
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                      e.currentTarget.style.borderColor = `${color}25`
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                      <MuscleIcon muscle={pendingGroup.muscle} size={18} />
                    </div>
                    <span className="font-semibold text-sm flex-1">{v.label}</span>
                    {id != null && (
                      <button
                        onClick={(e) => toggleFav(e, id)}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all"
                        style={{ color: isFav ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f59e0b' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = isFav ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
                        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── GROUPS STEP ── */}
          {pickerStep === 'groups' && (
            <>
              {/* Search mode → flat list */}
              {isSearching ? (
                <>
                  {Object.entries(flatGrouped).map(([muscle, exercises]) => (
                    <div key={muscle} className="mb-4">
                      {muscleFilter === 'Tous' && (
                        <div className="flex items-center gap-2 px-2 mb-2">
                          <MuscleIcon muscle={muscle} size={13} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUSCLE_COLORS[muscle] || 'rgb(var(--ac-l))' }}>
                            {muscle}
                          </span>
                          <div className="flex-1 h-px" style={{ background: `${MUSCLE_COLORS[muscle] || '#3b82f6'}20` }} />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {exercises.map((ex) => <FlatExerciseButton key={ex.id} ex={ex} />)}
                      </div>
                    </div>
                  ))}
                  {flatFiltered.length === 0 && (
                    <p className="text-center py-12 text-sm" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>
                      Aucun exercice trouvé
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Favorites */}
                  {favs.length > 0 && muscleFilter === 'Tous' && (() => {
                    const favExercises = options.filter((e) => favs.includes(e.id))
                    if (favExercises.length === 0) return null
                    return (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 px-2 mb-2">
                          <span style={{ fontSize: 13 }}>⭐</span>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>Favoris</span>
                          <div className="flex-1 h-px" style={{ background: '#f59e0b20' }} />
                        </div>
                        <div className="space-y-0.5">
                          {favExercises.map((ex) => <FlatExerciseButton key={ex.id} ex={ex} />)}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Two-step grouped list */}
                  {groupedEntries.map(([muscle, items]) => {
                    const color = MUSCLE_COLORS[muscle] || '#3b82f6'
                    return (
                      <div key={muscle} className="mb-4">
                        {muscleFilter === 'Tous' && (
                          <div className="flex items-center gap-2 px-2 mb-2">
                            <MuscleIcon muscle={muscle} size={13} />
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                              {muscle}
                            </span>
                            <div className="flex-1 h-px" style={{ background: `${color}20` }} />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {items.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => handleGroupItemClick(item, muscle)}
                              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                              style={{ color: 'rgba(255,255,255,0.65)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${color}12`
                                e.currentTarget.style.color = 'white'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                              }}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                                <MuscleIcon muscle={muscle} size={16} />
                              </div>
                              <span className="font-medium text-sm flex-1">{item.name}</span>
                              {item.variants && (
                                <span className="text-base font-light" style={{ color: `${color}99` }}>›</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function NewSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [exerciseOptions, setExerciseOptions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [activeExIdx, setActiveExIdx] = useState(0)
  const [activeSetIdx, setActiveSetIdx] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const successRef = useRef(null)

  // ── Timer de séance ──────────────────────────────────────────────────────────
  const sessionStartRef = useRef(Date.now())
  const [sessionElapsed, setSessionElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Chronomètre de repos ─────────────────────────────────────────────────────
  const [rest, setRest] = useState({ active: false, total: 90, remaining: 90 })
  const restIntervalRef = useRef(null)

  const startRest = useCallback((seconds) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    setRest({ active: true, total: seconds, remaining: seconds })
    restIntervalRef.current = setInterval(() => {
      setRest((prev) => {
        if (prev.remaining <= 1) {
          clearInterval(restIntervalRef.current)
          return { ...prev, active: false, remaining: 0 }
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
  }, [])

  useEffect(() => () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }, [])

  // ── Dernière perf par exercice ───────────────────────────────────────────────
  const [lastPerf, setLastPerf] = useState({})

  useEffect(() => {
    fetch(`${API}/api/exercises`).then((r) => r.json()).then(setExerciseOptions).catch(() => {})
  }, [])

  useEffect(() => {
    const tpl = location.state?.template
    if (tpl) {
      dispatch({ type: 'SET_TEMPLATE', template: tpl })
    }
  }, [])

  useEffect(() => {
    if (success && successRef.current) {
      animate(successRef.current, { opacity: [0, 1], scale: [0.85, 1], duration: 500, easing: 'easeOutBack' })
      const t = setTimeout(() => navigate('/'), 1800)
      return () => clearTimeout(t)
    }
  }, [success, navigate])

  const submitBtnRef = useRef(null)

  // Pop-in animation when active set / exercise changes
  const setFormRef = useRef(null)
  useEffect(() => {
    if (!setFormRef.current) return
    animate(setFormRef.current, { scale: [0.96, 1], opacity: [0.6, 1], duration: 280, easing: 'easeOutBack' })
  }, [activeSetIdx, activeExIdx])

  // Ajuste activeExIdx si l'exercice actif est supprimé
  useEffect(() => {
    if (state.exercises.length > 0 && activeExIdx >= state.exercises.length) {
      setActiveExIdx(state.exercises.length - 1)
      setActiveSetIdx(0)
    }
  }, [state.exercises.length, activeExIdx])

  // Ajuste activeSetIdx si la série active est supprimée
  const activeEx = state.exercises[activeExIdx]
  useEffect(() => {
    if (activeEx && activeSetIdx >= activeEx.sets.length) {
      setActiveSetIdx(Math.max(0, activeEx.sets.length - 1))
    }
  }, [activeEx?.sets.length, activeSetIdx])

  // Ouvre le picker automatiquement si nouvel exercice sans ID
  useEffect(() => {
    if (activeEx && activeEx.exercise_id === '') {
      setShowPicker(true)
    }
  }, [activeExIdx, state.exercises.length])

  // Charge la dernière perf quand on sélectionne un exercice
  const activeExerciseId = state.exercises[activeExIdx]?.exercise_id
  useEffect(() => {
    if (!activeExerciseId || lastPerf[activeExerciseId] !== undefined) return
    getLastSession(token, activeExerciseId)
      .then((rows) => setLastPerf((prev) => ({ ...prev, [activeExerciseId]: rows })))
      .catch(() => setLastPerf((prev) => ({ ...prev, [activeExerciseId]: [] })))
  }, [activeExerciseId, token])

  function addExercise() {
    dispatch({ type: 'ADD_EXERCISE' })
    setActiveExIdx(state.exercises.length)
    setActiveSetIdx(0)
  }

  function validateSet() {
    const restSecs = activeEx?.rest_seconds ?? 90
    startRest(restSecs)
    if (activeSetIdx < activeEx.sets.length - 1) {
      setActiveSetIdx((i) => i + 1)
    } else {
      const cur = activeEx.sets[activeSetIdx]
      dispatch({ type: 'ADD_SET', index: activeExIdx, prefill: { weight_kg: cur.weight_kg, reps: cur.reps } })
      setActiveSetIdx(activeEx.sets.length)
    }
  }

  async function handleSubmit() {
    setError('')
    if (state.exercises.length === 0) {
      setError('Ajoute au moins un exercice.')
      if (submitBtnRef.current) {
        animate(submitBtnRef.current, { translateX: [-5, 5, -5, 5, -2, 2, 0], duration: 380, easing: 'linear' })
      }
      return
    }
    for (const ex of state.exercises) {
      if (!ex.exercise_id) return setError('Sélectionne un exercice pour chaque ligne.')
    }
    setLoading(true)
    try {
      await createSession(token, {
        name: state.name,
        session_date: state.date,
        duration_min: state.duration_min !== '' ? Number(state.duration_min) : null,
        notes: state.notes || null,
        exercises: state.exercises.map((ex, i) => ({
          exercise_id: ex.exercise_id,
          rest_seconds: ex.rest_seconds,
          order_index: i,
          sets: ex.sets.map((s) => ({
            weight_kg: s.weight_kg !== '' ? Number(s.weight_kg) : null,
            reps: s.reps !== '' ? Number(s.reps) : null,
          })),
        })),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activeSet = activeEx?.sets[activeSetIdx]
  const activeName = activeEx
    ? exerciseOptions.find((e) => e.id === activeEx.exercise_id)?.name
    : null
  const activeMuscle = activeEx
    ? exerciseOptions.find((e) => e.id === activeEx.exercise_id)?.muscle_group
    : null
  const currentLastPerf = activeEx ? (lastPerf[activeEx.exercise_id] ?? null) : null

  function fmtElapsed(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <div
          className="w-72 shrink-0 flex flex-col p-5 overflow-y-auto"
          style={{ borderRight: '1px solid rgba(59, 130, 246, 0.08)' }}
        >
          {/* Timer de séance */}
          <div
            className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.1)' }}
          >
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(147,197,253,0.45)">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(147,197,253,0.35)' }}>Durée</span>
            </div>
            <span className="text-sm font-black tabular-nums" style={{ color: 'rgba(147,197,253,0.7)' }}>
              {fmtElapsed(sessionElapsed)}
            </span>
          </div>

          {/* Session meta */}
          <div className="mb-5 space-y-3">
            <input
              type="text"
              value={state.name}
              onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
              placeholder="Nom de la séance"
              className="w-full bg-transparent text-white text-lg font-bold outline-none pb-2 placeholder:text-blue-950 transition-colors"
              style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>Date</p>
                <input
                  type="date"
                  value={state.date}
                  onChange={(e) => dispatch({ type: 'SET_DATE', value: e.target.value })}
                  required
                  className="w-full text-white text-xs rounded-lg px-2.5 py-2 outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>Durée (min)</p>
                <input
                  type="number"
                  value={state.duration_min}
                  onChange={(e) => dispatch({ type: 'SET_DURATION', value: e.target.value })}
                  placeholder="—"
                  min="1"
                  className="w-full text-white text-xs rounded-lg px-2.5 py-2 outline-none placeholder:text-blue-950"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>Notes</p>
            <textarea
              value={state.notes}
              onChange={(e) => dispatch({ type: 'SET_NOTES', value: e.target.value })}
              placeholder="Comment s'est passée la séance…"
              rows={3}
              className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none resize-none placeholder:opacity-20"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.35)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.12)' }}
            />
          </div>

          {/* Separateur */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--ac),0.08)' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>Exercices</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--ac),0.08)' }} />
          </div>

          {/* Exercise list */}
          <div className="flex-1 space-y-1.5">
            {state.exercises.map((ex, i) => {
              const name = exerciseOptions.find((e) => e.id === ex.exercise_id)?.name
              const muscle = exerciseOptions.find((e) => e.id === ex.exercise_id)?.muscle_group
              const isActive = i === activeExIdx
              const color = MUSCLE_COLORS[muscle] || '#3b82f6'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setActiveExIdx(i); setActiveSetIdx(0) }}
                  className="w-full text-left rounded-xl p-3.5 transition-all"
                  style={{
                    background: isActive ? `${color}12` : 'rgba(255,255,255,0.02)',
                    border: isActive ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: muscle ? `${color}20` : 'rgba(var(--ac),0.1)' }}
                    >
                      {muscle ? (
                        <MuscleIcon muscle={muscle} size={15} />
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(var(--ac),0.4)">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isActive && (
                        <p className="flex items-center gap-1 text-xs font-semibold mb-0.5" style={{ color }}>
                          <span className="w-1 h-1 rounded-full inline-block animate-pulse" style={{ background: color }} />
                          En cours
                        </p>
                      )}
                      <p className={`font-semibold text-sm truncate ${name ? 'text-white' : 'text-blue-900'}`}>
                        {name || 'Choisir un exercice…'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {ex.sets.length} série{ex.sets.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Add exercise button */}
          <button
            type="button"
            onClick={addExercise}
            className="mt-4 w-full rounded-xl py-2.5 text-xs font-semibold transition-all"
            style={{ border: '1px dashed rgba(var(--ac),0.2)', color: 'rgba(var(--ac-l),0.4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.5)'; e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.2)'; e.currentTarget.style.color = 'rgba(var(--ac-l),0.4)' }}
          >
            + Ajouter un exercice
          </button>

          {error && (
            <p
              className="mt-3 text-xs rounded-xl px-3 py-2.5 leading-relaxed"
              style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </p>
          )}

          <button
            ref={submitBtnRef}
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full font-bold rounded-xl py-3 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
              boxShadow: '0 4px 20px rgba(var(--ac-d),0.3)',
              opacity: state.exercises.length === 0 ? 0.2 : undefined,
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = '0 4px 28px rgba(var(--ac-d),0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--ac-d),0.3)' }}
          >
            {loading ? 'Enregistrement…' : 'Terminer la séance'}
          </button>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-10 overflow-y-auto">
          {!activeEx ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(var(--ac-dd),0.15)', border: '1px solid rgba(var(--ac),0.1)' }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(var(--ac),0.3)">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>Aucun exercice</p>
              <p className="text-sm mt-2" style={{ color: 'rgba(var(--ac-lt),0.12)' }}>Ajoute un exercice pour commencer</p>
            </div>
          ) : (
            <div className="max-w-xl w-full">
              {/* SET indicator */}
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: 'rgba(var(--ac-lt),0.4)' }}
              >
                Série {activeSetIdx + 1} sur {activeEx.sets.length}
              </p>

              {/* Exercise name */}
              {activeName ? (
                <div className="mb-8 flex items-start gap-4">
                  {activeMuscle && (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1"
                      style={{ background: `${MUSCLE_COLORS[activeMuscle] || '#3b82f6'}18` }}
                    >
                      <MuscleIcon muscle={activeMuscle} size={26} />
                    </div>
                  )}
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">
                      {activeName}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowPicker(true)}
                      className="text-xs mt-2 transition-colors"
                      style={{ color: 'rgba(var(--ac-l),0.35)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.35)' }}
                    >
                      Changer d'exercice
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="w-full text-left rounded-2xl p-5 mb-8 transition-all flex items-center gap-4"
                  style={{ background: 'rgba(var(--ac-d),0.1)', border: '1px dashed rgba(var(--ac),0.3)', color: 'rgba(var(--ac-lt),0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.6)'; e.currentTarget.style.color = 'rgb(var(--ac-lt))' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.3)'; e.currentTarget.style.color = 'rgba(var(--ac-lt),0.5)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--ac),0.15)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Sélectionner un exercice</p>
                    <p className="text-xs mt-0.5 opacity-60">Cliquer pour ouvrir le catalogue</p>
                  </div>
                </button>
              )}

              {/* Chronomètre de repos */}
              {rest.active && (
                <div
                  className="mb-6 rounded-2xl px-5 py-4 flex items-center justify-between"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(59,130,246,0.15)' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#60a5fa">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(147,197,253,0.45)' }}>Repos</p>
                      <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtElapsed(rest.remaining)}</p>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="flex-1 mx-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(rest.remaining / rest.total) * 100}%`,
                        background: rest.remaining > rest.total * 0.3
                          ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                          : 'linear-gradient(90deg, #f97316, #fb923c)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); setRest((r) => ({ ...r, active: false })) }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(59,130,246,0.12)', color: 'rgba(147,197,253,0.6)', border: '1px solid rgba(59,130,246,0.2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'white' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(147,197,253,0.6)' }}
                  >
                    Passer
                  </button>
                </div>
              )}

              {/* Dernière perf */}
              {currentLastPerf && currentLastPerf.length > 0 && (
                <div
                  className="mb-6 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Dernière fois · {currentLastPerf[0]?.session_date
                      ? new Date(currentLastPerf[0].session_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentLastPerf.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        <span className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.2)' }}>S{s.set_number}</span>
                        <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {s.weight_kg != null ? `${s.weight_kg} kg` : '—'} × {s.reps != null ? s.reps : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NumberControls */}
              <div ref={setFormRef} className="flex gap-4 mb-5">
                <NumberControl
                  label="Résistance (kg)"
                  value={activeSet?.weight_kg ?? ''}
                  step={2.5}
                  onChange={(val) =>
                    dispatch({ type: 'UPDATE_SET', index: activeExIdx, setIndex: activeSetIdx, field: 'weight_kg', value: val })
                  }
                />
                <NumberControl
                  label="Répétitions"
                  value={activeSet?.reps ?? ''}
                  step={1}
                  onChange={(val) =>
                    dispatch({ type: 'UPDATE_SET', index: activeExIdx, setIndex: activeSetIdx, field: 'reps', value: val })
                  }
                />
              </div>

              {/* Repos */}
              <div className="flex items-center gap-3 mb-8">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(var(--ac-lt),0.3)">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>Repos</span>
                <input
                  type="number"
                  value={activeEx.rest_seconds}
                  onChange={(e) =>
                    dispatch({ type: 'SET_EXERCISE_FIELD', index: activeExIdx, field: 'rest_seconds', value: Number(e.target.value) })
                  }
                  className="w-16 text-white text-sm rounded-lg px-2 py-1.5 outline-none text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--ac),0.12)' }}
                  min="0"
                />
                <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>sec</span>
              </div>

              {/* Validate button */}
              <button
                type="button"
                onClick={validateSet}
                className="w-full font-black rounded-2xl py-5 uppercase tracking-widest text-base flex items-center justify-center gap-3 transition-all mb-4"
                style={{
                  background: 'rgba(var(--ac-d),0.18)',
                  border: '1px solid rgba(var(--ac),0.35)',
                  color: 'rgb(var(--ac-lt))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(var(--ac-d),0.32)'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.borderColor = 'rgba(var(--ac),0.6)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(var(--ac-d),0.18)'
                  e.currentTarget.style.color = 'rgb(var(--ac-lt))'
                  e.currentTarget.style.borderColor = 'rgba(var(--ac),0.35)'
                }}
              >
                {activeSetIdx < activeEx.sets.length - 1 ? 'Série suivante' : 'Valider la série'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </button>

              {/* Nav row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSetIdx((i) => Math.max(0, i - 1))}
                  disabled={activeSetIdx === 0}
                  className="flex-1 rounded-xl py-2.5 text-xs font-medium transition-colors disabled:opacity-20"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                >
                  ← Préc.
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_SET', index: activeExIdx, setIndex: activeSetIdx })}
                  disabled={activeEx.sets.length <= 1}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium transition-all disabled:opacity-20"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
                >
                  − Série
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_EXERCISE', index: activeExIdx })}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
                >
                  ✕ Exercice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Exercise picker modal ─────────────────────────────────────────── */}
      {showPicker && (
        <ExercisePicker
          options={exerciseOptions}
          onSelect={(id) => dispatch({ type: 'SET_EXERCISE_FIELD', index: activeExIdx, field: 'exercise_id', value: id })}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Success overlay ───────────────────────────────────────────────── */}
      {success && (
        <div
          ref={successRef}
          className="fixed inset-0 flex items-center justify-center opacity-0"
          style={{ background: 'linear-gradient(135deg, #020810 0%, #080f1f 100%)' }}
        >
          <div className="text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(var(--ac-d),0.2)', border: '2px solid rgba(var(--ac),0.4)' }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#60a5fa">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-white">Séance enregistrée !</p>
            <p className="text-sm mt-3" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Redirection vers le dashboard…</p>
          </div>
        </div>
      )}

    </div>
  )
}
