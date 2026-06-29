import { useState, useEffect, useRef } from 'react'
import {
  Building2,
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  Monitor,
  Moon,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { api, apiError } from '../services/api.js'
import { useToast } from '../App.jsx'

const MODOS = [
  { id: 'auto', label: 'Automático', icon: Monitor },
  { id: 'claro', label: 'Claro', icon: Sun },
  { id: 'oscuro', label: 'Oscuro', icon: Moon },
]

const COLORES = [
  { id: '', label: 'Predet.', color: '#2563eb' },
  { id: 'azul', label: 'Azul', color: '#0284c7' },
  { id: 'verde', label: 'Verde', color: '#16a34a' },
  { id: 'morado', label: 'Morado', color: '#7c3aed' },
  { id: 'rosa', label: 'Rosa', color: '#db2777' },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Configuracion() {
  const toast = useToast()
  const avatarInputRef = useRef(null)
  const [usuario, setUsuario] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modoActual, setModoActual] = useState(() => localStorage.getItem('theme_modo') || 'auto')
  const [accentActual, setAccentActual] = useState(() => localStorage.getItem('theme_accent') || '')

  const [nombre, setNombre] = useState('')
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [contrasenaNueva, setContrasenaNueva] = useState('')
  const [mostrarActual, setMostrarActual] = useState(false)
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [regenerando, setRegenerando] = useState(false)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)

  useEffect(() => {
    Promise.all([cargarUsuario(), cargarEmpresa()]).finally(() => setCargando(false))
  }, [])

  async function cargarUsuario() {
    try {
      const { data } = await api.get('/auth/me')
      setUsuario(data)
      setNombre(data.nombre)
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function cargarEmpresa() {
    try {
      const { data } = await api.get('/auth/me/empresa')
      setEmpresa(data)
    } catch {
      // ignora si no tiene empresa
    }
  }

  function resolverModo(modo) {
    if (modo === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
    }
    return modo
  }

  function aplicarTema(modo, accent) {
    const actual = resolverModo(modo)
    const base = actual === 'oscuro' ? 'theme-oscuro' : ''
    const accentClass = accent ? `accent-${accent}` : ''
    document.documentElement.className = [base, accentClass].filter(Boolean).join(' ')
  }

  function cambiarModo(id) {
    setModoActual(id)
    localStorage.setItem('theme_modo', id)
    aplicarTema(id, accentActual)
    window.dispatchEvent(new Event('themechange'))
  }

  function cambiarAccent(id) {
    setAccentActual(id)
    localStorage.setItem('theme_accent', id)
    aplicarTema(modoActual, id)
    window.dispatchEvent(new Event('themechange'))
  }

  useEffect(() => {
    if (modoActual !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => aplicarTema(modoActual, accentActual)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [modoActual, accentActual])

  async function guardarPerfil(event) {
    event.preventDefault()
    setGuardandoPerfil(true)
    try {
      const { data } = await api.put('/auth/me', { nombre: nombre.trim() })
      setUsuario((prev) => ({ ...prev, nombre: data.nombre }))
      const stored = JSON.parse(sessionStorage.getItem('usuario') || '{}')
      stored.nombre = data.nombre
      sessionStorage.setItem('usuario', JSON.stringify(stored))
      toast('Nombre actualizado')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  async function guardarContrasena(event) {
    event.preventDefault()
    if (!contrasenaActual || !contrasenaNueva) return
    if (contrasenaNueva.length < 6) {
      toast('La contraseña debe tener al menos 6 caracteres', 'error')
      return
    }
    setGuardandoPass(true)
    try {
      await api.put('/auth/me/password', {
        contrasena_actual: contrasenaActual,
        contrasena_nueva: contrasenaNueva,
      })
      toast('Contraseña actualizada')
      setContrasenaActual('')
      setContrasenaNueva('')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setGuardandoPass(false)
    }
  }

  function copiarCodigo() {
    if (!empresa?.codigo_admin) return
    navigator.clipboard.writeText(empresa.codigo_admin)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function regenerarCodigo() {
    if (!window.confirm('¿Regenerar el código? Los trabajadores existentes deberán usar el nuevo código para registrarse.')) return
    setRegenerando(true)
    try {
      const { data } = await api.post('/auth/me/regenerar-codigo')
      setEmpresa((prev) => ({ ...prev, codigo_admin: data.codigo_admin }))
      toast('Código regenerado')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setRegenerando(false)
    }
  }

  async function cambiarAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast('La imagen debe ser menor a 2 MB', 'error'); return }
    setSubiendoAvatar(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUsuario(prev => ({ ...prev, avatar_url: data.avatar_url }))
      const stored = JSON.parse(sessionStorage.getItem('usuario') || '{}')
      stored.avatar_url = data.avatar_url
      sessionStorage.setItem('usuario', JSON.stringify(stored))
      toast('Foto de perfil actualizada')
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setSubiendoAvatar(false)
    }
  }

  if (cargando) return <div className="page-loading">Cargando configuración…</div>

  const esAdmin = usuario?.rol === 'ADMIN'

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Mi cuenta</h1>
          <p className="page-subtitle">Información personal, seguridad y preferencias.</p>
        </div>
      </header>

      {/* Perfil */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            {usuario?.avatar_url ? (
              <img
                src={usuario.avatar_url}
                alt="Avatar"
                className="avatar avatar-lg"
                style={{ objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              <div className="avatar avatar-lg">{getInitials(usuario?.nombre)}</div>
            )}
            <button
              type="button"
              className="btn-icon"
              onClick={() => avatarInputRef.current?.click()}
              disabled={subiendoAvatar}
              title="Cambiar foto"
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                border: '2px solid var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {subiendoAvatar ? <span style={{ fontSize: '.6rem' }}>…</span> : <Camera size={13} />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={cambiarAvatar}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 2 }}>{usuario?.nombre}</h2>
            <p className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> {usuario?.correo}
            </p>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {esAdmin ? 'Administrador' : 'Usuario'}
              {usuario?.created_at ? ` · Miembro desde ${new Date(usuario.created_at).toLocaleDateString()}` : ''}
            </p>
            {usuario?.sucursal_nombre && (
              <p className="text-sm text-muted" style={{ marginTop: 2 }}>
                <Store size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Sucursal: <strong>{usuario.sucursal_nombre}</strong>
              </p>
            )}
          </div>

          {empresa && (
            <div className="tag" style={{ fontSize: '.8rem', padding: '4px 12px' }}>
              <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {empresa.nombre}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        {/* Información personal */}
        <div className="card">
          <div className="card-body">
            <h2 className="page-title text-sm mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} /> Información personal
            </h2>

            <form onSubmit={guardarPerfil}>
              <label className="form-group">
                <span className="form-label">Nombre completo</span>
                <input
                  className="form-control"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  minLength="3"
                  required
                />
              </label>

              <button className="btn btn-primary" type="submit" disabled={guardandoPerfil || !nombre.trim()}>
                <Save size={16} />
                {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <div className="card-body">
            <h2 className="page-title text-sm mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={18} /> Cambiar contraseña
            </h2>

            <form onSubmit={guardarContrasena}>
              <label className="form-group">
                <span className="form-label">Contraseña actual</span>
                <div className="input-box">
                  <Lock size={16} />
                  <input
                    type={mostrarActual ? 'text' : 'password'}
                    className="form-control"
                    style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent' }}
                    value={contrasenaActual}
                    onChange={(e) => setContrasenaActual(e.target.value)}
                    minLength="6"
                    required
                  />
                  <button type="button" className="eye-button" onClick={() => setMostrarActual(!mostrarActual)}>
                    {mostrarActual ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="form-group">
                <span className="form-label">Contraseña nueva</span>
                <div className="input-box">
                  <Lock size={16} />
                  <input
                    type={mostrarNueva ? 'text' : 'password'}
                    className="form-control"
                    style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent' }}
                    value={contrasenaNueva}
                    onChange={(e) => setContrasenaNueva(e.target.value)}
                    minLength="6"
                    required
                  />
                  <button type="button" className="eye-button" onClick={() => setMostrarNueva(!mostrarNueva)}>
                    {mostrarNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button className="btn btn-primary" type="submit" disabled={guardandoPass || !contrasenaActual || !contrasenaNueva}>
                <Save size={16} />
                {guardandoPass ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        </div>

        {/* Apariencia */}
        <div className="card">
          <div className="card-body">
            <h2 className="page-title text-sm mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} /> Apariencia
            </h2>

            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Modo claro/oscuro y color de acento.
            </p>

            <span className="form-label">Modo</span>
            <div className="theme-grid" style={{ marginBottom: 16 }}>
              {MODOS.map((m) => {
                const Icon = m.icon
                const activo = modoActual === m.id

                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`theme-option${activo ? ' active' : ''}`}
                    onClick={() => cambiarModo(m.id)}
                  >
                    <Icon size={22} />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>

            <span className="form-label">Color de acento</span>
            <div className="theme-grid">
              {COLORES.map((c) => {
                const activo = accentActual === c.id

                return (
                  <button
                    key={c.id || 'default'}
                    type="button"
                    className={`theme-option${activo ? ' active' : ''}`}
                    onClick={() => cambiarAccent(c.id)}
                  >
                    <span className="theme-swatch" style={{ background: c.color }} />
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Código de administrador (solo admin) */}
        {esAdmin && empresa && (
          <div className="card">
            <div className="card-body">
              <h2 className="page-title text-sm mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} /> Código de empresa
              </h2>

              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Comparte este código con tus trabajadores para que puedan registrarse como usuarios.
              </p>

              <div className="input-box" style={{ marginBottom: 12 }}>
                <Key size={18} />
                <code style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700, letterSpacing: 3 }}>
                  {empresa.codigo_admin}
                </code>

                <button type="button" className="eye-button" onClick={copiarCodigo} title="Copiar código">
                  {copiado ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={copiarCodigo}>
                  <Copy size={16} />
                  {copiado ? 'Copiado' : 'Copiar código'}
                </button>

                <button className="btn btn-secondary" onClick={regenerarCodigo} disabled={regenerando}>
                  <RefreshCw size={16} className={regenerando ? 'anim-pulse' : ''} />
                  {regenerando ? 'Regenerando...' : 'Regenerar código'}
                </button>
              </div>

              <div className="stats-grid" style={{ marginTop: 16, marginBottom: 0 }}>
                <div className="stat-card" style={{ padding: '12px 16px' }}>
                  <div className="stat-label">Sucursales</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>{empresa.total_sucursales}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px 16px' }}>
                  <div className="stat-label">Usuarios</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>{empresa.total_usuarios}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
