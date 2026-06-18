import { Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useCallback, useContext, useState } from 'react'

import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Productos from './pages/Productos.jsx'
import Categorias from './pages/Categorias.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Ventas from './pages/Ventas.jsx'
import Clientes from './pages/Clientes.jsx'
import Inventario from './pages/Inventario.jsx'
import Auditoria from './pages/Auditoria.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { hayToken } from './services/api.js'

export const ToastCtx = createContext(null)

export function useToast() {
  return useContext(ToastCtx)
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type = 'success') => {
    const id = Date.now()

    setToasts(current => [...current, { id, msg, type }])

    setTimeout(() => {
      setToasts(current => current.filter(toast => toast.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}

      <div className="toast-wrap">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function PublicRoute({ children }) {
  if (hayToken()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="auditoria" element={<Auditoria />} />
        </Route>
        <Route path="*" element={<Navigate to={hayToken() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </ToastProvider>
  )
}
