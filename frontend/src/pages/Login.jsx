import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, PackageCheck, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [mostrarClave, setMostrarClave] = useState(false)

  function manejarEnvio(event) {
    event.preventDefault()
    alert('Interfaz de inicio de sesión lista. La conexión con backend queda para una tarea posterior.')
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
            Esta pantalla permite el ingreso visual al sistema. Más adelante se conectará
            con el backend para validar usuarios, roles y permisos.
          </p>
        </div>

        <div className="login-benefits">
          <div className="benefit-card">
            <ShieldCheck size={24} />
            <div>
              <h3>Acceso seguro</h3>
              <p>Ingreso pensado para usuarios autorizados del sistema.</p>
            </div>
          </div>

          <div className="benefit-card">
            <PackageCheck size={24} />
            <div>
              <h3>Control de inventario</h3>
              <p>Consulta y administración de la información principal del negocio.</p>
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

          <label className="form-group">
            <span>Correo electrónico</span>

            <div className="input-box">
              <Mail size={18} />
              <input
                type="email"
                placeholder="usuario@correo.com"
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

          <button className="login-button" type="submit">
            Ingresar
          </button>

          <p className="login-note">
            SCRUM-14: Diseño de la interfaz de inicio de sesión.
          </p>
        </form>
      </section>
    </main>
  )
}