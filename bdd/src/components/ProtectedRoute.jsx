import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { estaAutenticado } from '../services/authService.js'

export default function ProtectedRoute() {
  const location = useLocation()

  if (!estaAutenticado()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
