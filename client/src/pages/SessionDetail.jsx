import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { animate } from 'animejs'
import { useAuth } from '../hooks/useAuth'
import { getSession, deleteSession } from '../api/sessions'
import ShareModal from '../components/ShareModal'

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

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function SessionDetail() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const exercisesRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!session || !exercisesRef.current) return
    Array.from(exercisesRef.current.children).forEach((el, i) => {
      animate(el, { opacity: [0, 1], translateY: [12, 0], delay: i * 70, duration: 400, easing: 'easeOutQuad' })
    })
  }, [session?.id])

  useEffect(() => {
    if (confirmDelete && confirmRef.current) {
      animate(confirmRef.current, { scale: [0.9, 1.05, 1], duration: 320, easing: 'easeOutBack' })
    }
  }, [confirmDelete])

  useEffect(() => {
    getSession(token, id)
      .then(setSession)
      .catch(() => navigate('/history'))
      .finally(() => setLoading(false))
  }, [id, token, navigate])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSession(token, id)
      navigate('/history')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const totalVolume =
    session?.exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((s2, set) => s2 + (set.weight_kg ?? 0) * (set.reps ?? 0), 0),
      0
    ) ?? 0

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors"
          style={{ color: 'rgba(var(--ac-lt),0.4)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#93c5fd' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.4)' }}
        >
          ← Historique
        </Link>

        {loading ? (
          <div className="space-y-4">
            {[20, 48].map((h, i) => (
              <div
                key={i}
                className={`h-${h} rounded-xl animate-pulse`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)', height: `${h * 4}px` }}
              />
            ))}
          </div>
        ) : !session ? null : (
          <div className="space-y-5">

            {/* Header card */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black mb-1">
                    {session.name || 'Séance sans nom'}
                  </h2>
                  <p className="text-sm capitalize mb-3" style={{ color: 'rgba(var(--ac-lt),0.45)' }}>
                    {formatDate(session.session_date)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {session.duration_min && (
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-lg"
                        style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-lt))', border: '1px solid rgba(var(--ac),0.2)' }}
                      >
                        {session.duration_min} min
                      </span>
                    )}
                    {totalVolume > 0 && (
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-lg"
                        style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-lt))', border: '1px solid rgba(var(--ac),0.2)' }}
                      >
                        {Math.round(totalVolume).toLocaleString('fr-FR')} kg
                      </span>
                    )}
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-lt))', border: '1px solid rgba(var(--ac),0.2)' }}
                    >
                      {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Share button */}
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-l))', border: '1px solid rgba(var(--ac),0.2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--ac),0.18)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--ac),0.1)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                    </svg>
                    Partager
                  </button>

                  {/* Delete */}
                  {confirmDelete ? (
                    <div ref={confirmRef} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>Confirmer ?</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        {deleting ? '…' : 'Oui'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={{ color: 'rgba(var(--ac-lt),0.4)' }}
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: 'rgba(var(--ac-lt),0.2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.2)' }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Exercices */}
            <div ref={exercisesRef} className="space-y-3">
              {session.exercises.map((ex) => {
                const exVolume = ex.sets.reduce(
                  (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0
                )
                const color = MUSCLE_COLORS[ex.muscle_group] || '#3b82f6'
                return (
                  <div
                    key={ex.se_id}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
                  >
                    {/* Exercise header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${color}18` }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{ex.exercise_name}</p>
                          <p className="text-xs mt-0.5" style={{ color: `${color}99` }}>
                            {ex.muscle_group}
                            {ex.rest_seconds && (
                              <span style={{ color: 'rgba(var(--ac-lt),0.3)' }}> · {ex.rest_seconds}s repos</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {exVolume > 0 && (
                        <p className="text-sm font-bold" style={{ color: 'rgba(var(--ac-lt),0.5)' }}>
                          {Math.round(exVolume).toLocaleString('fr-FR')} kg
                        </p>
                      )}
                    </div>

                    {/* Sets table */}
                    <div className="space-y-1.5">
                      <div
                        className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(var(--ac-lt),0.25)' }}
                      >
                        <span>#</span>
                        <span>Poids</span>
                        <span>Reps</span>
                        <span>Volume</span>
                      </div>
                      {ex.sets.map((set) => (
                        <div
                          key={set.set_number}
                          className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 items-center rounded-xl px-3 py-2.5 text-sm"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <span className="font-bold text-xs" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
                            {set.set_number}
                          </span>
                          <span className="text-white font-semibold">
                            {set.weight_kg != null ? `${set.weight_kg} kg` : '—'}
                          </span>
                          <span className="text-white">
                            {set.reps != null ? `${set.reps} reps` : '—'}
                          </span>
                          <span style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
                            {set.weight_kg && set.reps
                              ? `${Math.round(set.weight_kg * set.reps)} kg`
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            {session.notes && (
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
                  Notes
                </p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{session.notes}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {showShare && session && (
        <ShareModal
          session={session}
          username={user?.username ?? '?'}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
