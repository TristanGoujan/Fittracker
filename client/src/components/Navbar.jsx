import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { animate } from 'animejs'
import { useAuth } from '../hooks/useAuth'
import { useTheme, THEMES } from '../hooks/useTheme'
import { getFriendRequests } from '../api/friends'

// ─── Nav item icons ────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  )
}
function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
    </svg>
  )
}
function IconSocial() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  )
}
function IconPrograms() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  )
}
function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  )
}
function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  )
}

// ─── Nav items config ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard',   Icon: IconHome,     exact: true },
  { to: '/history',  label: 'Historique',  Icon: IconHistory,  exact: false },
  { to: '/social',   label: 'Social',      Icon: IconSocial,   exact: false },
  { to: '/programs', label: 'Programmes',  Icon: IconPrograms, exact: false },
  { to: '/profile',  label: 'Profil',      Icon: IconProfile,  exact: false },
]

// ─── Theme picker (inline panel) ──────────────────────────────────────────────

function ThemePanel() {
  const { themeId } = useTheme()
  return (
    <div className="px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'rgba(var(--ac-lt),0.3)' }}>
        Thème
      </p>
      <div className="space-y-0.5">
        {Object.values(THEMES).map((t) => {
          const active = themeId === t.id
          return (
            <button
              key={t.id}
              onClick={() => { localStorage.setItem('fittracker:theme', t.id); window.location.reload() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all text-left"
              style={{
                background: active ? `rgba(var(--ac),0.12)` : 'transparent',
                border: `1px solid ${active ? `rgba(var(--ac),0.2)` : 'transparent'}`,
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{
                  background: t.swatch,
                  outline: active ? `2px solid ${t.swatch}` : '2px solid transparent',
                  outlineOffset: '1px',
                }}
              />
              <span className="text-xs font-semibold" style={{ color: active ? 'white' : 'rgba(255,255,255,0.4)' }}>
                {t.name}
              </span>
              {active && (
                <svg className="ml-auto" width="10" height="10" viewBox="0 0 24 24" fill="rgb(var(--ac-l))">
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

// ─── Single nav item (hover tracked via state to avoid DOM color glitch) ──────

function NavItem({ to, label, Icon, exact, pendingCount }) {
  const [hovered, setHovered] = useState(false)
  const iconRef = useRef(null)

  useEffect(() => {
    if (!iconRef.current) return
    animate(iconRef.current, { translateX: hovered ? 2 : 0, duration: 180, easing: 'easeOutQuad' })
  }, [hovered])

  return (
    <NavLink
      to={to}
      end={exact}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? 'white' : hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
        background: isActive ? 'rgba(var(--ac),0.1)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: isActive ? '3px solid rgb(var(--ac-l))' : '3px solid transparent',
        transition: 'all 0.15s',
        textDecoration: 'none',
      })}
    >
      {({ isActive }) => (
        <>
          <span ref={iconRef} style={{ color: isActive ? 'rgb(var(--ac-l))' : hovered ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)', display: 'flex' }}>
            <Icon />
          </span>
          <span>{label}</span>
          {pendingCount > 0 && (
            <span
              className="ml-auto"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18,
                background: '#ef4444', color: 'white',
                fontSize: 10, fontWeight: 700, borderRadius: 9, padding: '0 4px',
              }}
            >
              {pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [showTheme, setShowTheme] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!token) return
    getFriendRequests(token)
      .then(data => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [token])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className="hidden md:flex shrink-0 flex-col h-full overflow-y-auto overflow-x-hidden"
      style={{
        width: 220,
        borderRight: '1px solid rgba(var(--ac),0.08)',
        background: 'rgba(2,8,16,0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-2 shrink-0">
        <Link to="/" className="font-black text-lg tracking-tight select-none">
          <span style={{ color: 'rgb(var(--ac-l))' }}>Fit</span>
          <span className="text-white">Tracker</span>
        </Link>
      </div>

      {/* ── User card ── */}
      <Link
        to="/profile"
        className="mx-3 mt-3 mb-1 rounded-2xl p-3 flex items-center gap-3 transition-all shrink-0"
        style={{ background: 'rgba(var(--ac),0.06)', border: '1px solid rgba(var(--ac),0.1)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--ac),0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--ac),0.06)' }}
      >
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: user?.avatar_url ? 'transparent' : 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))' }}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            (user?.username ?? '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white truncate leading-tight">
            {user?.username ?? '—'}
          </span>
          <span className="text-xs truncate" style={{ color: 'rgba(var(--ac-lt),0.4)' }}>
            Mon profil
          </span>
        </div>
      </Link>

      {/* ── Nav items ── */}
      <nav className="flex flex-col gap-0.5 px-3 mt-3">
        {NAV_ITEMS.map(({ to, label, Icon, exact }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} exact={exact} pendingCount={label === 'Social' ? pendingCount : 0} />
        ))}
      </nav>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── CTA button ── */}
      <div className="px-3 pb-3 shrink-0">
        <Link
          to="/new"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
            boxShadow: '0 4px 18px rgba(var(--ac-d),0.35)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(var(--ac-d),0.55)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(var(--ac-d),0.35)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Nouvelle séance
        </Link>
      </div>

      {/* ── Theme toggle ── */}
      <div className="shrink-0" style={{ borderTop: '1px solid rgba(var(--ac),0.07)' }}>
        <button
          onClick={() => setShowTheme((v) => !v)}
          className="w-full flex items-center gap-2.5 px-5 py-3 transition-all"
          style={{ color: 'rgba(var(--ac-lt),0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.65)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--ac-lt),0.35)' }}
        >
          <IconGear />
          <span className="text-xs font-semibold">Thème</span>
          <svg
            className="ml-auto"
            width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            style={{ transform: showTheme ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
        {showTheme && <ThemePanel />}
      </div>

      {/* ── Logout ── */}
      <div className="shrink-0 px-3 pb-5" style={{ borderTop: '1px solid rgba(var(--ac),0.07)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all mt-2"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.07)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <IconLogout />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
