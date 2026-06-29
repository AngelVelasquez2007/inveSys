import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Hash,
  MessageCircle,
  Send,
  Store,
  X,
} from 'lucide-react'
import { api, apiError } from '../services/api.js'
import { useToast } from '../App.jsx'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

export default function ChatBubble() {
  const toast = useToast()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [contenido, setContenido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [noLeidos, setNoLeidos] = useState(0)
  const [chatActivo, setChatActivo] = useState('general')
  const msgEndRef = useRef(null)
  const inputRef = useRef(null)

  // ─── Cargar datos ────────────────────────────

  function cargarTodo() {
    api.get('/mensajes').then(r => { setMensajes(r.data); setNoLeidos(0) }).catch(() => {})
    if (esAdmin) {
      api.get('/sucursales').then(r => setSucursales(r.data)).catch(() => {})
    }
  }

  useEffect(() => {
    if (abierto) {
      cargarTodo()
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [abierto])

  // Poll de no leídos
  useEffect(() => {
    const id = setInterval(() => {
      if (!abierto) {
        api.get('/mensajes').then(r => {
          if (r.data.length > mensajes.length) {
            setNoLeidos(r.data.length - mensajes.length)
            setMensajes(r.data)
          }
        }).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(id)
  }, [abierto, mensajes.length])

  useEffect(() => { cargarTodo() }, [])

  // ─── Construir chats ─────────────────────────

  const chats = useMemo(() => {
    const todasIds = new Set(sucursales.map(s => s.id))
    const map = {}
    map['general'] = { id: 'general', nombre: 'General', icon: Hash, mensajes: [] }

    for (const s of sucursales) {
      map[`suc-${s.id}`] = { id: `suc-${s.id}`, nombre: s.nombre, icon: Store, mensajes: [] }
    }

    for (const m of mensajes) {
      const mids = m.sucursales_ids || []
      const esATodas = mids.length > 0 && mids.every(id => todasIds.has(id)) && mids.length === todasIds.size

      if (esATodas) {
        // Aparece en General y en cada sucursal
        map['general']?.mensajes.push(m)
        for (const sid of mids) {
          map[`suc-${sid}`]?.mensajes.push(m)
        }
      } else if (mids.length === 0) {
        map['general']?.mensajes.push(m)
      } else {
        for (const sid of mids) {
          map[`suc-${sid}`]?.mensajes.push(m)
        }
      }
    }

    return Object.values(map).filter(c => esAdmin || c.id === 'general' || c.id === `suc-${usuario?.sucursal_id}`)
  }, [mensajes, sucursales, esAdmin, usuario])

  const chat = chats.find(c => c.id === chatActivo) || chats[0]

  // ─── Acciones ────────────────────────────────

  async function enviar(e) {
    e.preventDefault()
    if (!contenido.trim()) return
    const ids = chatActivo === 'general' ? sucursales.map(s => s.id) : [Number(chatActivo.replace('suc-', ''))]
    setEnviando(true)
    try {
      await api.post('/mensajes', {
        contenido: contenido.trim(),
        sucursal_ids: ids,
      })
      toast('Aviso enviado')
      setContenido('')
      cargarTodo()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.mensajes])

  return (
    <>
      {/* Bubble button — toggle */}
      <button
        onClick={() => setAbierto(o => !o)}
        className="chat-bubble-btn"
        title={abierto ? 'Cerrar avisos' : 'Abrir avisos'}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,.25)',
          zIndex: 1000,
          transition: 'transform .2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {abierto ? <X size={24} /> : <MessageCircle size={24} />}
        {!abierto && noLeidos > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--danger)', color: '#fff',
            fontSize: '.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {noLeidos > 9 ? '9+' : noLeidos}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24,
          width: 420, maxHeight: 'calc(100vh - 140px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeInUp .2s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>
              <MessageCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Avisos
            </span>
            <button className="btn-icon" onClick={() => setAbierto(false)}>
              <X size={16} />
            </button>
          </div>

          {/* Tabs de chats */}
          <div style={{
            display: 'flex', gap: 4, padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {chats.map(c => {
              const activo = chatActivo === c.id
              const Icon = c.icon
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChatActivo(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 8, fontSize: '.75rem',
                    fontWeight: activo ? 700 : 500,
                    border: `1px solid ${activo ? 'var(--primary)' : 'var(--border)'}`,
                    background: activo ? 'var(--primary-lt)' : 'transparent',
                    color: activo ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <Icon size={12} />
                  {c.nombre}
                  <span style={{
                    background: activo ? 'var(--primary)' : 'var(--muted)',
                    color: '#fff', borderRadius: 10,
                    padding: '0 6px', fontSize: '.6rem', fontWeight: 700,
                    lineHeight: '16px',
                  }}>
                    {c.mensajes.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
            minHeight: 200,
          }}>
            {(!chat || chat.mensajes.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', opacity: 0.5, fontSize: '.85rem' }}>
                No hay mensajes en este chat.
              </div>
            )}
            {chat?.mensajes.map(m => (
              <div key={m.id} style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: '.85rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '.75rem', color: 'var(--primary)' }}>
                    {m.remitente}
                  </span>
                  <span style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                    {new Date(m.created_at).toLocaleString('es-CO')}
                  </span>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.contenido}</p>
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* Compose — solo admin, envía al chat activo */}
          {esAdmin && (
            <form onSubmit={enviar} style={{
              borderTop: '1px solid var(--border)',
              padding: 12,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  Enviar a <strong>{chat?.nombre}</strong>:
                </span>
                <input
                  ref={inputRef}
                  className="form-control"
                  placeholder="Escribe un aviso…"
                  value={contenido}
                  onChange={e => setContenido(e.target.value)}
                  maxLength={2000}
                  style={{ fontSize: '.85rem', flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', borderRadius: 10 }}
                  disabled={enviando || !contenido.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
