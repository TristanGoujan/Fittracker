import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { getProfile } from '../api/auth'
import { updateProgram } from '../api/auth'
import { getSchedule, saveSchedule } from '../api/schedule'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const PROGRAMS = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    frequency: '6j / sem',
    color: '#6366f1',
    description: "Volume élevé — idéal pour l'hypertrophie musculaire.",
    tags: ['Masse', 'Avancé'],
    defaults: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Repos'],
    types: ['Push', 'Pull', 'Legs', 'Repos'],
  },
  {
    id: 'ul',
    name: 'Upper / Lower',
    frequency: '4j / sem',
    color: '#10b981',
    description: 'Récupération optimale — bon équilibre volume / fréquence.',
    tags: ['Masse', 'Intermédiaire'],
    defaults: ['Upper', 'Lower', 'Repos', 'Upper', 'Lower', 'Repos', 'Repos'],
    types: ['Upper', 'Lower', 'Repos'],
  },
  {
    id: 'fullbody',
    name: 'Full Body',
    frequency: '3j / sem',
    color: '#f59e0b',
    description: 'Corps entier chaque séance — parfait pour les débutants.',
    tags: ['Force', 'Débutant'],
    defaults: ['Full Body', 'Repos', 'Full Body', 'Repos', 'Full Body', 'Repos', 'Repos'],
    types: ['Full Body', 'Repos'],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    frequency: '5j / sem',
    color: '#ef4444',
    description: 'Isolation maximale par groupe musculaire — classique bodybuilding.',
    tags: ['Masse', 'Classique'],
    defaults: ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Repos', 'Repos'],
    types: ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Repos'],
  },
  {
    id: 'arnold',
    name: 'Arnold Split',
    frequency: '6j / sem',
    color: '#a855f7',
    description: "Le programme historique d'Arnold Schwarzenegger.",
    tags: ['Masse', 'Avancé'],
    defaults: ['Pecto / Dos', 'Épaules / Bras', 'Jambes', 'Pecto / Dos', 'Épaules / Bras', 'Jambes', 'Repos'],
    types: ['Pecto / Dos', 'Épaules / Bras', 'Jambes', 'Repos'],
  },
  {
    id: 'custom',
    name: 'Programme libre',
    frequency: 'Libre',
    color: '#64748b',
    description: 'Crée ton propre programme sur mesure.',
    tags: ['Personnalisé'],
    defaults: ['', '', '', '', '', '', ''],
    types: [],
  },
]

const SESSION_COLORS = {
  'Push': '#6366f1', 'Pull': '#10b981', 'Legs': '#3b82f6',
  'Upper': '#14b8a6', 'Lower': '#f97316', 'Full Body': '#f59e0b',
  'Pectoraux': '#6366f1', 'Dos': '#10b981', 'Épaules': '#f59e0b',
  'Bras': '#ef4444', 'Jambes': '#3b82f6',
  'Pecto / Dos': '#8b5cf6', 'Épaules / Bras': '#ec4899',
}

function getSessionColor(label) {
  return SESSION_COLORS[label] || null
}

// Day cell with fixed centered modal picker
function DayCell({ day, index, label, types, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const color = label ? getSessionColor(label) : null
  const isRest = !label || label === 'Repos'
  const allTypes = [...new Set([...types, 'Repos'])]

  function handleSelect(t) {
    onUpdate(index, t)
    setOpen(false)
  }

  return (
    <div className="flex-1 min-w-0">
      <button
        onClick={() => setOpen(true)}
        className="w-full flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all"
        style={{
          background: color ? `${color}14` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${color ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = color ? `${color}22` : 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = color ? `${color}14` : 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {day}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color ? `${color}25` : 'rgba(255,255,255,0.04)' }}
        >
          {isRest ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill={color || 'rgba(255,255,255,0.4)'}>
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          )}
        </div>
        <span
          className="text-xs font-bold text-center leading-tight truncate w-full px-1"
          style={{ color: color || 'rgba(255,255,255,0.2)' }}
        >
          {label || 'Repos'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.2)">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {/* Fixed centered modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-2xl p-5 w-72"
            style={{
              background: 'rgba(5,12,28,0.98)',
              border: '1px solid rgba(var(--ac),0.2)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
                  Modifier le jour
                </p>
                <p className="text-base font-black text-white mt-0.5">{day}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="space-y-1 mb-3">
              {allTypes.map((t) => {
                const tc = getSessionColor(t)
                const isActive = label === t
                return (
                  <button
                    key={t}
                    onClick={() => handleSelect(t)}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3"
                    style={{
                      background: isActive ? (tc ? `${tc}20` : 'rgba(var(--ac),0.12)') : 'transparent',
                      border: `1px solid ${isActive ? (tc ? `${tc}40` : 'rgba(var(--ac),0.25)') : 'transparent'}`,
                      color: tc || 'rgba(255,255,255,0.45)',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = tc ? `${tc}12` : 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {tc ? (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tc, boxShadow: isActive ? `0 0 6px ${tc}80` : 'none' }} />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
                    )}
                    {t}
                    {isActive && (
                      <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill={tc || 'rgb(var(--ac-l))'}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom text input */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-3">
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Ou saisir un nom libre</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && custom.trim()) {
                      handleSelect(custom.trim())
                      setCustom('')
                    }
                  }}
                  placeholder="Ex : Cardio, Mobilité…"
                  className="flex-1 text-white text-sm px-3 py-2 rounded-xl outline-none placeholder:opacity-25"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--ac),0.15)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.4)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--ac),0.15)' }}
                />
                <button
                  onClick={() => { if (custom.trim()) { handleSelect(custom.trim()); setCustom('') } }}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'rgba(var(--ac-d),0.7)', opacity: custom.trim() ? 1 : 0.3 }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Programs() {
  const { token } = useAuth()
  const [selectedId, setSelectedId] = useState('ppl')
  const [schedule, setSchedule] = useState(PROGRAMS[0].defaults)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProfile(token), getSchedule(token)])
      .then(([profile, schedRows]) => {
        // Load saved program
        const prog = profile.current_program
        if (prog && PROGRAMS.find((p) => p.id === prog)) {
          setSelectedId(prog)
        }
        // Load saved schedule — fill 7 slots
        const labels = Array(7).fill('')
        schedRows.forEach(({ day_of_week, label }) => {
          labels[day_of_week] = label
        })
        // If no schedule saved yet, use program defaults
        if (schedRows.length === 0 && prog) {
          const p = PROGRAMS.find((p) => p.id === prog)
          if (p) setSchedule(p.defaults)
        } else {
          setSchedule(labels)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  function selectProgram(prog) {
    setSelectedId(prog.id)
    setSchedule(prog.defaults)
    setSaved(false)
  }

  function updateDay(index, label) {
    setSchedule((prev) => {
      const next = [...prev]
      next[index] = label
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        updateProgram(token, selectedId),
        saveSchedule(token, schedule.map((label, i) => ({ day_of_week: i, label: label || 'Repos' }))),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const currentProg = PROGRAMS.find((p) => p.id === selectedId) || PROGRAMS[0]

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-white">Programmes</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
            Choisis ta structure d'entraînement et planifie ta semaine
          </p>
        </div>

        {/* Program cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {PROGRAMS.map((prog) => {
            const active = selectedId === prog.id
            return (
              <button
                key={prog.id}
                onClick={() => selectProgram(prog)}
                className="text-left rounded-2xl p-5 transition-all"
                style={{
                  background: active ? `${prog.color}14` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${active ? prog.color + '60' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? `0 0 20px ${prog.color}20` : 'none',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.055)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${prog.color}22` }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={prog.color}>
                      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                    </svg>
                  </div>
                  {active && (
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-md"
                      style={{ background: `${prog.color}25`, color: prog.color }}
                    >
                      Actif
                    </span>
                  )}
                </div>
                <p className="font-black text-white text-sm mb-0.5">{prog.name}</p>
                <p className="text-xs mb-2" style={{ color: prog.color + 'aa' }}>{prog.frequency}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{prog.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {prog.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Weekly calendar */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-black text-white text-sm">Calendrier de la semaine</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
                Clique sur un jour pour modifier la séance prévue
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
                boxShadow: saved ? '0 4px 16px rgba(5,150,105,0.25)' : '0 4px 16px rgba(var(--ac-d),0.25)',
                color: '#fff',
              }}
            >
              {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>

          {loading ? (
            <div className="flex gap-3">
              {Array(7).fill(null).map((_, i) => (
                <div key={i} className="flex-1 h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {DAYS.map((day, i) => (
                <DayCell
                  key={i}
                  day={day}
                  index={i}
                  label={schedule[i] || ''}
                  types={currentProg.types}
                  onUpdate={updateDay}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
