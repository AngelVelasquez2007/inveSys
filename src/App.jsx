import { Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Productos from './pages/Productos.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Ventas from './pages/Ventas.jsx'
import Clientes from './pages/Clientes.jsx'
import Inventario from './pages/Inventario.jsx'
import Auditoria from './pages/Auditoria.jsx'
import Sucursales from './pages/Sucursales.jsx'
import Descuentos from './pages/Descuentos.jsx'
import Configuracion from './pages/Configuracion.jsx'
import Setup from './pages/Setup.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { hayToken, getApiUrl } from './services/api.js'

function getUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem('usuario'))
  } catch {
    return null
  }
}

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

function necesitaSetup() {
  const url = getApiUrl()
  return !url || url === '/api'
}

function AdminRoute({ children }) {
  const usuario = getUsuario()
  if (usuario?.rol !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function PublicRoute({ children }) {
  if (hayToken()) {
    return <Navigate to="/dashboard" replace />
  }

  if (necesitaSetup() && window.location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return children
}

function aplicarTema() {
  const modo = localStorage.getItem('theme_modo') || 'auto'
  let resolved = modo
  if (resolved === 'auto') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
  }
  const base = resolved === 'oscuro' ? 'theme-oscuro' : ''
  const accent = localStorage.getItem('theme_accent') || ''
  const accentClass = accent ? `accent-${accent}` : ''
  document.documentElement.className = [base, accentClass].filter(Boolean).join(' ')
}

export default function App() {
  useEffect(() => {
    aplicarTema()

    window.addEventListener('themechange', aplicarTema)
    return () => window.removeEventListener('themechange', aplicarTema)
  }, [])

  useEffect(() => {
    const modo = localStorage.getItem('theme_modo') || 'auto'
    if (modo !== 'auto') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => aplicarTema()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
          <Route path="sucursales" element={<Sucursales />} />
          <Route path="descuentos" element={<Descuentos />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
        <Route path="*" element={<Navigate to={hayToken() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </ToastProvider>
  )
}
