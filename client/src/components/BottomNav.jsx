import { NavLink } from 'react-router-dom'

const ITEMS = [
  {
    to: '/', exact: true, label: 'Accueil',
    icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  },
  {
    to: '/history', label: 'Historique',
    icon: <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />,
  },
  {
    to: '/new', label: 'Séance', isNew: true,
    icon: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />,
  },
  {
    to: '/social', label: 'Social',
    icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
  },
  {
    to: '/profile', label: 'Profil',
    icon: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
  },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden"
      style={{
        background: 'rgba(2,8,16,0.96)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {ITEMS.map(({ to, exact, label, icon, isNew }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
          style={({ isActive }) => ({
            color: isActive ? 'rgb(var(--ac-l))' : 'rgba(255,255,255,0.35)',
            textDecoration: 'none',
          })}
        >
          {isNew ? (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center -mt-4"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--ac-d)), rgb(var(--ac-dd)))',
                boxShadow: '0 4px 16px rgba(var(--ac-d),0.45)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">{icon}</svg>
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">{icon}</svg>
          )}
          <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
