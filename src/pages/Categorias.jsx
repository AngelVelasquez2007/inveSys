import { Edit, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'

const emptyForm = {
  nombre: '',
  descripcion: '',
}

export default function Categorias() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  function load() {
    api.get('/categorias')
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
      [item.nombre, item.descripcion]
        .filter(Boolean)
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
      nombre: item.nombre,
      descripcion: item.descripcion || '',
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
        await api.put(`/categorias/${editing}`, form)
        toast('Categoría actualizada')
      } else {
        await api.post('/categorias', form)
        toast('Categoría creada')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/categorias/${item.id}`)
      toast('Categoría eliminada')
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">Gestiona las categorías de productos.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Nueva categoría
        </button>
      </header>

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar categoría" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td className="text-muted">{item.descripcion || 'Sin descripción'}</td>
                  <td className="text-right">
                    <button className="btn-icon" onClick={() => openEdit(item)} title="Editar">
                      <Edit size={15} />
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(item)} title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-muted">No hay categorías para mostrar.</td>
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
              <h2 className="modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <label className="form-group">
                <span className="form-label">Nombre</span>
                <input className="form-control" required minLength="2" value={form.nombre} onChange={event => updateField('nombre', event.target.value)} />
              </label>
              <label className="form-group">
                <span className="form-label">Descripción</span>
                <textarea className="form-control" rows="3" value={form.descripcion} onChange={event => updateField('descripcion', event.target.value)} />
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
