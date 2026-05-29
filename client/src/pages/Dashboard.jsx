import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate } from 'animejs'
import StatCard from '../components/StatCard'
import VolumeChart from '../components/VolumeChart'
import ActivityGrid from '../components/ActivityGrid'
import PRWidget from '../components/PRWidget'
import RecentSessions from '../components/RecentSessions'
import { useAuth } from '../hooks/useAuth'
import { getSummary, getVolume, getActivity, getPRs, getRecentSessions } from '../api/stats'
import { getSchedule } from '../api/schedule'

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const SESSION_COLORS = {
  'Push': '#6366f1', 'Pull': '#10b981', 'Legs': '#3b82f6',
  'Upper': '#14b8a6', 'Lower': '#f97316', 'Full Body': '#f59e0b',
  'Pectoraux': '#6366f1', 'Dos': '#10b981', 'Épaules': '#f59e0b',
  'Bras': '#ef4444', 'Jambes': '#3b82f6',
  'Pecto / Dos': '#8b5cf6', 'Épaules / Bras': '#ec4899',
}

function parseLabel(raw) {
  if (!raw) return { name: '', color: null }
  const idx = raw.lastIndexOf('|#')
  if (idx === -1) return { name: raw, color: null }
  return { name: raw.slice(0, idx), color: raw.slice(idx + 1) }
}

function getSessionColor(rawLabel) {
  const { name, color } = parseLabel(rawLabel)
  return SESSION_COLORS[name] || color || null
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7
}

function formatGreetingDate() {
  const d = new Date()
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month}`
}

function formatDuration(minutes) {
  if (!minutes) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function HeroSection({ user, schedule, hasSchedule }) {
  const todayIndex  = getTodayIndex()
  const todayRaw    = schedule[todayIndex] || 'Repos'
  const { name: todayLabel } = parseLabel(todayRaw)
  const todayColor  = getSessionColor(todayRaw)
  const ringRef     = useRef(null)
  const scheduleRef = useRef(null)

  // Avatar ring pulse
  useEffect(() => {
    if (!ringRef.current) return
    animate(ringRef.current, {
      scale:   [1, 1.35],
      opacity: [0.55, 0],
      duration: 1800,
      easing:  'easeOut',
      loop:    true,
    })
  }, [])

  // Schedule day cells stagger
  useEffect(() => {
    if (!hasSchedule || !scheduleRef.current) return
    Array.from(scheduleRef.current.children).forEach((el, i) => {
      animate(el, { opacity: [0, 1], scale: [0.88, 1], delay: i * 45, duration: 350, easing: 'easeOutBack' })
    })
  }, [hasSchedule])

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8"
      style={{
        background: 'rgba(8,15,31,0.85)',
        border: '1px solid rgba(var(--ac),0.12)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Glow top-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--ac-d),0.13) 0%, transparent 65%)',
          top: '-220px',
          right: '-160px',
        }}
      />
      {/* Glow bottom-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--ac),0.07) 0%, transparent 70%)',
          bottom: '-60px',
          left: '80px',
        }}
      />

      {/* Top row: avatar + greeting + CTA */}
      <div className="relative flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-5">
          {/* Avatar with double ring */}
          <div className="relative shrink-0">
            {/* Pulsing ring */}
            <div
              ref={ringRef}
              className="absolute pointer-events-none"
              style={{
                inset: -5, borderRadius: '50%',
                border: '2px solid rgba(var(--ac),0.45)',
              }}
            />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl text-white"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
                boxShadow: '0 0 0 3px rgba(var(--ac),0.25), 0 0 0 6px rgba(var(--ac),0.08), 0 8px 28px rgba(var(--ac-d),0.35)',
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                (user?.username ?? '?').slice(0, 2).toUpperCase()
              )}
            </div>
            {/* Online dot */}
            <div
              className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
              style={{
                background: '#22c55e',
                border: '2px solid #080f1f',
                boxShadow: '0 0 6px rgba(34,197,94,0.6)',
              }}
            />
          </div>

          <div>
            <p className="text-sm font-medium" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
              Bonjour,
            </p>
            <h2 className="text-3xl font-black text-white leading-tight">
              {user?.username}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              {formatGreetingDate()}
            </p>
          </div>
        </div>

        {/* Today's session badge + CTA */}
        <div className="flex items-center gap-3">
          {todayLabel && todayLabel !== 'Repos' && todayColor && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: `${todayColor}18`,
                border: `1px solid ${todayColor}35`,
                color: todayColor,
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: todayColor, boxShadow: `0 0 6px ${todayColor}80` }} />
              {todayLabel} aujourd'hui
            </div>
          )}
          <Link
            to="/new"
            className="text-sm text-white font-bold px-5 py-2.5 rounded-xl transition-all shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
              boxShadow: '0 4px 16px rgba(var(--ac-d),0.35)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(var(--ac-d),0.55)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(var(--ac-d),0.35)' }}
          >
            + Nouvelle séance
          </Link>
        </div>
      </div>

      {/* Weekly schedule strip */}
      {hasSchedule ? (
        <div className="relative mt-6 pt-5" style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
            Programme cette semaine
          </p>
          <div ref={scheduleRef} className="flex gap-2">
            {DAYS_SHORT.map((day, i) => {
              const raw = schedule[i] || 'Repos'
              const { name: label } = parseLabel(raw)
              const isToday = i === todayIndex
              const color = getSessionColor(raw)
              const isRest = !color

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                  style={{
                    background: isToday
                      ? (color ? `${color}20` : 'rgba(var(--ac),0.1)')
                      : (color ? `${color}0c` : 'rgba(255,255,255,0.02)'),
                    border: `1px solid ${
                      isToday
                        ? (color ? `${color}55` : 'rgba(var(--ac),0.3)')
                        : (color ? `${color}22` : 'rgba(255,255,255,0.04)')
                    }`,
                    boxShadow: isToday && color ? `0 0 14px ${color}22` : 'none',
                  }}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {day}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: color
                        ? (isToday ? color : `${color}77`)
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: isToday && color ? `0 0 5px ${color}` : 'none',
                    }}
                  />
                  <span
                    className="text-xs font-semibold text-center leading-tight px-0.5"
                    style={{
                      color: isToday
                        ? (color || 'rgb(var(--ac-l))')
                        : (color ? `${color}99` : 'rgba(255,255,255,0.15)'),
                    }}
                  >
                    {isRest ? '—' : label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="relative mt-6 pt-5" style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'rgba(var(--ac-lt),0.25)' }}>
              Aucun programme configuré
            </p>
            <Link
              to="/programs"
              className="text-xs font-bold transition-colors"
              style={{ color: 'rgba(var(--ac-l),0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.5)' }}
            >
              Configurer →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { token, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [volume7, setVolume7] = useState([])
  const [volume30, setVolume30] = useState([])
  const [activity, setActivity] = useState([])
  const [prs, setPrs] = useState(null)
  const [recent, setRecent] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [hasSchedule, setHasSchedule] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    Promise.all([
      getSummary(token),
      getVolume(token, 7),
      getVolume(token, 30),
      getActivity(token),
      getPRs(token),
      getRecentSessions(token),
      getSchedule(token),
    ])
      .then(([sum, v7, v30, act, prData, recentData, schedRows]) => {
        setSummary(sum)
        setVolume7(v7)
        setVolume30(v30)
        setActivity(act)
        setPrs(prData)
        setRecent(recentData)

        const labels = Array(7).fill('Repos')
        schedRows.forEach(({ day_of_week, label }) => { labels[day_of_week] = label })
        setSchedule(labels)
        setHasSchedule(schedRows.length > 0)
      })
      .catch(() => setError('Impossible de contacter le serveur. Vérifie ta connexion.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        <HeroSection user={user} schedule={schedule} hasSchedule={hasSchedule} />

        {error && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171" className="shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl h-24 animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }}
              />
            ))}
          </div>
        ) : summary?.total_sessions === 0 ? (
          <div
            className="rounded-2xl p-12 flex flex-col items-center text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(var(--ac),0.15)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(var(--ac-d),0.12)', border: '1px solid rgba(var(--ac),0.15)' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="rgba(var(--ac-l),0.4)">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Première séance ?</h3>
            <p className="text-sm mb-8 max-w-xs" style={{ color: 'rgba(var(--ac-lt),0.35)', lineHeight: 1.7 }}>
              Ton dashboard se remplira au fil de tes entraînements. Commence dès maintenant.
            </p>
            <Link
              to="/new"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
                boxShadow: '0 4px 20px rgba(var(--ac-d),0.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 28px rgba(var(--ac-d),0.6)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--ac-d),0.4)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Créer ma première séance
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Séances totales" counter={summary?.total_sessions ?? 0} delay={0} />
              <StatCard
                label="Volume total"
                counter={Math.round(summary?.total_volume ?? 0)}
                unit="kg"
                delay={80}
              />
              <StatCard label="Meilleure charge" counter={summary?.best_weight ?? 0} unit="kg" delay={160} />
              <StatCard label="Temps ce mois" value={formatDuration(summary?.monthly_duration_min)} delay={240} />
            </div>

            <div
              className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
            >
              <PRWidget prs={prs} />
            </div>

            <VolumeChart data7={volume7} data30={volume30} />

            <div
              className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
            >
              <RecentSessions sessions={recent} />
            </div>

            <ActivityGrid data={activity} />
          </>
        )}
      </main>
    </div>
  )
}
