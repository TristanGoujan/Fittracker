import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
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

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

function formatDuration(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}`
  return m === 0 ? `${h * 60}` : `${h * 60 + m}`
}

function groupByMonth(sessions) {
  const groups = {}
  sessions.forEach((s) => {
    const key = new Date(s.session_date + 'T00:00:00').toLocaleDateString('fr-FR', {
      month: 'long', year: 'numeric',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })
  return groups
}

// ─── Left panel session card ──────────────────────────────────────────────────

function SessionCard({ session, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 transition-all"
      style={{
        background: isSelected ? 'rgba(var(--ac-d),0.12)' : 'transparent',
        borderLeft: isSelected ? '2px solid rgb(var(--ac))' : '2px solid transparent',
        borderBottom: '1px solid rgba(var(--ac),0.06)',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <p className="text-xs font-bold mb-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
        {formatDateShort(session.session_date)}
      </p>
      <p className="text-white font-black text-base uppercase tracking-tight leading-tight mb-3">
        {session.name || 'Séance sans nom'}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        {session.duration_min && (
          <span className="flex items-center gap-1">
            <span className="text-white font-bold text-sm">{formatDuration(session.duration_min)}</span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>MIN</span>
          </span>
        )}
        {session.volume > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-white font-bold text-sm">
              {Math.round(session.volume).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>KG</span>
          </span>
        )}
        {session.exercise_count > 0 && (
          <span
            className="text-xs font-black px-2 py-0.5 rounded-md"
            style={{
              background: isSelected ? 'rgba(var(--ac),0.3)' : 'rgba(255,255,255,0.08)',
              color: isSelected ? 'rgb(var(--ac-lt))' : 'rgba(255,255,255,0.5)',
            }}
          >
            {session.exercise_count}
          </span>
        )}
        <span
          className="ml-auto text-xs font-bold uppercase tracking-widest"
          style={{ color: isSelected ? 'rgb(var(--ac-l))' : 'rgba(var(--ac-lt),0.2)' }}
        >
          {isSelected ? 'Vue active' : 'Voir →'}
        </span>
      </div>
    </button>
  )
}

// ─── Right panel detail ───────────────────────────────────────────────────────

function DetailPanel({ session, prMap, onDelete, deleting, onSelectExo, selectedExoId }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s2, set) => s2 + (set.weight_kg ?? 0) * (set.reps ?? 0), 0),
    0
  )
  const topExercise = session.exercises.reduce((best, ex) => {
    const vol = ex.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
    return vol > (best?.vol ?? 0) ? { ...ex, vol } : best
  }, null)

  return (
    <div className="p-7 max-w-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
            {formatDateShort(session.session_date)}
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none">
            {session.name || 'Séance sans nom'}
          </h2>
        </div>
        <button
          onClick={() => navigate(`/sessions/${session.id}`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all mt-1"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(var(--ac-lt),0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          title="Voir la page complète"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </button>
      </div>

      {/* Summary metrics */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
          Résumé
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              Exercice principal
            </p>
            <p className="text-white font-bold text-sm truncate">
              {topExercise?.exercise_name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              Volume total
            </p>
            <p className="text-white font-bold text-sm">
              {Math.round(totalVolume).toLocaleString('fr-FR')}
              <span className="text-xs font-normal ml-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>KG</span>
            </p>
          </div>
          {session.duration_min && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
                Durée
              </p>
              <p className="text-white font-bold text-sm">
                {session.duration_min}
                <span className="text-xs font-normal ml-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>MIN</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              Exercices
            </p>
            <p className="text-white font-bold text-sm">{session.exercises.length}</p>
          </div>
        </div>
      </div>

      {/* Exercise log */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
        Journal d'exercices
      </p>

      <div className="space-y-3 mb-6">
        {session.exercises.map((ex) => {
          const color = MUSCLE_COLORS[ex.muscle_group] || '#3b82f6'
          const maxWeight = Math.max(...ex.sets.map((s) => s.weight_kg ?? 0))
          const isGlobalPR = prMap[ex.exercise_id] != null && maxWeight >= prMap[ex.exercise_id]

          return (
            <div
              key={ex.se_id}
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
            >
              {/* Exercise header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(var(--ac),0.06)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <p className="text-white font-bold text-sm">{ex.exercise_name}</p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: `${color}18`, color: `${color}cc` }}
                  >
                    {ex.muscle_group}
                  </span>
                </div>
                {isGlobalPR && (
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                  >
                    PR
                  </span>
                )}
              </div>

              {/* Sets */}
              <div className="px-4 py-2 space-y-1">
                {ex.sets.map((set) => {
                  const isBestSet = set.weight_kg === maxWeight && set.weight_kg > 0
                  const isPRSet = isBestSet && isGlobalPR
                  return (
                    <div
                      key={set.set_number}
                      className="flex items-center justify-between py-1.5 rounded-lg px-2 transition-colors"
                      style={isPRSet ? { background: 'rgba(251,191,36,0.06)' } : {}}
                    >
                      <span
                        className="text-xs font-bold uppercase tracking-widest w-12"
                        style={{ color: isPRSet ? 'rgba(251,191,36,0.6)' : 'rgba(var(--ac-lt),0.3)' }}
                      >
                        Set {set.set_number}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: isPRSet ? '#fde68a' : 'rgba(255,255,255,0.75)' }}>
                        {set.weight_kg != null ? set.weight_kg : '—'} KG × {set.reps != null ? set.reps : '—'}
                        {isPRSet && (
                          <span
                            className="ml-2 text-xs font-black"
                            style={{ color: '#fbbf24' }}
                          >
                            (PR)
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progression section */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
            Progression
          </p>
          <select
            value={selectedExoId ?? ''}
            onChange={(e) => onSelectExo(Number(e.target.value))}
            className="text-xs rounded-lg px-2.5 py-1 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(var(--ac),0.15)',
              color: 'rgba(var(--ac-lt),0.7)',
            }}
          >
            {session.exercises.map((ex) => (
              <option key={ex.exercise_id} value={ex.exercise_id} style={{ background: '#080f1f' }}>
                {ex.exercise_name}
              </option>
            ))}
          </select>
        </div>
        <ProgressChartInline exoId={selectedExoId} />
      </div>

      {/* Notes */}
      {session.notes && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.07)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
            Notes
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{session.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/new', { state: { template: session } })}
          className="flex-1 text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(var(--ac),0.15)',
            color: 'rgba(var(--ac-lt),0.5)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-lt))'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.35)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.5)'; e.currentTarget.style.borderColor = 'rgba(var(--ac),0.15)' }}
        >
          Répéter la séance
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>Confirmer ?</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {deleting ? '…' : 'Oui'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: 'rgba(var(--ac-lt),0.4)' }}
            >
              Non
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold px-4 py-3 rounded-xl transition-all"
            style={{ color: 'rgba(var(--ac-lt),0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.2)'; e.currentTarget.style.background = 'transparent' }}
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

// Mini wrapper so ProgressChart reacts to exercise changes in the detail panel
function ProgressChartInline({ exoId }) {
  const { token } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!exoId) return
    setLoading(true)
    getProgress(token, exoId).then(setData).finally(() => setLoading(false))
  }, [exoId, token])

  if (loading) return <div className="h-32 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
  return <ProgressChart data={data} />
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

  useEffect(() => {
    Promise.all([getSessions(token), getPRs(token)])
      .then(([s, prs]) => {
        setSessions(s)
        setPrMap(Object.fromEntries(prs.map((p) => [p.exercise_id, p.weight_kg])))
        if (s.length > 0) loadDetail(s[0].id)
      })
      .finally(() => setLoadingList(false))
  }, [token])

  function loadDetail(id) {
    setSelectedId(id)
    setLoadingDetail(true)
    setSelectedSession(null)
    getSession(token, id)
      .then((s) => {
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
      const updated = sessions.filter((s) => s.id !== selectedId)
      setSessions(updated)
      setSelectedSession(null)
      setSelectedId(null)
      if (updated.length > 0) loadDetail(updated[0].id)
    } finally {
      setDeleting(false)
    }
  }

  const grouped = groupByMonth(sessions)

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <Navbar />

      <div className="flex flex-1 overflow-hidden text-white">

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid rgba(var(--ac),0.08)' }}
        >
          {/* Column headers */}
          <div
            className="px-5 py-3 flex items-center gap-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(var(--ac),0.08)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest flex-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              Séance
            </span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>
              Durée
            </span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.2)' }}>
              Volume
            </span>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm mb-4" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>Aucune séance enregistrée.</p>
                <button
                  onClick={() => navigate('/new')}
                  className="text-xs font-bold text-white px-4 py-2 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))' }}
                >
                  + Première séance
                </button>
              </div>
            ) : (
              Object.entries(grouped).map(([month, monthSessions]) => (
                <div key={month}>
                  <div
                    className="px-5 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  >
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(var(--ac-lt),0.25)' }}
                    >
                      {month}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(var(--ac),0.06)' }} />
                  </div>
                  {monthSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      isSelected={s.id === selectedId}
                      onClick={() => loadDetail(s.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loadingDetail ? (
            <div className="p-7 space-y-4 max-w-lg">
              {[60, 120, 200, 80].map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl animate-pulse"
                  style={{ height: `${h}px`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.06)' }}
                />
              ))}
            </div>
          ) : selectedSession ? (
            <DetailPanel
              session={selectedSession}
              prMap={prMap}
              onDelete={handleDelete}
              deleting={deleting}
              selectedExoId={selectedExoId}
              onSelectExo={setSelectedExoId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(var(--ac-dd),0.15)', border: '1px solid rgba(var(--ac),0.1)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(var(--ac),0.3)">
                  <path d="M20 6h-2.18c.07-.44.18-.86.18-1 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .14.11.56.18 1H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-3c1.1 0 2 .9 2 2 0 .14-.15.86-.26 1h-3.48c-.11-.14-.26-.86-.26-1 0-1.1.9-2 2-2zm6 17H8V8h2v2h8V8h2v12z"/>
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>
                Sélectionne une séance
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
