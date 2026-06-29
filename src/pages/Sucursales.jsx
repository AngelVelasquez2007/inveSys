import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  DollarSign,
  Package,
  Plus,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { api, apiError } from '../services/api.js'
import { useToast } from '../App.jsx'

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

export default function Sucursales() {
  const toast = useToast()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [sucursales, setSucursales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [sucursalActiva, setSucursalActiva] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    cargarSucursales()
  }, [])

  async function cargarSucursales() {
    try {
      const { data } = await api.get('/sucursales')
      setSucursales(data)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setCargando(false)
    }
  }

  function abrirCrear() {
    setEditandoId(null)
    setNombre('')
    setMostrarModal(true)
  }

  function abrirEditar(s) {
    if (!esAdmin) return
    setEditandoId(s.id)
    setNombre(s.nombre)
    setMostrarModal(true)
  }

  async function guardar(event) {
    event.preventDefault()
    if (!nombre.trim()) return
    try {
      if (editandoId) {
        await api.put(`/sucursales/${editandoId}`, { nombre: nombre.trim() })
        toast('Sucursal actualizada')
      } else {
        await api.post('/sucursales', { nombre: nombre.trim() })
        toast('Sucursal creada')
      }
      setMostrarModal(false)
      cargarSucursales()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function eliminar(s) {
    if (!esAdmin) return
    if (!window.confirm(`¿Eliminar la sucursal "${s.nombre}"?`)) return
    try {
      await api.delete(`/sucursales/${s.id}`)
      toast('Sucursal eliminada')
      if (sucursalActiva?.id === s.id) setSucursalActiva(null)
      cargarSucursales()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function verDetalle(s) {
    setSucursalActiva(s)
    setCargandoDetalle(true)
    setDetalle(null)
    try {
      const { data } = await api.get(`/sucursales/${s.id}/detalle`)
      setDetalle(data)
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setCargandoDetalle(false)
    }
  }

  function volver() {
    setSucursalActiva(null)
    setDetalle(null)
  }

  if (cargando) return <div className="page-loading">Cargando sucursales…</div>

  // ─── Vista detalle ────────────────────────────
  if (sucursalActiva) {
    const r = detalle?.resumen || {}
    return (
      <>
        <header className="page-header">
          <div>
            <div className="flex flex-center gap-3">
              <button className="btn-icon" onClick={volver} title="Volver">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="page-title">{sucursalActiva.nombre}</h1>
                <p className="page-subtitle">
                  Creada el {new Date(sucursalActiva.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </header>

        {cargandoDetalle && <div className="page-loading">Cargando información…</div>}

        {detalle && (
          <>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <Boxes className="stat-icon" size={30} />
                <div className="stat-label">Productos</div>
                <div className="stat-value">{r.total_productos}</div>
              </article>
              <article className="stat-card">
                <Package className="stat-icon" size={30} />
                <div className="stat-label">Stock total</div>
                <div className="stat-value">{r.stock_total}</div>
              </article>
              <article className="stat-card">
                <Users className="stat-icon" size={30} />
                <div className="stat-label">Clientes</div>
                <div className="stat-value">{r.total_clientes}</div>
              </article>
              <article className="stat-card">
                <ShoppingCart className="stat-icon" size={30} />
                <div className="stat-label">Órdenes</div>
                <div className="stat-value">{r.total_ordenes}</div>
              </article>
              <article className="stat-card">
                <DollarSign className="stat-icon" size={30} />
                <div className="stat-label">Ingresos</div>
                <div className="stat-value" style={{ color: 'var(--primary)' }}>
                  {Number(r.ingresos).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                </div>
              </article>
            </div>

            {/* Productos */}
            <section className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <h2 className="page-title text-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} /> Productos ({detalle.productos.length})
                </h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Stock mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.productos.map(p => (
                        <tr key={p.id}>
                          <td><code>{p.sku}</code></td>
                          <td>{p.nombre}</td>
                          <td>{Number(p.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                          <td>
                            <span style={{
                              color: p.stock_actual <= p.stock_minimo ? 'var(--danger)' : undefined,
                              fontWeight: p.stock_actual <= p.stock_minimo ? 700 : undefined,
                            }}>
                              {p.stock_actual}
                            </span>
                            {p.stock_actual <= p.stock_minimo && (
                              <AlertTriangle size={14} style={{ marginLeft: 4, color: 'var(--warning)', verticalAlign: 'middle' }} />
                            )}
                          </td>
                          <td>{p.stock_minimo}</td>
                        </tr>
                      ))}
                      {detalle.productos.length === 0 && (
                        <tr><td colSpan="5" className="text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Sin productos en esta sucursal.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Clientes */}
            <section className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <h2 className="page-title text-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} /> Clientes ({detalle.clientes.length})
                </h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Documento</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Ciudad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.clientes.map(c => (
                        <tr key={c.id}>
                          <td>{c.documento}</td>
                          <td>{c.nombre}</td>
                          <td>{c.correo || '—'}</td>
                          <td>{c.telefono || '—'}</td>
                          <td>{c.ciudad || '—'}</td>
                        </tr>
                      ))}
                      {detalle.clientes.length === 0 && (
                        <tr><td colSpan="5" className="text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Sin clientes en esta sucursal.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Órdenes recientes */}
            <section className="card">
              <div className="card-body">
                <h2 className="page-title text-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} /> Órdenes recientes ({detalle.ordenes.length})
                </h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Usuario</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.ordenes.map(o => (
                        <tr key={o.id}>
                          <td>ORD-{String(o.id).padStart(4, '0')}</td>
                          <td>{o.cliente}</td>
                          <td>{Number(o.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                          <td>
                            <span className={`badge ${
                              o.estado === 'PAGADA' ? 'badge-green' :
                              o.estado === 'ANULADA' ? 'badge-gray' :
                              'badge-yellow'
                            }`}>{o.estado}</span>
                          </td>
                          <td>{o.usuario || 'N/A'}</td>
                          <td>{new Date(o.fecha).toLocaleString('es-CO')}</td>
                        </tr>
                      ))}
                      {detalle.ordenes.length === 0 && (
                        <tr><td colSpan="6" className="text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Sin órdenes en esta sucursal.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </>
    )
  }

  // ─── Vista lista ──────────────────────────────
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Sucursales</h1>
          <p className="page-subtitle">Selecciona una sucursal para ver su información detallada.</p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={abrirCrear}>
            <Plus size={18} />
            Nueva sucursal
          </button>
        )}
      </header>

      {sucursales.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
            <Store size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>Aún no hay sucursales. {esAdmin ? 'Crea la primera para comenzar.' : ''}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {sucursales.map(s => (
            <button
              key={s.id}
              type="button"
              className="card"
              onClick={() => verDetalle(s)}
              style={{
                cursor: 'pointer', textAlign: 'left', border: '1px solid var(--border)',
                transition: 'box-shadow .2s, transform .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--primary-lt)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Store size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{s.nombre}</h3>
                    <p className="text-sm text-muted" style={{ margin: 0 }}>
                      Creada el {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Solo admin puede crear/editar */}
      {esAdmin && mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editandoId ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
              <button type="button" className="btn-icon" onClick={() => setMostrarModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={guardar}>
              <div className="modal-body">
                <label className="form-group">
                  <span className="form-label">Nombre de la sucursal</span>
                  <div className="input-box">
                    <Store size={18} />
                    <input
                      type="text"
                      placeholder="Ej: Sucursal Norte"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      minLength="2"
                      required
                      autoFocus
                    />
                  </div>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editandoId ? 'Guardar cambios' : 'Crear sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
