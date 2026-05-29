import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate } from 'animejs'
import ProgressChart from '../components/ProgressChart'
import { useAuth } from '../hooks/useAuth'
import { getSessions, getSession, deleteSession } from '../api/sessions'
import { getPRs, getProgress } from '../api/stats'

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

const RANGE_OPTIONS = [
  { label: '7 derniers jours',  days: 7 },
  { label: '30 derniers jours', days: 30 },
  { label: '90 derniers jours', days: 90 },
  { label: 'Toute la période',  days: 9999 },
]

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

function formatDuration(min) {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Mini progress chart wrapper ──────────────────────────────────────────────
function ProgressChartInline({ exoId }) {
  const { token } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!exoId) return
    setLoading(true)
    getProgress(token, exoId).then(setData).finally(() => setLoading(false))
  }, [exoId, token])
  if (loading) return <div className="h-28 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
  return <ProgressChart data={data} />
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({ session, prMap, onDelete, deleting, onSelectExo, selectedExoId }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (confirmDelete && confirmRef.current)
      animate(confirmRef.current, { scale: [0.9, 1.05, 1], duration: 320, easing: 'easeOutBack' })
  }, [confirmDelete])

  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s2, set) => s2 + (set.weight_kg ?? 0) * (set.reps ?? 0), 0), 0
  )
  const topExercise = session.exercises.reduce((best, ex) => {
    const vol = ex.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
    return vol > (best?.vol ?? 0) ? { ...ex, vol } : best
  }, null)

  return (
    <div className="h-full flex flex-col">
      {/* Detail header */}
      <div
        className="px-8 py-6 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {formatDateShort(session.session_date)}
            </p>
            <h2 className="font-black uppercase tracking-tight text-white leading-none" style={{ fontSize: '1.6rem' }}>
              {session.name || 'Séance sans nom'}
            </h2>
          </div>
          <button
            onClick={() => navigate(`/sessions/${session.id}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            title="Voir la page complète"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Summary metrics */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Résumé de séance
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Exercice principal', value: topExercise?.exercise_name ?? '—', truncate: true },
              { label: 'Volume total', value: `${Math.round(totalVolume).toLocaleString('fr-FR')} kg` },
              { label: 'Durée', value: formatDuration(session.duration_min) },
              { label: 'Exercices', value: session.exercises.length },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  {stat.label}
                </p>
                <p className={`font-bold text-white text-sm ${stat.truncate ? 'truncate' : ''}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise log */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Détail des exercices
          </p>
          <div className="space-y-3">
            {session.exercises.map((ex) => {
              const color = MUSCLE_COLORS[ex.muscle_group] || '#3b82f6'
              const maxWeight = Math.max(...ex.sets.map(s => s.weight_kg ?? 0))
              const isGlobalPR = prMap[ex.exercise_id] != null && maxWeight >= prMap[ex.exercise_id]
              return (
                <div key={ex.se_id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Exercise header */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
                      />
                      <span className="font-bold text-sm text-white">{ex.exercise_name}</span>
                    </div>
                    {isGlobalPR && (
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-md tracking-wider"
                        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
                      >
                        PR
                      </span>
                    )}
                  </div>

                  {/* Sets */}
                  <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                    {ex.sets.map((set) => {
                      const isBest = set.weight_kg === maxWeight && set.weight_kg > 0
                      const isPR = isBest && isGlobalPR
                      return (
                        <div
                          key={set.set_number}
                          className="flex items-center px-4 py-2.5 transition-colors"
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.025)',
                            background: isPR ? 'rgba(251,191,36,0.04)' : 'transparent',
                          }}
                        >
                          <span
                            className="text-xs font-black uppercase tracking-widest w-14 shrink-0"
                            style={{ color: isPR ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.2)' }}
                          >
                            Set {set.set_number}
                          </span>
                          <span
                            className="font-semibold text-sm flex-1"
                            style={{ color: isPR ? '#fde68a' : 'rgba(255,255,255,0.7)' }}
                          >
                            {set.weight_kg != null ? set.weight_kg : '—'} KG × {set.reps != null ? set.reps : '—'}
                          </span>
                          {isPR && (
                            <span className="text-xs font-black tracking-wider" style={{ color: '#fbbf24' }}>(PR)</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progression chart */}
        {session.exercises.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Progression
              </p>
              <select
                value={selectedExoId ?? ''}
                onChange={e => onSelectExo(Number(e.target.value))}
                className="text-xs rounded-lg px-2.5 py-1.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                {session.exercises.map(ex => (
                  <option key={ex.exercise_id} value={ex.exercise_id} style={{ background: '#080f1f' }}>
                    {ex.exercise_name}
                  </option>
                ))}
              </select>
            </div>
            <ProgressChartInline exoId={selectedExoId} />
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Notes</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{session.notes}</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="shrink-0 px-8 py-5 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => navigate('/new', { state: { template: session } })}
          className="flex-1 text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all"
          style={{
            background: 'rgba(var(--ac-d),0.15)',
            border: '1px solid rgba(var(--ac),0.25)',
            color: 'rgb(var(--ac-l))',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--ac-d),0.3)'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--ac-d),0.15)'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.25)' }}
        >
          Répéter la séance
        </button>

        {confirmDelete ? (
          <div ref={confirmRef} className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Confirmer ?</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-xs font-bold px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {deleting ? '…' : 'Oui'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Non
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold px-4 py-3 rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function History() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [prMap, setPrMap] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedExoId, setSelectedExoId] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rangeIdx, setRangeIdx] = useState(1)
  const [showRangeMenu, setShowRangeMenu] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const detailRef = useRef(null)

  useEffect(() => {
    if (!selectedSession || !detailRef.current) return
    animate(detailRef.current, { opacity: [0, 1], translateX: [8, 0], duration: 280, easing: 'easeOutQuad' })
  }, [selectedSession])

  useEffect(() => {
    Promise.all([getSessions(token), getPRs(token)])
      .then(([s, prs]) => {
        setSessions(s)
        setPrMap(Object.fromEntries(prs.map(p => [p.exercise_id, p.weight_kg])))
        if (s.length > 0) loadDetail(s[0].id)
      })
      .finally(() => setLoadingList(false))
  }, [token])

  function loadDetail(id) {
    setSelectedId(id)
    setLoadingDetail(true)
    setSelectedSession(null)
    setMobileView('detail')
    getSession(token, id)
      .then(s => {
        setSelectedSession(s)
        if (s.exercises.length > 0) setSelectedExoId(s.exercises[0].exercise_id)
      })
      .finally(() => setLoadingDetail(false))
  }

  async function handleDelete() {
    if (!selectedId) return
    setDeleting(true)
    try {
      await deleteSession(token, selectedId)
      const updated = sessions.filter(s => s.id !== selectedId)
      setSessions(updated)
      setSelectedSession(null)
      setSelectedId(null)
      if (updated.length > 0) loadDetail(updated[0].id)
    } finally {
      setDeleting(false)
    }
  }

  // Filter by date range
  const cutoff = RANGE_OPTIONS[rangeIdx].days === 9999
    ? null
    : new Date(Date.now() - RANGE_OPTIONS[rangeIdx].days * 86400000)

  const filtered = sessions.filter(s => {
    if (!cutoff) return true
    return new Date(s.session_date + 'T00:00:00') >= cutoff
  })

  return (
    <div
      className="flex flex-col overflow-hidden text-white"
      style={{ height: '100dvh' }}
      style={{ background: 'linear-gradient(160deg, #020810 0%, #060d1c 50%, #020810 100%)' }}
    >
      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-end justify-between px-4 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Title — back button on mobile detail view */}
        <div className="min-w-0">
          {mobileView === 'detail' && (
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-xs font-bold mb-2 md:hidden"
              style={{ color: 'rgba(var(--ac-l),0.6)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Retour à la liste
            </button>
          )}
          <h1 className="font-black uppercase leading-none truncate" style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', letterSpacing: '-0.02em' }}>
            Historique{' '}
            <span
              className="italic"
              style={{
                background: 'linear-gradient(90deg, rgb(var(--ac-l)), rgb(var(--ac-d)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              des séances
            </span>
          </h1>
          <p className="hidden md:block text-xs mt-2 font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Visualise ta progression vers le sommet
          </p>
        </div>

        {/* Filters — hidden on mobile detail view */}
        <div className={`flex items-center gap-3 shrink-0 ${mobileView === 'detail' ? 'hidden md:flex' : ''}`}>
          {/* Range picker */}
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu(v => !v)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.65)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
              </svg>
              {RANGE_OPTIONS[rangeIdx].label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
              </svg>
            </button>
            {showRangeMenu && (
              <div
                className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50 min-w-max"
                style={{ background: '#0c1830', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
              >
                {RANGE_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => { setRangeIdx(i); setShowRangeMenu(false) }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{
                      color: i === rangeIdx ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.4)',
                      background: i === rangeIdx ? 'rgba(var(--ac),0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (i !== rangeIdx) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (i !== rangeIdx) e.currentTarget.style.background = 'transparent' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/new')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(var(--ac-d),0.9), rgba(var(--ac-dd),0.9))',
              border: '1px solid rgba(var(--ac),0.4)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(var(--ac-d),0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(var(--ac-d),0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--ac-d),0.3)' }}
          >
            + Nouvelle séance
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT — session table ─────────────────────────────────────────── */}
        <div
          className={`${mobileView === 'detail' ? 'hidden md:flex' : 'flex'} flex-col overflow-hidden w-full md:w-115 md:shrink-0`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >

          {/* Column headers */}
          <div
            className="grid shrink-0 px-6 py-3"
            style={{
              gridTemplateColumns: '1fr 72px 96px 110px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            {['Détail séance', 'Durée', 'Volume', 'Action'].map(h => (
              <span key={h} className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.18)' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Aucune séance sur cette période.</p>
                <button onClick={() => navigate('/new')} className="text-xs font-bold px-4 py-2 rounded-xl text-white" style={{ background: 'rgba(var(--ac-d),0.3)', border: '1px solid rgba(var(--ac),0.3)' }}>
                  + Ajouter
                </button>
              </div>
            ) : (
              filtered.map((s, i) => {
                const isSelected = s.id === selectedId
                const prCount = s.pr_count ?? 0
                return (
                  <div
                    key={s.id}
                    onClick={() => loadDetail(s.id)}
                    className="grid items-center px-5 py-4 cursor-pointer transition-all mx-3 my-1 rounded-2xl"
                    style={{
                      gridTemplateColumns: '1fr 72px 96px 110px',
                      background: isSelected ? 'rgba(var(--ac-d),0.14)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.04)'}`,
                      boxShadow: isSelected ? '0 0 0 1px rgba(var(--ac),0.1) inset' : 'none',
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' } }}
                  >
                    {/* Séance detail */}
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {formatDateShort(s.session_date)}
                      </p>
                      <p className="font-black uppercase text-white text-sm truncate leading-tight tracking-tight">
                        {s.name || 'Séance sans nom'}
                      </p>
                    </div>

                    {/* Duration */}
                    <div>
                      <span className="font-bold text-sm text-white">{s.duration_min ?? '—'}</span>
                      {s.duration_min && <span className="text-xs ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>min</span>}
                    </div>

                    {/* Volume */}
                    <div>
                      {s.volume > 0 ? (
                        <>
                          <span className="font-bold text-sm text-white">
                            {s.volume >= 1000 ? `${(s.volume / 1000).toFixed(1)}t` : Math.round(s.volume).toLocaleString('fr-FR')}
                          </span>
                          <span className="text-xs ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>kg</span>
                        </>
                      ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </div>

                    {/* Action */}
                    <div>
                      <span
                        className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all"
                        style={{
                          background: isSelected ? 'rgba(var(--ac),0.2)' : 'rgba(255,255,255,0.06)',
                          color: isSelected ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.35)',
                          border: `1px solid ${isSelected ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        {isSelected ? 'Vue active' : 'Voir →'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div
              className="shrink-0 px-6 py-3 flex items-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
                {filtered.length} séance{filtered.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT — detail panel ─────────────────────────────────────────── */}
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden flex-col`}>
          {loadingDetail ? (
            <div className="p-8 space-y-4 flex-1">
              {[80, 130, 200, 100].map((h, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ height: h, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : selectedSession ? (
            <div ref={detailRef} className="flex-1 overflow-hidden flex flex-col">
              <DetailPanel
                session={selectedSession}
                prMap={prMap}
                onDelete={handleDelete}
                deleting={deleting}
                selectedExoId={selectedExoId}
                onSelectExo={setSelectedExoId}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)">
                  <path d="M20 6h-2.18c.07-.44.18-.86.18-1 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .14.11.56.18 1H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-3c1.1 0 2 .9 2 2 0 .14-.15.86-.26 1h-3.48c-.11-.14-.26-.86-.26-1 0-1.1.9-2 2-2zm6 17H8V8h2v2h8V8h2v12z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Sélectionne une séance pour voir les détails
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
