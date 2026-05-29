import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import ProtectedLayout from './components/ProtectedLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewSession from './pages/NewSession'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Profile from './pages/Profile'
import Programs from './pages/Programs'
import Social from './pages/Social'
import FriendProfile from './pages/FriendProfile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/new"           element={<NewSession />} />
          <Route path="/history"       element={<History />} />
          <Route path="/sessions/:id"  element={<SessionDetail />} />
          <Route path="/profile"       element={<Profile />} />
          <Route path="/profile/:userId" element={<FriendProfile />} />
          <Route path="/programs"      element={<Programs />} />
          <Route path="/social"        element={<Social />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  )
}
