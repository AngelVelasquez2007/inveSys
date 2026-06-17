import { AlertTriangle, Boxes, PackageCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard')
      .then(response => setData(response.data))
      .catch(() => setError('Backend no disponible. Inicia FastAPI en el puerto 8000.'))
  }, [])

  const resumen = data?.resumen || {}
  const stats = [
    { label: 'Productos', value: resumen.productos ?? '-', sub: 'Productos activos', icon: Boxes },
    { label: 'Stock total', value: resumen.stock_total ?? '-', sub: 'Unidades registradas', icon: PackageCheck },
    { label: 'Clientes', value: resumen.clientes ?? '-', sub: 'Clientes activos', icon: Users },
    { label: 'Alertas', value: resumen.alertas ?? '-', sub: 'Productos bajo minimo', icon: AlertTriangle },
  ]

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general del sistema de inventario.</p>
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

      <section className="card">
        <div className="card-body">
          <h2 className="page-title text-sm mb-4">Productos con stock bajo</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Stock</th>
                  <th>Minimo</th>
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
                    <td>
                      <span className="badge badge-yellow">Reponer</span>
                    </td>
                  </tr>
                ))}
                {data?.bajo_stock?.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-muted">No hay productos bajo minimo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
