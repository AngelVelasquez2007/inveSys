import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, PackageCheck, ShieldCheck } from 'lucide-react'
import { loginUsuario } from '../services/authService.js'
import { apiError } from '../services/api.js'

export default function Login() {
  const [mostrarClave, setMostrarClave] = useState(false)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function manejarEnvio(event) {
    event.preventDefault()

    setError('')
    setMensaje('')
    setCargando(true)

    try {
      const respuesta = await loginUsuario({
        correo,
        contrasena,
      })

      setMensaje('Inicio de sesión correcto. Token recibido desde el API.')
      console.log('Respuesta del login:', respuesta)
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
          <span>Acceso administrativo</span>

          <h2>Gestiona productos, clientes e inventario desde una sola plataforma.</h2>

          <p>
            Esta pantalla ahora consume el API de login. El formulario envía el correo
            y la contraseña al backend para validar el acceso del usuario.
          </p>
        </div>

        <div className="login-benefits">
          <div className="benefit-card">
            <ShieldCheck size={24} />
            <div>
              <h3>Consumo de API</h3>
              <p>El formulario se conecta con el endpoint de autenticación.</p>
            </div>
          </div>

          <div className="benefit-card">
            <PackageCheck size={24} />
            <div>
              <h3>Sesión preparada</h3>
              <p>Si el backend responde con token, se guarda en localStorage.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        <form className="login-card" onSubmit={manejarEnvio}>
          <div className="login-header">
            <div className="login-icon">
              <Lock size={26} />
            </div>

            <h2>Iniciar sesión</h2>
            <p>Ingresa tus datos para acceder al sistema.</p>
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
              >
                {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Recordarme
            </label>

            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          <button className="login-button" type="submit" disabled={cargando}>
            {cargando ? 'Validando...' : 'Ingresar'}
          </button>

          <p className="login-note">
            SCRUM-15: Consumo del API de inicio de sesión.
          </p>
        </form>
      </section>
    </main>
  )
}