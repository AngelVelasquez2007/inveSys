import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  PackageCheck,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react'
import { loginUsuario, registrarUsuario } from '../services/authService.js'
import { apiError } from '../services/api.js'

export default function Login() {
  const navigate = useNavigate()
  const [modo, setModo] = useState('login')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const esRegistro = modo === 'registro'

  function limpiarMensajes() {
    setError('')
    setMensaje('')
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    limpiarMensajes()
    setMostrarClave(false)
    setMostrarConfirmacion(false)
  }

  async function manejarLogin(event) {
    event.preventDefault()

    limpiarMensajes()
    setCargando(true)

    try {
      const respuesta = await loginUsuario({
        correo,
        contrasena,
      })

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setError(apiError(error))
    } finally {
      setCargando(false)
    }
  }

  async function manejarRegistro(event) {
    event.preventDefault()

    limpiarMensajes()

    if (contrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)

    try {
      await registrarUsuario({ nombre, correo, contrasena })

      setMensaje('Cuenta creada correctamente. Ya puedes iniciar sesión.')
      setModo('login')
      setNombre('')
      setConfirmarContrasena('')
    } catch (error) {
      setError(apiError(error))
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
              ? 'Crea tu cuenta para empezar a gestionar la información del sistema.'
              : 'Gestiona productos, clientes e inventario desde una sola plataforma.'}
          </h2>

          <p>
            {esRegistro
              ? 'Crea una cuenta con nombre, correo y contraseña para acceder al sistema.'
              : 'Esta pantalla consume el API de login. El formulario envía el correo y la contraseña al backend para validar el acceso del usuario.'}
          </p>
        </div>

        <div className="login-benefits">
          <div className="benefit-card">
            <ShieldCheck size={24} />
            <div>
              <h3>{esRegistro ? 'Registro preparado' : 'Consumo de API'}</h3>
              <p>
                {esRegistro
                  ? 'El formulario queda listo para conectarse al servicio de creación de usuarios.'
                  : 'El formulario se conecta con el endpoint de autenticación.'}
              </p>
            </div>
          </div>

          <div className="benefit-card">
            <PackageCheck size={24} />
            <div>
              <h3>{esRegistro ? 'Misma estructura' : 'Sesión preparada'}</h3>
              <p>
                {esRegistro
                  ? 'Se crea un usuario OPERADOR con contraseña hasheada via bcrypt.'
                  : 'Si el backend responde con token, se guarda en localStorage.'}
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
                ? 'Registra tus datos para crear un nuevo usuario.'
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

          <p className="login-note">
            {esRegistro
              ? 'El endpoint de registro está implementado en el backend con FastAPI.'
              : 'SCRUM-15: Consumo del API de inicio de sesión.'}
          </p>
        </form>
      </section>
    </main>
  )
}