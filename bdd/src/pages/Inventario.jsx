import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'

const emptyForm = {
  producto_id: '',
  tipo: 'ENTRADA',
  cantidad: '',
  motivo: '',
}

export default function Inventario() {
  const toast = useToast()
  const [movimientos, setMovimientos] = useState([])
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  function load() {
    Promise.all([api.get('/movimientos'), api.get('/productos')])
      .then(([movimientosRes, productosRes]) => {
        setMovimientos(movimientosRes.data)
        setProductos(productosRes.data.filter(producto => producto.activo))
        setError('')
      })
      .catch(err => setError(apiError(err)))
  }

  useEffect(load, [])

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    try {
      await api.post('/movimientos', {
        ...form,
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
      })
      toast('Movimiento registrado')
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function remove(movimiento) {
    try {
      await api.delete(`/movimientos/${movimiento.id}`)
      toast('Movimiento eliminado')
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Entradas, salidas y ajustes con validacion de stock.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nuevo movimiento
        </button>
      </header>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Fecha</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(movimiento => {
                const entrada = movimiento.tipo === 'ENTRADA'
                const Icon = entrada ? ArrowDownToLine : ArrowUpFromLine

                return (
                  <tr key={movimiento.id}>
                    <td>MOV-{String(movimiento.id).padStart(4, '0')}</td>
                    <td>
                      <span className={`badge ${entrada ? 'badge-green' : 'badge-blue'}`}>
                        <Icon size={13} />
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td>{movimiento.producto}</td>
                    <td>{movimiento.cantidad}</td>
                    <td>{movimiento.motivo}</td>
                    <td>{new Date(movimiento.created_at).toLocaleString('es-CO')}</td>
                    <td className="text-right">
                      <button className="btn-icon danger" onClick={() => remove(movimiento)} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-muted">No hay movimientos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={save}>
            <div className="modal-header">
              <h2 className="modal-title">Nuevo movimiento</h2>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <label className="form-group">
                <span className="form-label">Producto</span>
                <select className="form-control" required value={form.producto_id} onChange={event => updateField('producto_id', event.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {productos.map(producto => (
                    <option value={producto.id} key={producto.id}>{producto.sku} - {producto.nombre}</option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label className="form-group">
                  <span className="form-label">Tipo</span>
                  <select className="form-control" value={form.tipo} onChange={event => updateField('tipo', event.target.value)}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">Cantidad</span>
                  <input className="form-control" type="number" min="1" required value={form.cantidad} onChange={event => updateField('cantidad', event.target.value)} />
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Motivo</span>
                <input className="form-control" required minLength="3" value={form.motivo} onChange={event => updateField('motivo', event.target.value)} />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
