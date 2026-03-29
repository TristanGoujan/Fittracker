import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

const MUSCLE_COLORS = {
  Pectoraux:  '#6366f1',
  Dos:        '#10b981',
  Épaules:    '#f59e0b',
  Biceps:     '#ef4444',
  Triceps:    '#a855f7',
  Jambes:     '#3b82f6',
  Abdominaux: '#14b8a6',
}

function formatCardDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  const year = d.getFullYear()
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month} ${year}`
}

function formatDuration(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${m}`
}

// ─── Share card (captured by html2canvas) ─────────────────────────────────────
function ShareCard({ cardRef, session, username, ac, acL, acD, acDd }) {
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s2, s) => s2 + (s.weight_kg ?? 0) * (s.reps ?? 0), 0), 0
  )
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const displayed = session.exercises.slice(0, 5)
  const extra    = session.exercises.length - displayed.length

  const cardBg = 'linear-gradient(145deg, #020810 0%, #061120 45%, #040d1a 75%, #020810 100%)'

  return (
    <div
      ref={cardRef}
      style={{
        width: '400px',
        background: cardBg,
        borderRadius: '20px',
        padding: '28px',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Glow orb – top right */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${acD},0.22) 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      {/* Glow orb – bottom left */}
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        left: '-40px',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${ac},0.1) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* ── Header: logo + username ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Dumbbell icon box */}
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            background: `linear-gradient(135deg, rgb(${acD}), rgb(${acDd}))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px rgba(${acD},0.4)`,
          }}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🏋</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.4px' }}>
            <span style={{ color: `rgb(${acL})` }}>Fit</span>
            <span style={{ color: 'white' }}>Tracker</span>
          </span>
        </div>
        <span style={{
          color: `rgba(255,255,255,0.3)`,
          fontSize: '12px',
          fontWeight: 600,
          background: `rgba(${ac},0.08)`,
          border: `1px solid rgba(${ac},0.15)`,
          borderRadius: '20px',
          padding: '3px 10px',
        }}>
          @{username}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: `rgba(${ac},0.12)`, marginBottom: '22px' }} />

      {/* ── Session name + date ── */}
      <div style={{ marginBottom: '22px', position: 'relative' }}>
        <p style={{
          color: 'white',
          fontWeight: 900,
          fontSize: '26px',
          letterSpacing: '-0.6px',
          lineHeight: 1.1,
          marginBottom: '7px',
        }}>
          {session.name || 'Séance'}
        </p>
        <p style={{
          color: `rgba(${acL},0.45)`,
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.2px',
        }}>
          {formatCardDate(session.session_date)}
        </p>
      </div>

      {/* ── Stat boxes ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', position: 'relative' }}>
        {[
          {
            value: totalVolume > 0 ? Math.round(totalVolume).toLocaleString('fr-FR') : '—',
            unit: 'kg',
            label: 'Volume',
          },
          {
            value: formatDuration(session.duration_min) || '—',
            unit: '',
            label: 'Durée',
          },
          {
            value: session.exercises.length,
            unit: '',
            label: session.exercises.length > 1 ? 'Exercices' : 'Exercice',
          },
          {
            value: totalSets,
            unit: '',
            label: totalSets > 1 ? 'Séries' : 'Série',
          },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1,
            background: `rgba(${ac},0.07)`,
            border: `1px solid rgba(${ac},0.13)`,
            borderRadius: '12px',
            padding: '11px 6px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}>
              <p style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '18px',
                lineHeight: 1,
                letterSpacing: '-0.3px',
              }}>
                {stat.value}
              </p>
              {stat.unit && (
                <p style={{ color: `rgba(${acL},0.4)`, fontSize: '10px', fontWeight: 600 }}>
                  {stat.unit}
                </p>
              )}
            </div>
            <p style={{
              color: `rgba(${acL},0.35)`,
              fontSize: '10px',
              fontWeight: 600,
              marginTop: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: `rgba(${ac},0.08)`, marginBottom: '16px' }} />

      {/* ── Exercise list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
        {displayed.map((ex) => {
          const color = MUSCLE_COLORS[ex.muscle_group] || '#3b82f6'
          const weightedSets = ex.sets.filter(s => s.weight_kg && s.reps)
          const bestSet = weightedSets.length > 0
            ? weightedSets.reduce((max, s) => s.weight_kg > max.weight_kg ? s : max, weightedSets[0])
            : null
          const setCount = ex.sets.length
          const detail = bestSet
            ? `${setCount} × ${bestSet.weight_kg} kg`
            : `${setCount} × ${ex.sets[0]?.reps ?? '?'} reps`

          return (
            <div key={ex.se_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Color dot */}
              <div style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${color}90`,
              }} />
              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {ex.exercise_name}
                </span>
              </div>
              {/* Detail */}
              <span style={{
                color: `rgba(${acL},0.4)`,
                fontSize: '12px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {detail}
              </span>
            </div>
          )
        })}
        {extra > 0 && (
          <p style={{
            color: `rgba(${acL},0.28)`,
            fontSize: '11px',
            fontWeight: 500,
            marginTop: '2px',
          }}>
            + {extra} autre{extra > 1 ? 's' : ''} exercice{extra > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: `1px solid rgba(${ac},0.07)`,
        textAlign: 'center',
      }}>
        <p style={{
          color: `rgba(${acL},0.18)`,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          fittracker.app
        </p>
      </div>
    </div>
  )
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
export default function ShareModal({ session, username, onClose }) {
  const cardRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Read resolved CSS var values (actual RGB channels)
  const cssVars = (() => {
    const s = getComputedStyle(document.documentElement)
    return {
      ac:   s.getPropertyValue('--ac').trim()    || '59,130,246',
      acL:  s.getPropertyValue('--ac-l').trim()  || '96,165,250',
      acD:  s.getPropertyValue('--ac-d').trim()  || '37,99,235',
      acDd: s.getPropertyValue('--ac-dd').trim() || '29,78,216',
    }
  })()

  async function capture() {
    return html2canvas(cardRef.current, {
      scale: 2.5,
      backgroundColor: '#020810',
      logging: false,
      useCORS: true,
      allowTaint: true,
    })
  }

  async function handleDownload() {
    setCapturing(true)
    try {
      const canvas = await capture()
      const a = document.createElement('a')
      a.download = `fittracker-${(session.name || 'seance').replace(/\s+/g, '-').toLowerCase()}-${session.session_date}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } finally {
      setCapturing(false)
    }
  }

  async function handleCopy() {
    setCapturing(true)
    try {
      const canvas = await capture()
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        } catch {
          // Clipboard API not available — fall back to download
          const a = document.createElement('a')
          a.download = `fittracker-${session.session_date}.png`
          a.href = canvas.toDataURL('image/png')
          a.click()
        }
      }, 'image/png')
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-full"
        style={{ maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-black text-base">Partager la séance</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
              Télécharge ou copie le résumé en image
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Card preview — this is what gets captured */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
          <ShareCard
            cardRef={cardRef}
            session={session}
            username={username}
            ac={cssVars.ac}
            acL={cssVars.acL}
            acD={cssVars.acD}
            acDd={cssVars.acDd}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDownload}
            disabled={capturing}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
              boxShadow: '0 4px 16px rgba(var(--ac-d),0.3)',
            }}
          >
            {capturing ? (
              <span className="opacity-70">Génération…</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Télécharger
              </span>
            )}
          </button>
          <button
            onClick={handleCopy}
            disabled={capturing}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
              border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#4ade80' : 'rgba(255,255,255,0.55)',
            }}
          >
            {copied ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Copié !
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Copier l'image
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
