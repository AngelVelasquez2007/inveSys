import { Edit, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'

const emptyForm = {
  nit: '',
  nombre: '',
  correo: '',
  telefono: '',
  ciudad: '',
  activo: true,
}

export default function Proveedores() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  function load() {
    api.get('/proveedores')
      .then(response => {
        setItems(response.data)
        setError('')
      })
      .catch(err => setError(apiError(err)))
  }

  useEffect(load, [])

  const filtrados = useMemo(() => {
    const term = query.toLowerCase()
    return items.filter(item =>
      [item.nit, item.nombre, item.correo, item.ciudad]
        .some(value => String(value).toLowerCase().includes(term)),
    )
  }, [items, query])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item.id)
    setForm({
      nit: item.nit,
      nombre: item.nombre,
      correo: item.correo,
      telefono: item.telefono || '',
      ciudad: item.ciudad,
      activo: item.activo,
    })
    setModalOpen(true)
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    try {
      if (editing) {
        const { nit, ...payload } = form
        await api.put(`/proveedores/${editing}`, payload)
        toast('Proveedor actualizado')
      } else {
        await api.post('/proveedores', form)
        toast('Proveedor creado')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/proveedores/${item.id}`)
      toast('Proveedor desactivado')
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Gestiona los proveedores de productos.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </header>

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar proveedor" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NIT</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => (
                <tr key={item.id}>
                  <td>{item.nit}</td>
                  <td>{item.nombre}</td>
                  <td>{item.correo}</td>
                  <td>{item.telefono || 'Sin teléfono'}</td>
                  <td>{item.ciudad}</td>
                  <td>
                    <span className={`badge ${item.activo ? 'badge-green' : 'badge-gray'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-icon" onClick={() => openEdit(item)} title="Editar">
                      <Edit size={15} />
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(item)} title="Desactivar">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay proveedores registrados. Presiona "Nuevo proveedor" para comenzar.</td>
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
              <h2 className="modal-title">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-group">
                  <span className="form-label">NIT</span>
                  <input className="form-control" required minLength="3" value={form.nit} disabled={Boolean(editing)} onChange={event => updateField('nit', event.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Nombre</span>
                  <input className="form-control" required minLength="3" value={form.nombre} onChange={event => updateField('nombre', event.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-group">
                  <span className="form-label">Correo</span>
                  <input className="form-control" type="email" required value={form.correo} onChange={event => updateField('correo', event.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Teléfono</span>
                  <input className="form-control" value={form.telefono} onChange={event => updateField('telefono', event.target.value)} />
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">Ciudad</span>
                <input className="form-control" required minLength="2" value={form.ciudad} onChange={event => updateField('ciudad', event.target.value)} />
              </label>
              <label className="check-row">
                <input type="checkbox" checked={form.activo} onChange={event => updateField('activo', event.target.checked)} />
                Proveedor activo
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
