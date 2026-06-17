import { NavLink, Outlet } from 'react-router-dom'
import {
  Archive,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Users,
  Warehouse,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/inventario', label: 'Inventario', icon: Warehouse },
  { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
]

export default function Layout() {
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
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
