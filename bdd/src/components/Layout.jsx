import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Archive,
  Bookmark,
  Building2,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  ShieldCheck,
  Users,
  Warehouse,
} from 'lucide-react'
import { cerrarSesion } from '../services/authService.js'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/categorias', label: 'Categorías', icon: Bookmark },
  { to: '/proveedores', label: 'Proveedores', icon: Building2 },
  { to: '/ventas', label: 'Ventas', icon: Receipt },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/inventario', label: 'Inventario', icon: Warehouse },
  { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
]

export default function Layout() {
  const navigate = useNavigate()

  function handleLogout() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Archive size={24} color="#60a5fa" strokeWidth={2} />
          <span>InveSys</span>
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
          <div className="nav-item" style={{ cursor: 'default' }}>
            <Package size={14} />
            <span style={{ fontSize: '.72rem', opacity: 0.55 }}>
              Proyecto BD 2025 - v1.0
            </span>
          </div>

          <button className="nav-item logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
