import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme, THEMES } from '../hooks/useTheme'

// ─── Settings popover ─────────────────────────────────────────────────────────

function ThemePicker({ onClose }) {
  const { themeId, setThemeId } = useTheme()
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 rounded-2xl p-4 z-50 min-w-48"
      style={{
        background: 'rgba(5,12,28,0.97)',
        border: '1px solid rgba(var(--ac),0.18)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
        Thème
      </p>
      <div className="space-y-1">
        {Object.values(THEMES).map((t) => {
          const active = themeId === t.id
          return (
            <button
              key={t.id}
              onClick={() => { localStorage.setItem('fittracker:theme', t.id); window.location.reload() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left"
              style={{
                background: active ? `rgba(var(--ac),0.12)` : 'transparent',
                border: `1px solid ${active ? `rgba(var(--ac),0.25)` : 'transparent'}`,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 ring-2"
                style={{
                  background: t.swatch,
                  boxShadow: active ? `0 0 8px ${t.swatch}60` : 'none',
                  ringColor: active ? t.swatch : 'transparent',
                  outline: active ? `2px solid ${t.swatch}` : '2px solid transparent',
                  outlineOffset: '1px',
                }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: active ? 'white' : 'rgba(255,255,255,0.45)' }}
              >
                {t.name}
              </span>
              {active && (
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="rgb(var(--ac-l))">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav
      className="sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between"
      style={{
        background: 'rgba(2, 8, 16, 0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(var(--ac),0.1)',
      }}
    >
      <Link to="/" className="font-black text-xl tracking-tight select-none">
        <span style={{ color: 'rgb(var(--ac-l))' }}>Fit</span>
        <span className="text-white">Tracker</span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          to="/programs"
          className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
          style={{ color: 'rgba(var(--ac-lt),0.55)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.55)'; e.currentTarget.style.background = 'transparent' }}
        >
          Programmes
        </Link>

        <Link
          to="/history"
          className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
          style={{ color: 'rgba(var(--ac-lt),0.55)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.55)'; e.currentTarget.style.background = 'transparent' }}
        >
          Historique
        </Link>

        <Link
          to="/new"
          className="text-sm text-white font-semibold px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
            boxShadow: '0 2px 14px rgba(var(--ac-d),0.4)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 20px rgba(var(--ac-d),0.6)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(var(--ac-d),0.4)' }}
        >
          + Nouvelle séance
        </Link>

        <div
          className="h-4 w-px mx-1"
          style={{ background: 'rgba(var(--ac),0.15)' }}
        />

        {/* Gear icon — settings */}
        <div className="relative">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              color: showSettings ? 'rgb(var(--ac-l))' : 'rgba(var(--ac-lt),0.35)',
              background: showSettings ? 'rgba(var(--ac),0.12)' : 'transparent',
            }}
            title="Préférences"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--ac-l))'; e.currentTarget.style.background = 'rgba(var(--ac),0.08)' }}
            onMouseLeave={(e) => {
              if (!showSettings) {
                e.currentTarget.style.color = 'rgba(var(--ac-lt),0.35)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transition: 'transform 0.3s', transform: showSettings ? 'rotate(45deg)' : 'rotate(0deg)' }}
            >
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>

          {showSettings && <ThemePicker onClose={() => setShowSettings(false)} />}
        </div>

        <Link
          to="/profile"
          title={`@${user?.username}`}
          className="transition-all"
          onMouseEnter={(e) => { e.currentTarget.firstChild.style.outline = '2px solid rgba(var(--ac),0.5)' }}
          onMouseLeave={(e) => { e.currentTarget.firstChild.style.outline = 'none' }}
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{
              background: user?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              outlineOffset: '2px',
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              (user?.username ?? '?').slice(0, 2).toUpperCase()
            )}
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-lg transition-all font-medium"
          style={{ color: 'rgba(var(--ac-lt),0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.35)'; e.currentTarget.style.background = 'transparent' }}
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
