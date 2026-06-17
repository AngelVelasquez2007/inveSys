import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { createContext, useCallback, useContext, useState } from 'react'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Productos from './pages/Productos.jsx'
import Clientes from './pages/Clientes.jsx'
import Inventario from './pages/Inventario.jsx'
import Auditoria from './pages/Auditoria.jsx'

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

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="productos" element={<Productos />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="auditoria" element={<Auditoria />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
