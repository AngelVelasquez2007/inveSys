import { AlertTriangle, Boxes, Download, FileText, PackageCheck, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

function today() { return new Date().toISOString().split('T')[0] }
function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }
function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

export default function Dashboard() {
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [data, setData] = useState(null)
  const [reporte, setReporte] = useState(null)
  const [fechaInicio, setFechaInicio] = useState(firstOfMonth())
  const [fechaFin, setFechaFin] = useState(today())
  const [error, setError] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    api.get('/dashboard')
      .then(response => setData(response.data))
      .catch(() => setError('Backend no disponible. Inicia FastAPI en el puerto 8000.'))
  }, [])

  function loadReporte() {
    setReportLoading(true)
    api.get('/reportes/ventas', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } })
      .then(response => setReporte(response.data))
      .catch(() => {})
      .finally(() => setReportLoading(false))
  }

  function downloadPDF() {
    api.get('/reportes/ventas/pdf', {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      responseType: 'blob',
    }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte_invesys_${fechaInicio}_${fechaFin}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }).catch(() => {})
  }

  useEffect(() => { loadReporte() }, [])

  const resumen = data?.resumen || {}
  const stats = [
    { label: 'Productos', value: resumen.productos ?? '-', sub: 'Productos activos', icon: Boxes },
    { label: 'Stock total', value: resumen.stock_total ?? '-', sub: 'Unidades registradas', icon: PackageCheck },
    { label: 'Clientes', value: resumen.clientes ?? '-', sub: 'Clientes activos', icon: Users },
    { label: 'Alertas', value: resumen.alertas ?? '-', sub: 'Productos bajo minimo', icon: AlertTriangle },
  ]

  const resumenR = reporte?.resumen || {}

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Inicio
            {usuario && <span style={{ fontWeight: 400, fontSize: '.9rem', color: 'var(--muted)', marginLeft: 12 }}>— {usuario.nombre} ({usuario.rol})</span>}
          </h1>
          <p className="page-subtitle">Resumen del negocio, ventas recientes y reportes.</p>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <Icon className="stat-icon" size={34} />
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-sub">{sub}</div>
          </article>
        ))}
      </section>

      {error && <div className="alert alert-warning mb-4">{error}</div>}

      <section className="card" style={{ marginBottom: 28 }}>
        <div className="card-body">
          <div className="flex flex-center gap-3" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <FileText size={20} />
            <h2 className="page-title text-sm" style={{ margin: 0 }}>Reporte de inventario</h2>
            <div className="flex flex-center gap-2" style={{ marginLeft: 'auto' }}>
              <label className="flex flex-center gap-2" style={{ fontSize: '.8rem' }}>
                Desde:
                <input type="date" className="form-control" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: 150 }} />
              </label>
              <label className="flex flex-center gap-2" style={{ fontSize: '.8rem' }}>
                Hasta:
                <input type="date" className="form-control" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ width: 150 }} />
              </label>
              <button className="btn btn-primary btn-sm" onClick={loadReporte} disabled={reportLoading}>
                {reportLoading ? 'Cargando...' : 'Filtrar'}
              </button>
              <button className="btn btn-success btn-sm" onClick={downloadPDF}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Ventas realizadas</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{resumenR.total_ventas ?? '-'}</div>
            </div>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Ingresos totales</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>
                {resumenR.total_ingresos != null ? Number(resumenR.total_ingresos).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '-'}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Entradas (stock)</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{resumenR.total_entradas ?? '-'}</div>
            </div>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-label">Salidas (stock)</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{resumenR.total_salidas ?? '-'}</div>
            </div>
          </div>

          {reporte?.detalle && reporte.detalle.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Unid. vendidas</th>
                    <th>Veces vendido</th>
                    <th>Entradas</th>
                    <th>Salidas</th>
                    <th>Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.detalle.map(item => {
                    const bajo = Number(item.stock_actual) <= Number(item.stock_minimo)
                    return (
                      <tr key={item.id} style={bajo ? { background: '#fef2f2' } : undefined}>
                        <td>{item.sku}</td>
                        <td>{item.nombre}</td>
                        <td>{item.stock_actual}</td>
                        <td>{item.stock_minimo}</td>
                        <td>{item.unidades_vendidas}</td>
                        <td>{item.veces_vendido}</td>
                        <td>{item.entradas}</td>
                        <td>{item.salidas}</td>
                        <td>{bajo ? <span className="badge badge-yellow">Bajo stock</span> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No hay datos de productos en el período seleccionado.</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <div className="flex flex-center gap-2 mb-4">
            <ShoppingCart size={18} />
            <h2 className="page-title text-sm" style={{ margin: 0 }}>Últimas ventas</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  {esAdmin && <th>Sucursal</th>}
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimas_ventas || []).map(o => (
                  <tr key={o.id}>
                    <td>ORD-{String(o.id).padStart(4, '0')}</td>
                    <td>{o.cliente}</td>
                    {esAdmin && <td><span className="badge badge-gray" style={{ fontSize: '.7rem' }}>{o.sucursal || '—'}</span></td>}
                    <td>{Number(o.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                    <td>
                      <span className={`badge ${
                        o.estado === 'PAGADA' ? 'badge-green' :
                        o.estado === 'ANULADA' ? 'badge-gray' :
                        o.estado === 'DEVUELTA' ? 'badge-orange' :
                        'badge-yellow'
                      }`}>{o.estado}</span>
                    </td>
                    <td>{new Date(o.fecha).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
                {(data?.ultimas_ventas || []).length === 0 && (
                  <tr><td colSpan={esAdmin ? 6 : 5} className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay ventas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 28 }}>
        <div className="card-body">
          <h2 className="page-title text-sm mb-4">Productos con stock bajo</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bajo_stock || []).map(item => (
                  <tr key={item.id}>
                    <td>{item.sku}</td>
                    <td>{item.nombre}</td>
                    <td>{item.stock_actual}</td>
                    <td>{item.stock_minimo}</td>
                    <td><span className="badge badge-yellow">Reponer</span></td>
                  </tr>
                ))}
                {data?.bajo_stock?.length === 0 && (
                  <tr><td colSpan="5" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Todos los productos tienen stock suficiente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
