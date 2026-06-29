import { useEffect, useState } from 'react'
import {
  Megaphone,
  Percent,
  DollarSign,
  Calendar,
  Store,
  Plus,
  Trash2,
  Edit3,
  X,
} from 'lucide-react'
import { api, apiError } from '../services/api.js'
import { useToast } from '../App.jsx'

const emptyForm = {
  titulo: '',
  descripcion: '',
  tipo: 'PORCENTAJE',
  valor: '',
  fecha_inicio: '',
  fecha_fin: '',
  sucursal_ids: [],
}

function getUsuario() {
  try { return JSON.parse(sessionStorage.getItem('usuario')) } catch { return null }
}

function today() { return new Date().toISOString().split('T')[0] }

export default function Descuentos() {
  const toast = useToast()
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [descuentos, setDescuentos] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrandoModal, setMostrandoModal] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function load() {
    api.get('/descuentos').then(r => setDescuentos(r.data)).catch(() => {})
    if (esAdmin) {
      api.get('/sucursales').then(r => setSucursales(r.data)).catch(() => {})
    }
  }

  useEffect(load, [])

  function abrirCrear() {
    setForm(emptyForm)
    setEditandoId(null)
    setMostrandoModal(true)
  }

  function abrirEditar(d) {
    setForm({
      titulo: d.titulo,
      descripcion: d.descripcion || '',
      tipo: d.tipo,
      valor: String(d.valor),
      fecha_inicio: d.fecha_inicio ? d.fecha_inicio.slice(0, 16) : '',
      fecha_fin: d.fecha_fin ? d.fecha_fin.slice(0, 16) : '',
      sucursal_ids: d.sucursales_ids || [],
    })
    setEditandoId(d.id)
    setMostrandoModal(true)
  }

  function toggleSucursal(id) {
    setForm(prev => ({
      ...prev,
      sucursal_ids: prev.sucursal_ids.includes(id)
        ? prev.sucursal_ids.filter(x => x !== id)
        : [...prev.sucursal_ids, id],
    }))
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.valor) return
    setGuardando(true)
    try {
      const payload = {
        ...form,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        valor: Number(form.valor),
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      }
      if (editandoId) {
        await api.put(`/descuentos/${editandoId}`, payload)
        toast('Descuento actualizado')
      } else {
        await api.post('/descuentos', payload)
        toast('Descuento creado')
      }
      setMostrandoModal(false)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(d) {
    if (!window.confirm(`¿Eliminar "${d.titulo}"?`)) return
    try {
      await api.delete(`/descuentos/${d.id}`)
      toast('Descuento eliminado')
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  function activo(d) {
    if (!d.activo) return false
    if (d.fecha_fin && new Date(d.fecha_fin) < new Date()) return false
    if (new Date(d.fecha_inicio) > new Date()) return false
    return true
  }

  const ahora = new Date()

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Descuentos y ofertas</h1>
          <p className="page-subtitle">
            {esAdmin ? 'Crea y gestiona descuentos temporales por sucursal.' : 'Descuentos activos disponibles.'}
          </p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={abrirCrear}>
            <Plus size={16} />
            Nuevo descuento
          </button>
        )}
      </header>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descuento</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Vigencia</th>
                <th>Sucursales</th>
                <th>Estado</th>
                {esAdmin && <th className="text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {descuentos.map(d => {
                const vigente = activo(d)
                return (
                  <tr key={d.id} style={vigente ? undefined : { opacity: 0.5 }}>
                    <td>
                      <strong>{d.titulo}</strong>
                      {d.descripcion && <div className="text-sm text-muted">{d.descripcion}</div>}
                    </td>
                    <td>
                      <span className="badge badge-gray">
                        {d.tipo === 'PORCENTAJE' ? <Percent size={12} /> : <DollarSign size={12} />}
                        {' '}{d.tipo === 'PORCENTAJE' ? '%' : '$'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {d.tipo === 'PORCENTAJE' ? `${d.valor}%` : Number(d.valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                    </td>
                    <td style={{ fontSize: '.8rem' }}>
                      <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {new Date(d.fecha_inicio).toLocaleDateString()}
                      {d.fecha_fin && <> → {new Date(d.fecha_fin).toLocaleDateString()}</>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(d.sucursales_ids || []).length > 0
                          ? d.sucursales_ids.map(sid => (
                              <span key={sid} className="badge badge-gray" style={{ fontSize: '.65rem' }}>
                                <Store size={10} /> #{sid}
                              </span>
                            ))
                          : <span className="text-muted" style={{ fontSize: '.75rem' }}>Todas</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${vigente ? 'badge-green' : 'badge-gray'}`}>
                        {vigente ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {esAdmin && (
                      <td className="text-right">
                        <div className="table-actions">
                          <button className="btn-icon" onClick={() => abrirEditar(d)} title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => eliminar(d)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )}
              )}
              {descuentos.length === 0 && (
                <tr><td colSpan={esAdmin ? 7 : 6} className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No hay descuentos creados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {esAdmin && mostrandoModal && (
        <div className="modal-overlay" onClick={() => setMostrandoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editandoId ? 'Editar descuento' : 'Nuevo descuento'}</h2>
              <button className="btn-icon" onClick={() => setMostrandoModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={guardar}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="form-group">
                  <span className="form-label">Título</span>
                  <input className="form-control" required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: 20% en jamones" />
                </label>
                <label className="form-group">
                  <span className="form-label">Descripción (opcional)</span>
                  <textarea className="form-control" rows={2} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Válido para jamones serranos e ibéricos" />
                </label>
                <div className="form-row">
                  <label className="form-group">
                    <span className="form-label">Tipo</span>
                    <select className="form-control" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="FIJO">Valor fijo ($)</option>
                    </select>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Valor</span>
                    <input className="form-control" type="number" min="0.01" step="0.01" required value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-group">
                    <span className="form-label">Inicio</span>
                    <input className="form-control" type="datetime-local" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Fin (opcional)</span>
                    <input className="form-control" type="datetime-local" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                  </label>
                </div>
                <div className="form-group">
                  <span className="form-label">Aplicar a sucursales</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sucursales.map(s => (
                      <label key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', borderRadius: 8, fontSize: '.8rem',
                        border: `1px solid ${form.sucursal_ids.includes(s.id) ? 'var(--primary)' : 'var(--border)'}`,
                        background: form.sucursal_ids.includes(s.id) ? 'var(--primary-lt)' : 'transparent',
                        cursor: 'pointer',
                      }}>
                        <input type="checkbox" checked={form.sucursal_ids.includes(s.id)} onChange={() => toggleSucursal(s.id)} style={{ accentColor: 'var(--primary)' }} />
                        {s.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMostrandoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear descuento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
