import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Archive,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Warehouse,
} from 'lucide-react'
import { cerrarSesion } from '../services/authService.js'
import ChatBubble from './ChatBubble.jsx'

function getUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem('usuario'))
  } catch {
    return null
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  const [modo, setModo] = useState(() => {
    return localStorage.getItem('theme_modo') || 'auto'
  })

  const [accent, setAccent] = useState(() => {
    return localStorage.getItem('theme_accent') || ''
  })

  function resolverModo(m) {
    if (m === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
    }
    return m
  }

  function aplicarTema(m, a) {
    const actual = resolverModo(m)
    const base = actual === 'oscuro' ? 'theme-oscuro' : ''
    const accentClass = a ? `accent-${a}` : ''
    document.documentElement.className = [base, accentClass].filter(Boolean).join(' ')
  }

  useEffect(() => {
    aplicarTema(modo, accent)

    if (modo === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => aplicarTema(modo, accent)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [modo, accent])

  useEffect(() => {
    function handler() {
      const m = localStorage.getItem('theme_modo') || 'auto'
      const a = localStorage.getItem('theme_accent') || ''
      setModo(m)
      setAccent(a)
    }
    window.addEventListener('themechange', handler)
    return () => window.removeEventListener('themechange', handler)
  }, [])

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', next)
  }

  const navItems = [
    { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { to: '/productos', label: 'Productos', icon: Package },
    { to: '/proveedores', label: 'Proveedores', icon: Building2 },
    { to: '/ventas', label: 'Ventas', icon: Receipt },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/inventario', label: 'Inventario', icon: Warehouse },
    { to: '/descuentos', label: 'Descuentos', icon: Megaphone },
    { to: '/sucursales', label: 'Sucursales', icon: Store },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
    ...(esAdmin
      ? [
          { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
        ]
      : []),
  ]

  function handleLogout() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Archive size={24} color="#60a5fa" strokeWidth={2} />
          <span>InveSys</span>

          <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {usuario && (
            <div className="nav-item sidebar-user" onClick={() => navigate('/configuracion')} role="button" tabIndex={0}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                {usuario.avatar_url ? (
                  <img src={usuario.avatar_url} alt="" className="avatar avatar-sm" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <span className="avatar avatar-sm">{getInitials(usuario.nombre)}</span>
                )}
                <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{usuario.nombre}</span>
              </span>
              <span style={{ fontSize: '.7rem', opacity: 0.55, textTransform: 'uppercase' }}>
                {usuario.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
                {usuario.empresa_nombre ? ` · ${usuario.empresa_nombre}` : ''}
              </span>
              {usuario.sucursal_nombre && (
                <span style={{ fontSize: '.7rem', opacity: 0.55 }}>
                  {usuario.sucursal_nombre}
                </span>
              )}
            </div>
          )}

          <div className="nav-item" style={{ cursor: 'default' }}>
            <Package size={14} />
            <span style={{ fontSize: '.72rem', opacity: 0.55 }}>
              v2.0
            </span>
          </div>

          <button className="nav-item logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div key={location.pathname} className="anim-fade-in-up">
          <Outlet />
        </div>
      </main>

      <ChatBubble />
    </div>
  )
}
