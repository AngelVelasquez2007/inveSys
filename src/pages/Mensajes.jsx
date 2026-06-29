import { useEffect, useState } from 'react'
import { MessageCircle, Send, Store } from 'lucide-react'
import { api, apiError } from '../services/api.js'
import { useToast } from '../App.jsx'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

export default function Mensajes() {
  const toast = useToast()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [mensajes, setMensajes] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [contenido, setContenido] = useState('')
  const [sucursalesSel, setSucursalesSel] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [mostrandoForm, setMostrandoForm] = useState(false)

  useEffect(() => {
    api.get('/mensajes').then(r => setMensajes(r.data)).catch(() => {})
    if (esAdmin) {
      api.get('/sucursales').then(r => setSucursales(r.data)).catch(() => {})
    }
  }, [])

  function toggleSucursal(id) {
    setSucursalesSel(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  async function enviar(e) {
    e.preventDefault()
    if (!contenido.trim() || sucursalesSel.length === 0) return
    setEnviando(true)
    try {
      await api.post('/mensajes', { contenido: contenido.trim(), sucursal_ids: sucursalesSel })
      toast('Mensaje enviado')
      setContenido('')
      setSucursalesSel([])
      setMostrandoForm(false)
      const res = await api.get('/mensajes')
      setMensajes(res.data)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Mensajes</h1>
          <p className="page-subtitle">
            {esAdmin ? 'Envía mensajes a una o varias sucursales.' : 'Mensajes recibidos del administrador.'}
          </p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={() => setMostrandoForm(!mostrandoForm)}>
            <Send size={16} />
            Nuevo mensaje
          </button>
        )}
      </header>

      {esAdmin && mostrandoForm && (
        <section className="card" style={{ marginBottom: 20 }}>
          <form className="card-body" onSubmit={enviar}>
            <label className="form-group">
              <span className="form-label">Mensaje</span>
              <textarea
                className="form-control"
                rows={3}
                value={contenido}
                onChange={e => setContenido(e.target.value)}
                placeholder="Escribe tu mensaje…"
                minLength={1}
                maxLength={2000}
                required
              />
            </label>

            <div className="form-group">
              <span className="form-label">Enviar a sucursales</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sucursales.map(s => (
                  <label key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${sucursalesSel.includes(s.id) ? 'var(--primary)' : 'var(--border)'}`,
                    background: sucursalesSel.includes(s.id) ? 'var(--primary-lt)' : 'transparent',
                    cursor: 'pointer', fontSize: '.85rem',
                  }}>
                    <input
                      type="checkbox"
                      checked={sucursalesSel.includes(s.id)}
                      onChange={() => toggleSucursal(s.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <Store size={14} />
                    {s.nombre}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={enviando || !contenido.trim() || sucursalesSel.length === 0}>
              <Send size={16} />
              {enviando ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-body">
          {mensajes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
              <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No hay mensajes todavía.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mensajes.map(m => (
              <div key={m.id} style={{
                padding: 14, borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {m.remitente}
                  </span>
                  <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
                    {new Date(m.created_at).toLocaleString('es-CO')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{m.contenido}</p>
                {m.sucursales_ids && m.sucursales_ids.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.sucursales_ids.map(sid => (
                      <span key={sid} className="badge badge-gray" style={{ fontSize: '.65rem' }}>
                        <Store size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                        {sid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
