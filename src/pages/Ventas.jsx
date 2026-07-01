import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  Undo2,
  X,
  XCircle,
} from 'lucide-react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner.js'
import { imprimirRecibo } from '../utils/recibo.js'

function today() { return new Date().toISOString().split('T')[0] }

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

export default function Ventas() {
  const toast = useToast()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'

  return esAdmin ? <AdminVentas toast={toast} usuario={usuario} /> : <OperadorPos toast={toast} usuario={usuario} />
}

/* ─────────────── OPERADOR — POS ─────────────── */

function OperadorPos({ toast, usuario }) {
  const searchRef = useRef(null)
  const [ordenes, setOrdenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [descuentos, setDescuentos] = useState([])
  const [query, setQuery] = useState('')
  const [cartItems, setCartItems] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [dineroRecibido, setDineroRecibido] = useState('')
  const [cargandoVenta, setCargandoVenta] = useState(false)
  const [mostrandoPos, setMostrandoPos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState({})
  const [detalleId, setDetalleId] = useState(null)
  const [detalles, setDetalles] = useState({})
  const [descuentoId, setDescuentoId] = useState(null)
  const [devolviendo, setDevolviendo] = useState(null) // { id, segundos }

  function load() {
    Promise.all([
      api.get('/ordenes').catch(() => ({ data: [] })),
      api.get('/clientes').catch(() => ({ data: [] })),
      api.get('/productos').catch(() => ({ data: [] })),
      api.get('/descuentos/activos').catch(() => ({ data: [] })),
    ])
      .then(([ordenesRes, clientesRes, productosRes, descRes]) => {
        setOrdenes(ordenesRes.data)
        setClientes(clientesRes.data.filter(c => c.activo))
        setProductos(productosRes.data.filter(p => p.activo))
        setDescuentos(descRes.data || [])
        setError('')
      })
      .catch(err => setError(apiError(err)))
  }

  // Timer para deshacer devolución (10s)
  useEffect(() => {
    if (!devolviendo) return
    if (devolviendo.segundos <= 0) { setDevolviendo(null); return }
    const t = setTimeout(() => {
      setDevolviendo(prev => prev ? { ...prev, segundos: prev.segundos - 1 } : null)
    }, 1000)
    return () => clearTimeout(t)
  }, [devolviendo])

  useEffect(load, [])

  const filtrados = ordenes.filter(o =>
    [o.cliente, o.estado, o.usuario].some(v => String(v).toLowerCase().includes(query.toLowerCase())),
  )

  const resumen = {
    hoy: ordenes.filter(o => o.fecha?.startsWith(today())).length,
    mes: ordenes.filter(o => o.fecha?.startsWith(today().slice(0, 7))).length,
    pendientes: ordenes.filter(o => o.estado === 'PENDIENTE').length,
  }

  // ─── POS logic ───────────────────────────────

  function buscarEnCarrito(codigo) {
    const term = codigo.toLowerCase().trim()
    const encontrado = productos.find(p =>
      p.sku.toLowerCase() === term ||
      p.codigo_barras?.toLowerCase() === term,
    )
    if (encontrado) {
      agregarAlCarrito(encontrado)
    } else {
      toast('Producto no encontrado', 'error')
    }
  }

  useBarcodeScanner({ onScan: buscarEnCarrito, enabled: mostrandoPos })

  const productosBusqueda = useMemo(() => {
    const term = busqueda.toLowerCase().trim()
    if (!term) return []
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)),
    ).slice(0, 8)
  }, [busqueda, productos])

  function agregarAlCarrito(producto) {
    setCartItems(current => {
      const existente = current.find(i => i.producto_id === producto.id)
      if (existente) {
        return current.map(i =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i,
        )
      }
      return [...current, {
        producto_id: producto.id,
        sku: producto.sku,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        cantidad: 1,
        stock: producto.stock_actual,
      }]
    })
    setBusqueda('')
    searchRef.current?.focus()
  }

  function cambiarCantidad(productoId, nuevaCantidad) {
    if (nuevaCantidad < 1) return
    const prod = productos.find(p => p.id === productoId)
    if (nuevaCantidad > prod?.stock_actual) {
      toast(`Stock máximo: ${prod.stock_actual}`, 'error')
      return
    }
    setCartItems(current =>
      current.map(i =>
        i.producto_id === productoId ? { ...i, cantidad: nuevaCantidad } : i,
      ),
    )
  }

  function quitarDelCarrito(productoId) {
    setCartItems(current => current.filter(i => i.producto_id !== productoId))
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const descuentoCalc = (() => {
    if (!descuentoId) return 0
    const d = descuentos.find(x => x.id === descuentoId)
    if (!d) return 0
    return d.tipo === 'PORCENTAJE' ? subtotal * (Number(d.valor) / 100) : Number(d.valor)
  })()
  const total = Math.max(0, subtotal - descuentoCalc)
  const cambio = dineroRecibido ? Number(dineroRecibido) - total : 0
  const suficiente = dineroRecibido && Number(dineroRecibido) >= total

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && productosBusqueda.length > 0) {
      e.nativeEvent.stopImmediatePropagation()
      agregarAlCarrito(productosBusqueda[0])
    }
  }

  function abrirPos() {
    setMostrandoPos(true)
    setCartItems([])
    setClienteId('')
    setDineroRecibido('')
    setDescuentoId(null)
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  async function registrarVenta() {
    if (cartItems.length === 0) { toast('Agrega al menos un producto', 'error'); return }
    if (!suficiente) { toast('El dinero recibido debe cubrir el total', 'error'); return }
    if (cambio < 0) { toast('El dinero recibido es insuficiente', 'error'); return }

    setCargandoVenta(true)
    try {
      const { data } = await api.post('/ordenes', {
        cliente_id: clienteId ? Number(clienteId) : null,
        dinero_recibido: Number(dineroRecibido),
        items: cartItems.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        descuento_id: descuentoId,
        descuento_aplicado: descuentoCalc > 0 ? descuentoCalc : null,
      })
      toast(`Venta registrada — Cambio: ${Number(data.cambio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`)
      const clienteNombre = clienteId ? (clientes.find(c => c.id === Number(clienteId))?.nombre || 'Mostrador') : 'Mostrador'
      imprimirRecibo({
        empresa: usuario?.empresa_nombre || 'InveSys',
        ordenId: data.id,
        fecha: data.fecha || new Date().toISOString(),
        cajero: usuario?.nombre || 'N/A',
        cliente: clienteNombre,
        items: cartItems,
        subtotal,
        descuento: descuentoCalc,
        total,
        efectivo: Number(dineroRecibido),
        cambio: Number(data.cambio) || 0,
      })
      setMostrandoPos(false)
      setCartItems([])
      setDineroRecibido('')
      setDescuentoId(null)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setCargandoVenta(false)
    }
  }

  // ─── Order list logic ────────────────────────

  async function toggleDetalle(ordenId) {
    if (detalleId === ordenId) { setDetalleId(null); return }
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

  async function devolver(ordenId) {
    if (!confirm('¿Devolver esta orden? Los productos volverán al inventario.')) return
    setProcessing(current => ({ ...current, [`${ordenId}-DEVOLVER`]: true }))
    try {
      await api.post(`/ordenes/${ordenId}/devolver`)
      toast('Devolución realizada')
      setDevolviendo({ id: ordenId, segundos: 10 })
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setProcessing(current => ({ ...current, [`${ordenId}-DEVOLVER`]: false }))
    }
  }

  async function reimprimir(ordenId) {
    try {
      const res = await api.get(`/ordenes/${ordenId}`)
      const o = res.data
      const items = (o.items || []).map(i => ({
        cantidad: i.cantidad,
        nombre: i.producto,
        precio: Number(i.precio_unitario),
        subtotal: Number(i.cantidad) * Number(i.precio_unitario),
      }))
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
      const descuento = Number(o.descuento_aplicado || 0)
      const total = Number(o.total || 0)
      const efectivo = Number(o.dinero_recibido || 0)
      const cambio = Number(o.cambio || 0)
      imprimirRecibo({
        empresa: usuario?.empresa_nombre || 'InveSys',
        ordenId: o.id,
        fecha: o.fecha,
        cajero: o.usuario || 'N/A',
        cliente: o.cliente || 'Mostrador',
        items,
        subtotal,
        descuento,
        total,
        efectivo,
        cambio,
      })
    } catch {
      toast('Error al cargar datos del recibo', 'error')
    }
  }

  async function cancelarDevolucion(ordenId) {
    try {
      await api.post(`/ordenes/${ordenId}/cancelar-devolucion`)
      toast('Devolución cancelada')
      setDevolviendo(null)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  const btnEstilo = { padding: '3px 8px', fontSize: '.7rem', borderRadius: 6 }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Punto de venta — registra cobros con cálculo automático de cambio.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirPos}>
          <ShoppingCart size={16} />
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

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ─── POS Panel ─────────────────────────────── */}
      {mostrandoPos && (
        <section className="card" style={{ marginBottom: 20, animation: 'fadeInUp .3s ease' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <label className="search-box" style={{ flex: 1, maxWidth: 'none' }}>
                    <Search size={16} />
                    <input
                      ref={searchRef}
                      placeholder="Buscar por SKU o nombre… (el código de barras se lee automáticamente)"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </label>

                  <select
                    className="form-control"
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="">Cliente mostrador</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>

                  <button className="btn-icon" onClick={() => setMostrandoPos(false)} title="Cerrar">
                    <X size={18} />
                  </button>
                </div>

                {busqueda && productosBusqueda.length > 0 && (
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 10,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    {productosBusqueda.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => agregarAlCarrito(p)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '8px 14px',
                          border: 'none', borderBottom: '1px solid var(--border)',
                          background: 'transparent', cursor: 'pointer',
                          color: 'var(--text)', fontSize: '.875rem',
                          textAlign: 'left', transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <code style={{ fontSize: '.75rem', color: 'var(--muted)', minWidth: 70 }}>{p.sku}</code>
                        <span style={{ flex: 1 }}>{p.nombre}</span>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {Number(p.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                        </span>
                        <span className="badge badge-gray" style={{ fontSize: '.65rem' }}>Stock: {p.stock_actual}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th style={{ width: 130 }}>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map(item => (
                        <tr key={item.producto_id}>
                          <td><code style={{ fontSize: '.75rem' }}>{item.sku}</code></td>
                          <td>{item.nombre}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                className="btn-icon"
                                style={{ padding: 2, width: 24, height: 24 }}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.stock}
                                value={item.cantidad}
                                onChange={e => cambiarCantidad(item.producto_id, Number(e.target.value))}
                                style={{
                                  width: 50, textAlign: 'center',
                                  border: '1px solid var(--border)', borderRadius: 4,
                                  padding: '2px 4px', fontSize: '.85rem',
                                  background: 'transparent', color: 'var(--text)',
                                }}
                              />
                              <button
                                className="btn-icon"
                                style={{ padding: 2, width: 24, height: 24 }}
                                onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td>{item.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                          <td style={{ fontWeight: 600 }}>{(item.precio * item.cantidad).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                          <td>
                            <button className="btn-icon danger" style={{ padding: 2, width: 24, height: 24 }} onClick={() => quitarDelCarrito(item.producto_id)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {cartItems.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                            Busca productos arriba para agregarlos al carrito.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{
                width: 280, minWidth: 280,
                background: 'var(--bg)',
                borderRadius: 12, padding: 20,
                border: '1px solid var(--border)',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div className="stat-label" style={{ marginBottom: 4 }}>Total</div>
                  {descuentoCalc > 0 && (
                    <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--muted)', textDecoration: 'line-through', marginBottom: 2 }}>
                      {subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                    </div>
                  )}
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
                    {total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                  </div>
                  {descuentoCalc > 0 && (
                    <div style={{ fontSize: '.75rem', color: 'var(--success)', marginTop: 2 }}>
                      -{descuentoCalc.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                    </div>
                  )}
                </div>

                {descuentos.length > 0 && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <span className="form-label">Descuento</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        type="button"
                        className={`btn ${!descuentoId ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '.75rem', padding: '4px 10px', justifyContent: 'center' }}
                        onClick={() => setDescuentoId(null)}
                      >
                        Sin descuento
                      </button>
                      {descuentos.map(d => {
                        const activo = descuentoId === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            className={`btn ${activo ? 'btn-success' : 'btn-secondary'}`}
                            style={{ fontSize: '.75rem', padding: '4px 10px', justifyContent: 'center' }}
                            onClick={() => setDescuentoId(activo ? null : d.id)}
                          >
                            {d.titulo}
                            {' '}
                            <strong>({d.tipo === 'PORCENTAJE' ? `${d.valor}%` : Number(d.valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })})</strong>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <span className="form-label">
                    <DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Dinero recibido
                  </span>
                  <div className="input-box" style={{ minHeight: 44 }}>
                    <Coins size={16} />
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="$ 0"
                      value={dineroRecibido}
                      onChange={e => setDineroRecibido(e.target.value)}
                      style={{ fontSize: '1.1rem', fontWeight: 700 }}
                      autoFocus
                    />
                  </div>
                </div>

                {dineroRecibido && Number(dineroRecibido) > 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '12px 0',
                    marginBottom: 16,
                    borderRadius: 8,
                    background: cambio >= 0 ? 'var(--success-lt)' : 'var(--danger-lt)',
                    color: cambio >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    <div className="stat-label" style={{ color: 'inherit', opacity: .7 }}>Cambio</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>
                      {Math.abs(cambio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                      {cambio < 0 ? ' faltan' : ''}
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%', minHeight: 48, fontSize: '1rem', fontWeight: 800,
                    opacity: suficiente ? 1 : .5,
                  }}
                  onClick={registrarVenta}
                  disabled={cargandoVenta || !suficiente}
                >
                  {cargandoVenta ? 'Procesando…' : (
                    <><CheckCircle size={20} /> Cobrar</>
                  )}
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => { setMostrandoPos(false); setCartItems([]) }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Orders list ────────────────────────────── */}
      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar por cliente, estado o usuario" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

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
                <th>Recibido</th>
                <th>Cambio</th>
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
                      o.estado === 'DEVUELTA' ? 'badge-orange' :
                      'badge-yellow'
                    }`}>{o.estado}</span>
                  </td>
                  <td>{Number(o.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                  <td>{o.dinero_recibido ? Number(o.dinero_recibido).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '—'}</td>
                  <td style={{ color: Number(o.cambio) > 0 ? 'var(--success)' : undefined }}>
                    {o.cambio ? Number(o.cambio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '—'}
                  </td>
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
                    {o.estado === 'PAGADA' && (
                      <>
                        <button className="btn btn-warning" style={btnEstilo} onClick={() => devolver(o.id)} disabled={processing[`${o.id}-DEVOLVER`]}>
                          <RotateCcw size={12} /> Devolver
                        </button>{' '}
                        <button className="btn btn-secondary" style={btnEstilo} onClick={() => reimprimir(o.id)}>
                          <Printer size={12} /> Recibo
                        </button>
                      </>
                    )}
                    {o.estado === 'DEVUELTA' && (
                      <span className="badge badge-orange">DEVUELTA</span>
                    )}
                    {!['PENDIENTE', 'PAGADA', 'DEVUELTA'].includes(o.estado) && (
                      <span className="text-muted" style={{ fontSize: '.75rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan="10" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay ventas registradas. Presiona "Nueva venta" para comenzar.</td></tr>
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

      {devolviendo && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#ea580c', color: '#fff', padding: '12px 20px',
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.25)',
          fontSize: '.9rem', fontWeight: 500,
        }}>
          <RotateCcw size={18} />
          <span>Devolución ORD-{String(devolviendo.id).padStart(4, '0')} — Deshacer en {devolviendo.segundos}s</span>
          <button
            className="btn"
            style={{ background: '#fff', color: '#ea580c', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => cancelarDevolucion(devolviendo.id)}
          >
            <Undo2 size={14} style={{ marginRight: 4 }} />
            Deshacer
          </button>
        </div>
      )}
    </>
  )
}

/* ─────────────── ADMIN — Reporte ────────────── */

function AdminVentas({ toast, usuario }) {
  const [ordenes, setOrdenes] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [detalleId, setDetalleId] = useState(null)
  const [detalles, setDetalles] = useState({})

  function load() {
    api.get('/ordenes')
      .then(res => { setOrdenes(res.data); setError('') })
      .catch(err => setError(apiError(err)))
  }

  useEffect(load, [])

  const filtrados = ordenes.filter(o =>
    [o.cliente, o.estado, o.usuario, o.sucursal].some(v => String(v).toLowerCase().includes(query.toLowerCase())),
  )

  const resumen = {
    hoy: ordenes.filter(o => o.fecha?.startsWith(today())).length,
    mes: ordenes.filter(o => o.fecha?.startsWith(today().slice(0, 7))).length,
    totales: ordenes.reduce((s, o) => s + Number(o.total || 0), 0),
    totalesMes: ordenes.filter(o => o.fecha?.startsWith(today().slice(0, 7))).reduce((s, o) => s + Number(o.total || 0), 0),
  }

  async function reimprimir(ordenId) {
    try {
      const res = await api.get(`/ordenes/${ordenId}`)
      const o = res.data
      const items = (o.items || []).map(i => ({
        cantidad: i.cantidad,
        nombre: i.producto,
        precio: Number(i.precio_unitario),
        subtotal: Number(i.cantidad) * Number(i.precio_unitario),
      }))
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
      const descuento = Number(o.descuento_aplicado || 0)
      const total = Number(o.total || 0)
      const efectivo = Number(o.dinero_recibido || 0)
      const cambio = Number(o.cambio || 0)
      imprimirRecibo({
        empresa: usuario?.empresa_nombre || 'InveSys',
        ordenId: o.id,
        fecha: o.fecha,
        cajero: o.usuario || 'N/A',
        cliente: o.cliente || 'Mostrador',
        items,
        subtotal,
        descuento,
        total,
        efectivo,
        cambio,
      })
    } catch {
      toast('Error al cargar datos del recibo', 'error')
    }
  }

  const btnEstilo = { padding: '3px 8px', fontSize: '.7rem', borderRadius: 6 }

  async function toggleDetalle(ordenId) {
    if (detalleId === ordenId) { setDetalleId(null); return }
    if (!detalles[ordenId]) {
      try {
        const res = await api.get(`/ordenes/${ordenId}`)
        setDetalles(current => ({ ...current, [ordenId]: res.data.items || [] }))
      } catch { toast('Error al cargar detalle', 'error') }
    }
    setDetalleId(ordenId)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Historial de ventas de todas las sucursales.</p>
        </div>
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
          <div className="stat-label">Ingresos del mes</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {resumen.totalesMes.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Ingresos totales</div>
          <div className="stat-value">
            {resumen.totales.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
          </div>
        </article>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar por cliente, estado, usuario o sucursal" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>#</th>
                <th>Cliente</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Recibido</th>
                <th>Cambio</th>
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
                  <td><span className="badge badge-gray" style={{ fontSize: '.7rem' }}>{o.sucursal || '—'}</span></td>
                  <td>
                    <span className={`badge ${
                      o.estado === 'PAGADA' ? 'badge-green' :
                      o.estado === 'ANULADA' ? 'badge-gray' :
                      o.estado === 'DEVUELTA' ? 'badge-orange' :
                      'badge-yellow'
                    }`}>{o.estado}</span>
                  </td>
                  <td>{Number(o.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                  <td>{o.dinero_recibido ? Number(o.dinero_recibido).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '—'}</td>
                  <td style={{ color: Number(o.cambio) > 0 ? 'var(--success)' : undefined }}>
                    {o.cambio ? Number(o.cambio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '—'}
                  </td>
                  <td>{o.usuario || 'N/A'}</td>
                  <td>{new Date(o.fecha).toLocaleString('es-CO')}</td>
                  <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                    {o.estado === 'PAGADA' && (
                      <button className="btn btn-secondary" style={btnEstilo} onClick={() => reimprimir(o.id)}>
                        <Printer size={12} /> Recibo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan="11" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay ventas registradas.</td></tr>
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
    </>
  )
}
