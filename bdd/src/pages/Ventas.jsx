import { CheckCircle, ChevronDown, ChevronUp, Plus, Search, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'

function today() { return new Date().toISOString().split('T')[0] }

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

export default function Ventas() {
  const toast = useToast()
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [items, setItems] = useState([{ producto_id: '', cantidad: 1 }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState({})
  const [detalleId, setDetalleId] = useState(null)
  const [detalles, setDetalles] = useState({})

  function load() {
    Promise.all([api.get('/ordenes'), api.get('/clientes'), api.get('/productos')])
      .then(([ordenesRes, clientesRes, productosRes]) => {
        setOrdenes(ordenesRes.data)
        setClientes(clientesRes.data.filter(c => c.activo))
        setProductos(productosRes.data.filter(p => p.activo))
        setError('')
      })
      .catch(err => setError(apiError(err)))
  }

  useEffect(load, [])

  const filtrados = ordenes.filter(o =>
    [o.cliente, o.estado, o.usuario].some(v => String(v).toLowerCase().includes(query.toLowerCase())),
  )

  const resumen = {
    hoy: ordenes.filter(o => o.fecha?.startsWith(today())).length,
    mes: ordenes.filter(o => o.fecha?.startsWith(today().slice(0, 7))).length,
    pendientes: ordenes.filter(o => o.estado === 'PENDIENTE').length,
  }

  function openCreate() {
    setClienteId('')
    setItems([{ producto_id: '', cantidad: 1 }])
    setModalOpen(true)
  }

  function addItem() {
    setItems(current => [...current, { producto_id: '', cantidad: 1 }])
  }

  function removeItem(idx) {
    setItems(current => current.filter((_, i) => i !== idx))
  }

  function updateItem(idx, field, value) {
    setItems(current => current.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function getProducto(id) {
    return productos.find(p => p.id === Number(id))
  }

  const total = items.reduce((sum, item) => {
    const p = getProducto(item.producto_id)
    return sum + (p ? Number(p.precio) * Number(item.cantidad) : 0)
  }, 0)

  async function toggleDetalle(ordenId) {
    if (detalleId === ordenId) {
      setDetalleId(null)
      return
    }
    if (!detalles[ordenId]) {
      try {
        const res = await api.get(`/ordenes/${ordenId}`)
        setDetalles(current => ({ ...current, [ordenId]: res.data.items || [] }))
      } catch { toast('Error al cargar detalle', 'error') }
    }
    setDetalleId(ordenId)
  }

  async function cambiarEstado(ordenId, nuevoEstado) {
    if (nuevoEstado === 'ANULADA' && !confirm('¿Estás seguro de anular esta orden?')) return

    setProcessing(current => ({ ...current, [`${ordenId}-${nuevoEstado}`]: true }))
    try {
      await api.put(`/ordenes/${ordenId}/estado`, { estado: nuevoEstado })
      toast(`Orden ${nuevoEstado}`)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setProcessing(current => ({ ...current, [`${ordenId}-${nuevoEstado}`]: false }))
    }
  }

  async function save(event) {
    event.preventDefault()
    if (items.some(i => !i.producto_id)) { toast('Completa todos los productos', 'error'); return }

    setLoading(true)
    try {
      await api.post('/ordenes', {
        cliente_id: clienteId ? Number(clienteId) : null,
        items: items.map(i => ({ producto_id: Number(i.producto_id), cantidad: Number(i.cantidad) })),
      })
      toast('Venta registrada')
      setModalOpen(false)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const btnEstilo = { padding: '3px 8px', fontSize: '.7rem', borderRadius: 6 }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro de órdenes de venta con descuento de stock.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Nueva venta
        </button>
      </header>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <article className="stat-card">
          <div className="stat-label">Ventas hoy</div>
          <div className="stat-value">{resumen.hoy}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Ventas del mes</div>
          <div className="stat-value">{resumen.mes}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value" style={{ color: resumen.pendientes > 0 ? 'var(--warning)' : undefined }}>{resumen.pendientes}</div>
        </article>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar por cliente, estado o usuario" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>#</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(o => (
                <tr key={o.id}>
                  <td>
                    <button className="btn-icon" onClick={() => toggleDetalle(o.id)} title="Ver detalle" style={{ border: 'none', padding: 2 }}>
                      {detalleId === o.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  <td>ORD-{String(o.id).padStart(4, '0')}</td>
                  <td>{o.cliente}</td>
                  <td>
                    <span className={`badge ${
                      o.estado === 'PAGADA' ? 'badge-green' :
                      o.estado === 'ANULADA' ? 'badge-gray' :
                      'badge-yellow'
                    }`}>{o.estado}</span>
                  </td>
                  <td>{Number(o.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                  <td>{o.usuario || 'N/A'}</td>
                  <td>{new Date(o.fecha).toLocaleString('es-CO')}</td>
                  <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                    {o.estado === 'PENDIENTE' && (
                      <>
                        <button className="btn btn-success" style={btnEstilo} onClick={() => cambiarEstado(o.id, 'PAGADA')} disabled={processing[`${o.id}-PAGADA`]}>
                          <CheckCircle size={12} /> Pagar
                        </button>{' '}
                        <button className="btn btn-danger" style={btnEstilo} onClick={() => cambiarEstado(o.id, 'ANULADA')} disabled={processing[`${o.id}-ANULADA`]}>
                          <XCircle size={12} /> Anular
                        </button>
                      </>
                    )}
                    {o.estado !== 'PENDIENTE' && (
                      <span className="text-muted" style={{ fontSize: '.75rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan="8" className="text-muted">No hay ventas para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detalleId && detalles[detalleId] && (
        <section className="card" style={{ marginTop: -8 }}>
          <div className="card-body">
            <h3 className="page-title text-sm mb-4">Detalle ORD-{String(detalleId).padStart(4, '0')}</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles[detalleId].map(item => (
                    <tr key={item.id}>
                      <td>{item.sku}</td>
                      <td>{item.producto}</td>
                      <td>{item.cantidad}</td>
                      <td>{Number(item.precio_unitario).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                      <td>{Number(item.subtotal).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {modalOpen && (
        <div className="modal-overlay">
          <form className="modal modal-lg" onSubmit={save}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva venta</h2>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <label className="form-group">
                <span className="form-label">Cliente</span>
                <select className="form-control" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.documento}</option>)}
                </select>
              </label>

              <div className="form-group">
                <div className="flex flex-center gap-2 mb-4">
                  <span className="form-label" style={{ margin: 0 }}>Productos</span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                    <Plus size={14} /> Agregar producto
                  </button>
                </div>

                {items.map((item, idx) => {
                  const prod = getProducto(item.producto_id)
                  return (
                    <div className="form-row" key={idx} style={{ marginBottom: 8 }}>
                      <select
                        className="form-control"
                        required
                        value={item.producto_id}
                        onChange={e => updateItem(idx, 'producto_id', e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {productos.filter(p => !items.some((it, i) => i !== idx && it.producto_id === String(p.id))).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.nombre} (stock: {p.stock_actual}) — {Number(p.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-control"
                        type="number"
                        min="1"
                        max={prod?.stock_actual || 99999}
                        required
                        value={item.cantidad}
                        onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                        style={{ maxWidth: 100 }}
                      />
                      {items.length > 1 && (
                        <button type="button" className="btn-icon danger" onClick={() => removeItem(idx)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="text-right" style={{ fontSize: '1.1rem', fontWeight: 700, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                Total: {total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Registrar venta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
