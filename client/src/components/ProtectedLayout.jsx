import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { animate } from 'animejs'
import ProtectedRoute from './ProtectedRoute'
import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function ProtectedLayout() {
  const mainRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (!mainRef.current) return
    animate(mainRef.current, { opacity: [0, 1], duration: 220, easing: 'easeOutQuad' })
  }, [location.pathname])

  return (
    <ProtectedRoute>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
      >
        <Navbar />
        <main ref={mainRef} className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </ProtectedRoute>
  )
}
