import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Archive, Server, Wifi, WifiOff, Check, Settings } from 'lucide-react'
import { setApiUrl } from '../services/api.js'

export default function Setup() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('https://')
  const [probando, setProbando] = useState(false)
  const [estado, setEstado] = useState(null)
  const [error, setError] = useState('')

  async function probarConexion() {
    if (!url.trim() || !url.startsWith('http')) {
      setError('Ingresa una URL válida (ej: https://tuservidor.com)')
      return
    }

    setError('')
    setProbando(true)
    setEstado(null)

    try {
      const testUrl = url.replace(/\/+$/, '')
      const { data } = await axios.get(`${testUrl}/docs`, { timeout: 90000 })
      if (data) {
        setEstado('ok')
      }
    } catch (err) {
      try {
        const testUrl = url.replace(/\/+$/, '')
        await axios.get(`${testUrl}/auth/me`, { timeout: 90000 })
        setEstado('ok')
      } catch {
        setEstado('error')
        setError('No se pudo conectar. Verifica la URL e intenta de nuevo.')
      }
    } finally {
      setProbando(false)
    }
  }

  function guardarYContinuar() {
    if (estado !== 'ok') {
      probarConexion()
      return
    }
    setApiUrl(url.replace(/\/+$/, ''))
    navigate('/login', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="brand">
          <div className="brand-icon">
            <Archive size={34} />
          </div>
          <div>
            <h1>InveSys</h1>
            <p>Sistema de gestión de inventario</p>
          </div>
        </div>

        <div className="login-info">
          <span>Configuración inicial</span>
          <h2>Conecta tu aplicación al servidor</h2>
          <p>
            Ingresa la dirección del servidor que te proporcionó tu administrador
            o proveedor del servicio.
          </p>
        </div>

        <div className="login-benefits">
          <div className="benefit-card">
            <Server size={24} />
            <div>
              <h3>Conexión segura</h3>
              <p>Tus datos viajan encriptados entre la app y el servidor.</p>
            </div>
          </div>
          <div className="benefit-card">
            <Settings size={24} />
            <div>
              <h3>Solo una vez</h3>
              <p>Esta configuración se realiza únicamente al iniciar la aplicación por primera vez.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        <form className="login-card" onSubmit={(e) => { e.preventDefault(); guardarYContinuar() }}>
          <div className="login-header">
            <div className="login-icon">
              <Server size={26} />
            </div>
            <h2>Configurar servidor</h2>
            <p>Ingresa la URL del servidor de InveSys.</p>
          </div>

          {error && (
            <div className="login-message login-message-error">{error}</div>
          )}

          {probando && (
            <div className="login-message" style={{ background: '#fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 14, lineHeight: 1.5 }}>
              El servidor puede tardar hasta 1 minuto en responder si estaba inactivo. Esperando...
            </div>
          )}

          {estado === 'ok' && (
            <div className="login-message login-message-success">
              <Check size={16} style={{ marginRight: 6 }} />
              Conexión exitosa
            </div>
          )}

          <label className="form-group">
            <span>URL del servidor</span>
            <div className="input-box">
              <Server size={18} />
              <input
                type="url"
                placeholder="https://tuservidor.onrender.com"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setEstado(null); setError('') }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', color: 'inherit' }}
                required
              />
              {estado === 'ok' ? (
                <Wifi size={18} color="#16a34a" />
              ) : estado === 'error' ? (
                <WifiOff size={18} color="#dc2626" />
              ) : null}
            </div>
          </label>

          <button
            type="button"
            className="login-button"
            onClick={probarConexion}
            disabled={probando || !url.startsWith('http')}
            style={{ marginBottom: 10 }}
          >
            {probando ? 'Conectando... (hasta 1 min)' : 'Probar conexión'}
          </button>

          <button
            type="submit"
            className="login-button"
            disabled={estado !== 'ok'}
            style={{
              opacity: estado === 'ok' ? 1 : 0.5,
              background: estado === 'ok' ? 'var(--primary)' : undefined,
            }}
          >
            {estado === 'ok' ? 'Guardar y continuar' : 'Primero prueba la conexión'}
          </button>
        </form>
      </section>
    </main>
  )
}
