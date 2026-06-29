import { Navigate } from 'react-router-dom'
import { hayToken } from '../services/api.js'

export default function ProtectedRoute({ children }) {
  if (!hayToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}
