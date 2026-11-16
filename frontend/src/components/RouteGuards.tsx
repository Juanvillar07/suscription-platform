import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

function FullPageLoader() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

/** Requiere sesión iniciada; si no, redirige a /login conservando el destino */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function AdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <Outlet />
}

/** Para /login y /register: si ya hay sesión, ir al panel */
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
