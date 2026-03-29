import { Outlet } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import Navbar from './Navbar'

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #020810 0%, #07101f 40%, #050c1a 70%, #020810 100%)' }}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  )
}
