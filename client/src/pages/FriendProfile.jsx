import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { animate } from 'animejs'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import { useAuth } from '../hooks/useAuth'
import { getPublicProfile } from '../api/profile'
import Badges from '../components/Badges'
import { CATEGORIES, ALL_BADGES } from '../data/badges.jsx'

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

const GOAL_META = {
  muscle:    { label: 'Prise de masse',  color: '#6366f1' },
  cut:       { label: 'Sèche',           color: '#f59e0b' },
  strength:  { label: 'Force',           color: '#ef4444' },
  endurance: { label: 'Endurance',       color: '#10b981' },
  fitness:   { label: 'Remise en forme', color: '#3b82f6' },
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

// ─── Recent sessions — timeline style ─────────────────────────────────────────

const SESSION_ACCENT_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f97316',
]

function RecentSessionsCard({ sessions }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(var(--ac),0.1)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(var(--ac),0.07)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(var(--ac-d),0.2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgb(var(--ac-l))">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.5)' }}>
          Séances récentes
        </p>
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(var(--ac),0.1)', color: 'rgba(var(--ac-lt),0.5)' }}
        >
          {sessions.length}
        </span>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4 space-y-0">
        {sessions.map((s, i) => {
          const vol = Math.round(s.volume)
          const dur = formatDuration(s.duration_min)
          const color = SESSION_ACCENT_COLORS[i % SESSION_ACCENT_COLORS.length]
          const isLast = i === sessions.length - 1
          return (
            <div key={s.id} className="relative flex gap-4">
              {/* Timeline track */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0"
                  style={{
                    background: i === 0 ? color : `${color}22`,
                    border: `2px solid ${i === 0 ? color : `${color}44`}`,
                    boxShadow: i === 0 ? `0 0 12px ${color}55` : 'none',
                  }}
                >
                  {i === 0 ? (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'white' }} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-px flex-1 mt-1"
                    style={{
                      background: `linear-gradient(to bottom, ${color}33, transparent)`,
                      minHeight: 16,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <div
                  className="rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: i === 0 ? `${color}0d` : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${i === 0 ? `${color}30` : 'rgba(255,255,255,0.04)'}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${color}12`
                    e.currentTarget.style.borderColor = `${color}40`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = i === 0 ? `${color}0d` : 'rgba(255,255,255,0.015)'
                    e.currentTarget.style.borderColor = i === 0 ? `${color}30` : 'rgba(255,255,255,0.04)'
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate leading-tight">
                        {s.name || 'Séance sans nom'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                        >
                          {formatDate(s.session_date)}
                        </span>
                        {dur && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1"
                            style={{ background: `${color}15`, color }}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            {dur}
                          </span>
                        )}
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
                        >
                          {s.exercise_count} ex.
                        </span>
                      </div>
                    </div>
                    {vol > 0 && (
                      <div className="text-right shrink-0">
                        <p className="font-black text-white leading-none" style={{ fontSize: '1.1rem' }}>
                          {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : vol.toLocaleString('fr-FR')}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: `${color}99` }}>volume</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PRs — sophisticated design ──────────────────────────────────────────────

function PRCard({ prs }) {
  const [expanded, setExpanded] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)

  const ORDER = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux', 'Autre']
  const byMuscle = {}
  for (const pr of prs) {
    const mg = pr.muscle_group || 'Autre'
    if (!byMuscle[mg]) byMuscle[mg] = []
    byMuscle[mg].push(pr)
  }
  const allGrouped = Object.keys(byMuscle)
    .sort((a, b) => (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b)))
    .map(mg => ({ mg, prs: byMuscle[mg] }))

  const allFlat = allGrouped.flatMap(g => g.prs)
  const LIMIT = 10
  const hidden = Math.max(0, allFlat.length - LIMIT)

  const visibleGroups = (() => {
    if (expanded) return allGrouped
    let count = 0
    const result = []
    for (const g of allGrouped) {
      if (count >= LIMIT) break
      const slice = g.prs.slice(0, LIMIT - count)
      result.push({ mg: g.mg, prs: slice })
      count += slice.length
    }
    return result
  })()

  // Global max weight for relative bar
  const globalMax = Math.max(...allFlat.map(p => p.weight_kg), 1)
  const oneRM = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, rgba(10,18,40,0.95) 0%, rgba(5,10,22,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}
    >
      {/* Ambient glow top-right */}
      <div className="absolute pointer-events-none" style={{
        top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 65%)',
      }} />

      {/* Header */}
      <div className="relative flex items-center gap-4 px-6 pt-6 pb-5">
        {/* Trophy icon with halo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-md" style={{ background: 'rgba(251,191,36,0.25)' }} />
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.08))',
              border: '1px solid rgba(251,191,36,0.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
          </div>
        </div>
        <div>
          <p className="font-black text-white text-base leading-none tracking-tight">Records personnels</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {prs.length} exercices · meilleure charge soulevée
          </p>
        </div>
        {/* Muscle group pills */}
        <div className="ml-auto flex gap-1.5 flex-wrap justify-end">
          {allGrouped.map(({ mg }) => {
            const color = MUSCLE_COLORS[mg] || '#94a3b8'
            const isActive = activeGroup === mg
            return (
              <button
                key={mg}
                onClick={() => setActiveGroup(isActive ? null : mg)}
                className="text-xs font-bold px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: isActive ? `${color}30` : 'rgba(255,255,255,0.05)',
                  color: isActive ? color : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${isActive ? `${color}50` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {mg}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 mb-4 h-px" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.15), transparent)' }} />

      {/* PR list */}
      <div className="px-4 pb-4 space-y-1.5">
        {visibleGroups
          .filter(({ mg }) => !activeGroup || mg === activeGroup)
          .flatMap(({ mg, prs: gPRs }) =>
            gPRs.map((pr, j) => ({ pr, mg, j, isFirst: j === 0 }))
          )
          .map(({ pr, mg, j, isFirst }, globalIdx) => {
            const color = MUSCLE_COLORS[mg] || '#94a3b8'
            const rm = oneRM(pr.weight_kg, pr.reps)
            const barPct = Math.round((pr.weight_kg / globalMax) * 100)
            return (
              <div
                key={`${mg}-${j}`}
                className="group relative rounded-2xl overflow-hidden cursor-default"
                style={{ background: 'rgba(255,255,255,0.025)' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}0e` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
              >
                {/* Strength fill bar — decorative background */}
                <div
                  className="absolute inset-y-0 left-0 rounded-2xl pointer-events-none transition-all duration-700"
                  style={{
                    width: `${barPct}%`,
                    background: `linear-gradient(90deg, ${color}10, transparent)`,
                  }}
                />

                <div className="relative flex items-center gap-3 px-4 py-3">
                  {/* Rank number */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black"
                    style={{
                      background: isFirst ? `linear-gradient(135deg, ${color}40, ${color}15)` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isFirst ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                      color: isFirst ? color : 'rgba(255,255,255,0.2)',
                      fontSize: isFirst ? 12 : 10,
                      boxShadow: isFirst ? `0 0 10px ${color}25` : 'none',
                    }}
                  >
                    {globalIdx + 1}
                  </div>

                  {/* Muscle dot + name */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
                    />
                    <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {pr.exercise_name}
                    </span>
                  </div>

                  {/* Weight */}
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span
                      className="font-black leading-none"
                      style={{
                        fontSize: isFirst ? '1.6rem' : '1.25rem',
                        color: isFirst ? 'white' : 'rgba(255,255,255,0.9)',
                        textShadow: isFirst ? `0 0 20px ${color}55` : 'none',
                      }}
                    >
                      {pr.weight_kg}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>kg</span>
                  </div>

                  {/* × reps */}
                  <div
                    className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg"
                    style={{ background: `${color}12`, border: `1px solid ${color}20` }}
                  >
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>×</span>
                    <span className="font-black text-sm leading-none" style={{ color }}>
                      {pr.reps}
                    </span>
                    <span className="text-xs font-medium" style={{ color: `${color}70` }}>rep</span>
                  </div>

                  {/* 1RM */}
                  <div className="text-right shrink-0" style={{ minWidth: 52 }}>
                    <p className="font-black text-sm leading-none" style={{ color: '#fbbf24' }}>~{rm}</p>
                    <p className="mt-0.5 font-semibold" style={{ color: 'rgba(251,191,36,0.35)', fontSize: 9 }}>1RM est.</p>
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {/* Show more */}
      {allFlat.length > LIMIT && !activeGroup && (
        <div className="px-4 pb-5">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            {expanded
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>RÉDUIRE</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>{hidden} RECORDS SUPPLÉMENTAIRES</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Compact badges card ──────────────────────────────────────────────────────

function BadgesCard({ stats, onSeeAll }) {
  if (!stats) return null

  const unlocked = ALL_BADGES.filter(b => b.check(stats)).length
  // Pick the highest earned badge per category (most impressive per pillar)
  const highlights = CATEGORIES.flatMap(cat => {
    const earned = cat.badges.filter(b => b.check(stats))
    return earned.length > 0 ? [earned[earned.length - 1]] : []
  })

  if (highlights.length === 0) return null

  return (
    <Card title="">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
            Badges obtenus
          </p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(var(--ac),0.12)', color: 'rgba(var(--ac-lt),0.6)' }}
          >
            {unlocked} / {ALL_BADGES.length}
          </span>
        </div>
        <button
          onClick={onSeeAll}
          className="text-xs font-semibold transition-colors flex items-center gap-1"
          style={{ color: 'rgba(var(--ac-l),0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--ac-l))' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--ac-l),0.45)' }}
        >
          Voir tous
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${(unlocked / ALL_BADGES.length) * 100}%`,
            background: 'linear-gradient(90deg, rgb(var(--ac-d)), rgb(var(--ac-l)))',
          }}
        />
      </div>

      {/* Grid — one best badge per category */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))' }}>
        {highlights.map(badge => (
          <div
            key={badge.id}
            title={`${badge.label} — ${badge.desc}`}
            className="rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5 cursor-default transition-all"
            style={{
              background: `${badge.color}10`,
              border: `1px solid ${badge.color}28`,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 14px ${badge.color}22` }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${badge.color}20` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={badge.color}>
                {badge.icon}
              </svg>
            </div>
            <p className="font-bold leading-tight" style={{ fontSize: 10, color: badge.color, lineHeight: 1.2 }}>
              {badge.label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Full badges modal ─────────────────────────────────────────────────────────

function BadgesModal({ stats, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0c1a35 0%, #060e1e 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
          maxHeight: '88vh',
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}
        >
          <p className="font-bold text-white text-sm">Tous les badges</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            ✕
          </button>
        </div>
        {/* Full Badges component */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <Badges stats={stats} />
        </div>
      </div>
    </div>
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
  const [profile, setProfile]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showBadges, setShowBadges]   = useState(false)
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
                    {profile.goal && (() => {
                      const meta = GOAL_META[profile.goal]
                      const color = meta?.color || 'rgb(var(--ac-l))'
                      const label = meta?.label || profile.goal
                      return (
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{
                            background: meta ? `${color}18` : 'rgba(var(--ac),0.1)',
                            color,
                            border: `1px solid ${meta ? color + '40' : 'rgba(var(--ac),0.18)'}`,
                          }}
                        >
                          {label}
                        </span>
                      )
                    })()}
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

            {/* ── Badges ─────────────────────────────────────────────────────── */}
            <BadgesCard stats={profile.stats} onSeeAll={() => setShowBadges(true)} />

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

      {showBadges && profile && (
        <BadgesModal stats={profile.stats} onClose={() => setShowBadges(false)} />
      )}
    </div>
  )
}
