import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  PackageCheck,
  ShieldCheck,
  Store,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  loginUsuario,
  registrarAdmin,
  registrarUsuario,
  verificarCodigoAdmin,
} from '../services/authService.js'
import { apiError, getApiUrl, setApiUrl } from '../services/api.js'

export default function Login() {
  const navigate = useNavigate()
  const [modo, setModo] = useState('login')
  const [rolRegistro, setRolRegistro] = useState('admin')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [codigoAdmin, setCodigoAdmin] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [sucursales, setSucursales] = useState([])
  const [codigoVerificado, setCodigoVerificado] = useState(false)
  const [empresaVerificada, setEmpresaVerificada] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const esRegistro = modo === 'registro'
  const esAdminRegistro = esRegistro && rolRegistro === 'admin'
  const esUsuarioRegistro = esRegistro && rolRegistro === 'usuario'

  function limpiarMensajes() {
    setError('')
    setMensaje('')
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    limpiarMensajes()
    setMostrarClave(false)
    setMostrarConfirmacion(false)
    setCodigoAdmin('')
    setSucursalId('')
    setSucursales([])
    setCodigoVerificado(false)
    setEmpresaVerificada('')
  }

  async function manejarLogin(event) {
    event.preventDefault()
    limpiarMensajes()
    setCargando(true)

    try {
      await loginUsuario({ correo, contrasena })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(apiError(err))
    } finally {
      setCargando(false)
    }
  }

  async function manejarVerificarCodigo() {
    if (!codigoAdmin.trim()) {
      setError('Ingresa un código de administrador')
      return
    }

    limpiarMensajes()
    setVerificando(true)

    try {
      const data = await verificarCodigoAdmin(codigoAdmin.trim())
      setSucursales(data.sucursales)
      setEmpresaVerificada(data.empresa_nombre)
      setCodigoVerificado(true)
      setSucursalId('')
    } catch (err) {
      setError(apiError(err))
      setCodigoVerificado(false)
      setSucursales([])
      setEmpresaVerificada('')
    } finally {
      setVerificando(false)
    }
  }

  function esCorreoValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function manejarRegistro(event) {
    event.preventDefault()
    limpiarMensajes()

    if (contrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (!esCorreoValido(correo)) {
      setError('Correo electrónico inválido.')
      return
    }

    if (esAdminRegistro && !nombreEmpresa.trim()) {
      setError('El nombre de la empresa es requerido.')
      return
    }

    if (esUsuarioRegistro && !codigoVerificado) {
      setError('Debes verificar el código del administrador primero.')
      return
    }

    if (esUsuarioRegistro && sucursales.length > 0 && !sucursalId) {
      setError('Selecciona una sucursal para continuar.')
      return
    }

    setCargando(true)

    try {
      if (esAdminRegistro) {
        const data = await registrarAdmin({
          nombre,
          correo,
          contrasena,
          nombre_empresa: nombreEmpresa.trim(),
        })

        setMensaje(
          `Cuenta de administrador creada. Código de empresa: ${data.codigo_admin}. Comparte este código con tus trabajadores.`,
        )
      } else {
        const payload = {
          nombre,
          correo,
          contrasena,
          codigo_admin: codigoAdmin.trim().toUpperCase(),
        }
        if (sucursalId) payload.sucursal_id = parseInt(sucursalId)
        await registrarUsuario(payload)

        setMensaje('Cuenta creada correctamente. Ya puedes iniciar sesión.')
      }

      setModo('login')
      setNombre('')
      setConfirmarContrasena('')
      setNombreEmpresa('')
      setCodigoAdmin('')
      setSucursalId('')
      setSucursales([])
      setCodigoVerificado(false)
      setEmpresaVerificada('')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="brand">
          <div className="brand-icon">
            <PackageCheck size={34} />
          </div>

          <div>
            <h1>InveSys</h1>
            <p>Sistema de gestión de inventario</p>
          </div>
        </div>

        <div className="login-info">
          <span>{esRegistro ? 'Registro de usuario' : 'Acceso administrativo'}</span>

          <h2>
            {esRegistro
              ? 'Crea tu cuenta para empezar a gestionar tu inventario.'
              : 'Gestiona productos, clientes e inventario desde una sola plataforma.'}
          </h2>

          <p>
            {esRegistro
              ? 'Regístrate como Administrador para gestionar tu empresa y crear sucursales, o como Usuario para trabajar en una sucursal existente.'
              : 'Inicia sesión con tus credenciales para acceder al sistema.'}
          </p>
        </div>

        <div className="login-benefits">
          <div className="benefit-card">
            <ShieldCheck size={24} />
            <div>
              <h3>{esAdminRegistro ? 'Registro de Administrador' : esUsuarioRegistro ? 'Registro de Usuario' : 'Acceso seguro'}</h3>
              <p>
                {esAdminRegistro
                  ? 'Crea tu empresa, genera un código único y gestiona múltiples sucursales.'
                  : esUsuarioRegistro
                    ? 'Ingresa el código de tu administrador para unirte a tu empresa y sucursal.'
                    : 'Protege tu información con acceso personalizado por rol y sucursal.'}
              </p>
            </div>
          </div>

          <div className="benefit-card">
            <PackageCheck size={24} />
            <div>
              <h3>{esRegistro ? 'Multi-sucursal' : 'Sesión preparada'}</h3>
              <p>
                {esRegistro
                  ? 'Los administradores ven toda la empresa; los usuarios solo su sucursal asignada.'
                  : 'Tu sesión se mantiene activa para que trabajes sin interrupciones.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        <form className="login-card" onSubmit={esRegistro ? manejarRegistro : manejarLogin}>
          <div className="auth-tabs" aria-label="Opciones de autenticación">
            <button
              type="button"
              className={!esRegistro ? 'auth-tab active' : 'auth-tab'}
              onClick={() => cambiarModo('login')}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              className={esRegistro ? 'auth-tab active' : 'auth-tab'}
              onClick={() => cambiarModo('registro')}
            >
              Crear cuenta
            </button>
          </div>

          <div className="login-header">
            <div className="login-icon">
              {esRegistro ? <UserPlus size={26} /> : <Lock size={26} />}
            </div>

            <h2>{esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
            <p>
              {esRegistro
                ? 'Selecciona tu rol y completa los datos.'
                : 'Ingresa tus datos para acceder al sistema.'}
            </p>
          </div>

          {error && (
            <div className="login-message login-message-error">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="login-message login-message-success">
              {mensaje}
            </div>
          )}

          {esRegistro && (
            <>
              <div className="role-selector" role="group" aria-label="Seleccionar rol">
                <button
                  type="button"
                  className={`role-option${rolRegistro === 'admin' ? ' active' : ''}`}
                  onClick={() => { setRolRegistro('admin'); limpiarMensajes(); setCodigoVerificado(false) }}
                >
                  <Building2 size={20} />
                  <span>Administrador</span>
                </button>

                <button
                  type="button"
                  className={`role-option${rolRegistro === 'usuario' ? ' active' : ''}`}
                  onClick={() => { setRolRegistro('usuario'); limpiarMensajes() }}
                >
                  <Users size={20} />
                  <span>Usuario</span>
                </button>
              </div>

              <label className="form-group">
                <span>Nombre completo</span>

                <div className="input-box">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Nombre del usuario"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    minLength="3"
                    required
                  />
                </div>
              </label>

              {esAdminRegistro && (
                <label className="form-group">
                  <span>Nombre de la empresa</span>

                  <div className="input-box">
                    <Store size={18} />
                    <input
                      type="text"
                      placeholder="Ej: Mi Empresa S.A.S."
                      value={nombreEmpresa}
                      onChange={(event) => setNombreEmpresa(event.target.value)}
                      minLength="2"
                      required
                    />
                  </div>
                </label>
              )}

              {esUsuarioRegistro && (
                <>
                  <label className="form-group">
                    <span>Código del administrador</span>

                    <div className="input-box" style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Ej: A1B2C3D4"
                        value={codigoAdmin}
                        onChange={(event) => {
                          setCodigoAdmin(event.target.value)
                          setCodigoVerificado(false)
                          setSucursales([])
                          setEmpresaVerificada('')
                        }}
                        style={{ flex: 1 }}
                        required
                      />

                      <button
                        type="button"
                        className="verify-btn"
                        onClick={manejarVerificarCodigo}
                        disabled={verificando || !codigoAdmin.trim()}
                      >
                        {verificando ? '...' : 'Verificar'}
                      </button>
                    </div>
                  </label>

                  {codigoVerificado && (
                    <div className="verified-badge">
                      <ShieldCheck size={16} />
                      <span>Empresa: {empresaVerificada}</span>
                    </div>
                  )}

                  {codigoVerificado && sucursales.length > 0 && (
                    <label className="form-group">
                      <span>Sucursal</span>

                      <div className="input-box">
                        <Store size={18} />
                        <select
                          value={sucursalId}
                          onChange={(event) => setSucursalId(event.target.value)}
                          required
                          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', color: 'inherit' }}
                        >
                          <option value="">Selecciona una sucursal</option>
                          {sucursales.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  )}

                  {codigoVerificado && sucursales.length === 0 && (
                    <p style={{ color: 'var(--muted)', fontSize: '.85rem', textAlign: 'center' }}>
                      La empresa aún no tiene sucursales. Puedes crear tu cuenta sin sucursal asignada.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          <label className="form-group">
            <span>Correo electrónico</span>

            <div className="input-box">
              <Mail size={18} />
              <input
                type="email"
                placeholder="usuario@correo.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="form-group">
            <span>Contraseña</span>

            <div className="input-box">
              <Lock size={18} />
              <input
                type={mostrarClave ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                minLength="6"
                required
              />

              <button
                type="button"
                className="eye-button"
                onClick={() => setMostrarClave(!mostrarClave)}
                aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {esRegistro && (
            <label className="form-group">
              <span>Confirmar contraseña</span>

              <div className="input-box">
                <Lock size={18} />
                <input
                  type={mostrarConfirmacion ? 'text' : 'password'}
                  placeholder="Confirma tu contraseña"
                  value={confirmarContrasena}
                  onChange={(event) => setConfirmarContrasena(event.target.value)}
                  minLength="6"
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
                  aria-label={mostrarConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                >
                  {mostrarConfirmacion ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}

          {!esRegistro && (
            <div className="login-options">
              <label>
                <input type="checkbox" />
                Recordarme
              </label>

              <a href="#">¿Olvidaste tu contraseña?</a>
            </div>
          )}

          <button className="login-button" type="submit" disabled={cargando}>
            {cargando
              ? esRegistro ? 'Creando cuenta...' : 'Validando...'
              : esRegistro ? 'Crear cuenta' : 'Ingresar'}
          </button>

          <p className="auth-switch">
            {esRegistro ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => cambiarModo(esRegistro ? 'login' : 'registro')}
            >
              {esRegistro ? 'Inicia sesión' : 'Crear cuenta nueva'}
            </button>
          </p>

          <p className="auth-switch" style={{ fontSize: '.75rem', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => navigate('/setup')}
              style={{ fontSize: '.75rem' }}
            >
              Cambiar servidor
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}
