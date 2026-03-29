import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { animate } from 'animejs'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import { useAuth } from '../hooks/useAuth'
import { getPublicProfile } from '../api/profile'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const SESSION_COLORS = {
  'Push': '#6366f1', 'Pull': '#10b981', 'Legs': '#3b82f6',
  'Upper': '#14b8a6', 'Lower': '#f97316', 'Full Body': '#f59e0b',
  'Pectoraux': '#6366f1', 'Dos': '#10b981', 'Épaules': '#f59e0b',
  'Bras': '#ef4444', 'Jambes': '#3b82f6',
  'Pecto / Dos': '#8b5cf6', 'Épaules / Bras': '#ec4899',
}

const MUSCLE_COLORS = {
  Pectoraux: '#6366f1', Dos: '#10b981', Épaules: '#f59e0b',
  Biceps: '#ef4444', Triceps: '#a855f7', Jambes: '#3b82f6', Abdominaux: '#14b8a6',
}

const GOAL_LABELS = {
  perte_poids: 'Perte de poids', prise_muscle: 'Prise de muscle',
  endurance: 'Endurance', force: 'Force', sante: 'Santé',
  Masse: 'Masse', Sèche: 'Sèche', Force: 'Force', Maintien: 'Maintien',
}

const PROGRAM_LABELS = {
  ppl: 'Push / Pull / Legs', ul: 'Upper / Lower',
  fullbody: 'Full Body', bro: 'Bro Split',
  arnold: 'Arnold Split', custom: 'Programme libre',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDuration(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function calcAge(birthDate) {
  if (!birthDate) return null
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

function formatVolume(vol) {
  if (!vol) return '0 kg'
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M kg`
  if (vol >= 1000)    return `${(vol / 1000).toFixed(1)}t`
  return `${Math.round(vol)} kg`
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function Card({ children, title }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.1)' }}
    >
      {title && (
        <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

// ─── Body weight chart ────────────────────────────────────────────────────────

function BodyWeightChart({ entries }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current || entries.length < 2) return
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null }

    const s = getComputedStyle(document.documentElement)
    const ac   = s.getPropertyValue('--ac').trim()    || '59,130,246'
    const acL  = s.getPropertyValue('--ac-l').trim()  || '96,165,250'
    const acLt = s.getPropertyValue('--ac-lt').trim() || '147,197,253'

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: entries.map(e =>
          new Date(e.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        ),
        datasets: [{
          data: entries.map(e => e.weight_kg),
          borderColor: `rgba(${ac},1)`,
          backgroundColor: `rgba(${ac},0.08)`,
          borderWidth: 2,
          pointBackgroundColor: `rgba(${acL},1)`,
          pointBorderColor: '#1e3a5f',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(5,15,35,0.95)',
            borderColor: `rgba(${ac},0.2)`,
            borderWidth: 1,
            titleColor: `rgba(${acLt},0.6)`,
            bodyColor: '#fff',
            callbacks: { label: (item) => ` ${item.raw} kg` },
          },
        },
        scales: {
          x: { grid: { color: `rgba(${ac},0.05)` }, ticks: { color: `rgba(${acLt},0.4)`, maxTicksLimit: 7, font: { size: 11 } } },
          y: { grid: { color: `rgba(${ac},0.05)` }, ticks: { color: `rgba(${acLt},0.4)`, font: { size: 11 }, callback: v => `${v} kg` } },
        },
      },
    })
    return () => { chartInstance.current?.destroy(); chartInstance.current = null }
  }, [entries])

  const latest = entries[entries.length - 1]
  const first  = entries[0]
  const diff   = latest && first && latest !== first ? (latest.weight_kg - first.weight_kg).toFixed(1) : null

  return (
    <Card title="Évolution du poids">
      {latest && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: 'Dernier poids', value: `${latest.weight_kg} kg` },
            ...(diff !== null ? [{ label: 'Évolution', value: `${Number(diff) > 0 ? '+' : ''}${diff} kg`, colored: true, val: Number(diff) }] : []),
            { label: 'Mesures', value: entries.length },
          ].map(stat => (
            <div key={stat.label}
              className="flex-1 min-w-24 rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(var(--ac),0.06)', border: '1px solid rgba(var(--ac),0.1)' }}
            >
              <p className="text-lg font-black" style={{ color: stat.colored ? (stat.val < 0 ? '#22c55e' : stat.val > 0 ? '#f97316' : '#94a3b8') : 'white' }}>
                {stat.value}
              </p>
              <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      {entries.length >= 2 ? (
        <div className="relative h-44">
          <canvas ref={chartRef} />
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center rounded-xl text-sm"
          style={{ background: 'rgba(var(--ac),0.04)', color: 'rgba(var(--ac-lt),0.35)' }}>
          Pas assez de données pour afficher la courbe
        </div>
      )}
    </Card>
  )
}

// ─── Weekly schedule strip ────────────────────────────────────────────────────

function WeekScheduleCard({ scheduleRows }) {
  const labels = Array(7).fill('Repos')
  scheduleRows.forEach(({ day_of_week, label }) => { labels[day_of_week] = label })
  const todayIndex = (new Date().getDay() + 6) % 7

  return (
    <Card title="Programme hebdomadaire">
      <div className="flex gap-2">
        {DAYS_SHORT.map((day, i) => {
          const label = labels[i]
          const color = SESSION_COLORS[label] || null
          const isToday = i === todayIndex
          const isRest  = !color
          return (
            <div key={i}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{
                background: isToday
                  ? (color ? `${color}20` : 'rgba(var(--ac),0.1)')
                  : (color ? `${color}0c` : 'rgba(255,255,255,0.02)'),
                border: `1px solid ${isToday
                  ? (color ? `${color}55` : 'rgba(var(--ac),0.3)')
                  : (color ? `${color}22` : 'rgba(255,255,255,0.04)')}`,
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wider"
                style={{ color: isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}>
                {day}
              </span>
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: color ? (isToday ? color : `${color}77`) : 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs font-semibold text-center leading-tight px-0.5"
                style={{ color: isToday ? (color || 'rgb(var(--ac-l))') : (color ? `${color}99` : 'rgba(255,255,255,0.15)') }}>
                {isRest ? '—' : label}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Recent sessions ──────────────────────────────────────────────────────────

function RecentSessionsCard({ sessions }) {
  return (
    <Card title="Séances récentes">
      <div className="space-y-2">
        {sessions.map((s, i) => {
          const vol = Math.round(s.volume)
          const dur = formatDuration(s.duration_min)
          return (
            <div key={s.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.06)' }}
            >
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ background: `rgba(var(--ac-l),${0.9 - i * 0.1})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.name || 'Séance sans nom'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>
                  {formatDate(s.session_date)}
                  {dur && ` · ${dur}`}
                  {` · ${s.exercise_count} ex.`}
                </p>
              </div>
              {vol > 0 && (
                <span className="text-sm font-black text-white shrink-0">
                  {vol.toLocaleString('fr-FR')}
                  <span className="text-xs font-normal ml-0.5" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>kg</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── PRs ──────────────────────────────────────────────────────────────────────

function PRCard({ prs }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? prs : prs.slice(0, 6)

  return (
    <Card title="Records personnels">
      <div className="space-y-2">
        {shown.map((pr, i) => {
          const color = Object.entries(MUSCLE_COLORS).find(([k]) => pr.exercise_name?.toLowerCase().includes(k.toLowerCase()))?.[1] || 'rgb(var(--ac-l))'
          return (
            <div key={i}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.06)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm text-white truncate">{pr.exercise_name}</span>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: 'rgb(var(--ac-l))' }}>
                {pr.weight_kg} kg × {pr.reps}
              </span>
            </div>
          )
        })}
      </div>
      {prs.length > 6 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs font-semibold transition-colors"
          style={{ color: 'rgba(var(--ac-l),0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.5)' }}
        >
          {expanded ? '↑ Voir moins' : `↓ Voir ${prs.length - 6} de plus`}
        </button>
      )}
    </Card>
  )
}

// ─── Counter hook ─────────────────────────────────────────────────────────────

function useCountUp(target, fmt) {
  const ref = useRef(null)
  useEffect(() => {
    if (!target || !ref.current) return
    const el  = ref.current
    const dur = 1100
    const t0  = performance.now()
    const ease = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
    let raf
    const tick = now => {
      const t   = Math.min((now - t0) / dur, 1)
      const val = Math.round(ease(t) * target)
      el.textContent = fmt ? fmt(val) : val.toLocaleString('fr-FR')
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return ref
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FriendProfile() {
  const { userId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const sectionsRef = useRef(null)

  // Stat counters (safe to call unconditionally — skip when target is 0/undefined)
  const sesRef = useCountUp(profile?.stats?.total_sessions)
  const volRef = useCountUp(
    profile?.stats?.total_volume ? Math.round(profile.stats.total_volume) : 0,
    v => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v.toLocaleString('fr-FR')} kg`
  )
  const wtRef  = useCountUp(profile?.stats?.best_weight)
  const strRef = useCountUp(profile?.stats?.best_streak)

  useEffect(() => {
    if (!userId || !token) return
    setLoading(true)
    getPublicProfile(token, userId)
      .then(setProfile)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId, token])

  // Sections stagger entrance
  useEffect(() => {
    if (!profile || !sectionsRef.current) return
    Array.from(sectionsRef.current.children).forEach((el, i) => {
      animate(el, { opacity: [0, 1], translateY: [18, 0], delay: i * 75, duration: 480, easing: 'easeOutQuad' })
    })
  }, [profile])

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
    >
      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors"
          style={{ color: 'rgba(var(--ac-lt),0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.4)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Retour
        </button>

        {loading && (
          <div className="space-y-4">
            {[120, 80, 200].map((h, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ height: h, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--ac),0.08)' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-base font-semibold" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {!loading && !error && profile && (
          <div ref={sectionsRef} className="space-y-5">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div
              className="relative overflow-hidden rounded-3xl p-8"
              style={{ background: 'rgba(8,15,31,0.85)', border: '1px solid rgba(var(--ac),0.12)' }}
            >
              {/* Glow */}
              <div className="absolute pointer-events-none" style={{
                width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(var(--ac-d),0.13) 0%, transparent 65%)',
                top: -180, right: -120,
              }} />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl text-white overflow-hidden"
                    style={{
                      background: profile.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      boxShadow: '0 0 0 3px rgba(var(--ac),0.25), 0 0 0 6px rgba(var(--ac),0.08)',
                    }}
                  >
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                      : profile.username.slice(0, 2).toUpperCase()
                    }
                  </div>
                  {profile.active_this_week && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full"
                      style={{ background: '#22c55e', border: '2px solid #080f1f', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-black text-white">{profile.username}</h1>
                  {profile.active_this_week && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                      <span className="text-xs" style={{ color: '#22c55e' }}>Actif cette semaine</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    {profile.goal && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-l))', border: '1px solid rgba(var(--ac),0.18)' }}>
                        {GOAL_LABELS[profile.goal] || profile.goal}
                      </span>
                    )}
                    {profile.current_program && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {PROGRAM_LABELS[profile.current_program] || profile.current_program}
                      </span>
                    )}
                    {profile.weekly_target && (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {profile.weekly_target}× / semaine
                      </span>
                    )}
                  </div>

                  {/* Personal info pills */}
                  {(profile.height_cm || profile.weight_kg || profile.birth_date) && (
                    <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                      {calcAge(profile.birth_date) && (
                        <span className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {calcAge(profile.birth_date)} ans
                        </span>
                      )}
                      {profile.height_cm && (
                        <span className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {profile.height_cm} cm
                        </span>
                      )}
                      {profile.weight_kg && (
                        <span className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {profile.weight_kg} kg
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="shrink-0">
                  <Link
                    to="/social"
                    className="text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                    style={{ background: 'rgba(var(--ac),0.1)', color: 'rgb(var(--ac-l))', border: '1px solid rgba(var(--ac),0.2)' }}
                  >
                    ← Social
                  </Link>
                </div>
              </div>

              {/* Stats row */}
              <div className="relative grid grid-cols-4 gap-3 mt-6 pt-6"
                style={{ borderTop: '1px solid rgba(var(--ac),0.08)' }}>
                <div className="text-center">
                  <p className="text-xl font-black text-white leading-tight"><span ref={sesRef}>0</span></p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Séances</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white leading-tight"><span ref={volRef}>0</span></p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Volume total</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white leading-tight">
                    {profile.stats.best_weight ? <><span ref={wtRef}>0</span> kg</> : '—'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Meilleure charge</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white leading-tight"><span ref={strRef}>0</span>j</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(var(--ac-lt),0.35)' }}>Meilleure série</p>
                </div>
              </div>
            </div>

            {/* ── Weekly schedule ────────────────────────────────────────────── */}
            {profile.schedule && profile.schedule.length > 0 && (
              <WeekScheduleCard scheduleRows={profile.schedule} />
            )}

            {/* ── Body weight chart ──────────────────────────────────────────── */}
            {profile.body_weight && profile.body_weight.length > 0 && (
              <BodyWeightChart entries={profile.body_weight} />
            )}

            {/* ── PRs ────────────────────────────────────────────────────────── */}
            {profile.prs && profile.prs.length > 0 && (
              <PRCard prs={profile.prs} />
            )}

            {/* ── Recent sessions ────────────────────────────────────────────── */}
            {profile.recent_sessions && profile.recent_sessions.length > 0 && (
              <RecentSessionsCard sessions={profile.recent_sessions} />
            )}

          </div>
        )}
      </main>
    </div>
  )
}
