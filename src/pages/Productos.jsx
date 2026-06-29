import { Bookmark, Edit, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../App.jsx'
import { api, apiError } from '../services/api.js'

const emptyForm = {
  sku: '',
  nombre: '',
  categoria_id: '',
  proveedor_id: '',
  precio: '',
  stock_actual: '',
  stock_minimo: '',
  activo: true,
}

const emptyCatForm = { nombre: '', descripcion: '' }

export default function Productos() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [catalogos, setCatalogos] = useState({ categorias: [], proveedores: [] })
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Categories modal state
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [catQuery, setCatQuery] = useState('')
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [catEditing, setCatEditing] = useState(null)
  const [catError, setCatError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([api.get('/productos'), api.get('/catalogos')])
      .then(([productosRes, catalogosRes]) => {
        setProductos(productosRes.data)
        setCatalogos(catalogosRes.data)
        setError('')
      })
      .catch(err => setError(apiError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtrados = useMemo(() => {
    const term = query.toLowerCase()
    return productos.filter(producto =>
      [producto.sku, producto.nombre, producto.categoria, producto.proveedor]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)),
    )
  }, [productos, query])

  const catFiltrados = useMemo(() => {
    const term = catQuery.toLowerCase()
    return categorias.filter(item =>
      [item.nombre, item.descripcion]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)),
    )
  }, [categorias, catQuery])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(producto) {
    setEditing(producto.id)
    setForm({
      sku: producto.sku,
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      proveedor_id: producto.proveedor_id || '',
      precio: producto.precio,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      activo: producto.activo,
    })
    setModalOpen(true)
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    const payload = {
      ...form,
      categoria_id: Number(form.categoria_id),
      proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
      precio: Number(form.precio),
      stock_actual: Number(form.stock_actual),
      stock_minimo: Number(form.stock_minimo),
    }

    try {
      if (editing) {
        const { sku, ...updatePayload } = payload
        await api.put(`/productos/${editing}`, updatePayload)
        toast('Producto actualizado')
      } else {
        await api.post('/productos', payload)
        toast('Producto creado')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function remove(producto) {
    try {
      await api.delete(`/productos/${producto.id}`)
      toast('Producto desactivado')
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  // ─── Categories management ─────────────────────

  function cargarCategorias() {
    api.get('/categorias')
      .then(res => { setCategorias(res.data); setCatError('') })
      .catch(err => setCatError(apiError(err)))
  }

  function openCatModal() {
    cargarCategorias()
    setCatEditing(null)
    setCatForm(emptyCatForm)
    setCatModalOpen(true)
  }

  function openCatEdit(item) {
    setCatEditing(item.id)
    setCatForm({ nombre: item.nombre, descripcion: item.descripcion || '' })
    setCatModalOpen(true)
  }

  async function saveCat(event) {
    event.preventDefault()
    try {
      if (catEditing) {
        await api.put(`/categorias/${catEditing}`, catForm)
        toast('Categoría actualizada')
      } else {
        await api.post('/categorias', catForm)
        toast('Categoría creada')
      }
      cargarCategorias()
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  async function removeCat(item) {
    try {
      await api.delete(`/categorias/${item.id}`)
      toast('Categoría eliminada')
      cargarCategorias()
      load()
    } catch (err) {
      toast(apiError(err), 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Administra tu catálogo de productos, precios y stock.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Nuevo producto
        </button>
      </header>

      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input placeholder="Buscar producto" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <button className="btn btn-secondary" onClick={openCatModal}>
          <Bookmark size={16} />
          Gestionar categorías
        </button>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Proveedor</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(producto => (
                <tr key={producto.id}>
                  <td>{producto.sku}</td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria}</td>
                  <td>{producto.proveedor || 'Sin proveedor'}</td>
                  <td>{Number(producto.precio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                  <td>{producto.stock_actual}</td>
                  <td>
                    <span className={`badge ${producto.activo ? 'badge-green' : 'badge-gray'}`}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-icon" onClick={() => openEdit(producto)} title="Editar">
                      <Edit size={15} />
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(producto)} title="Desactivar">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay productos registrados. Presiona "Nuevo producto" para comenzar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <form className="modal modal-lg" onSubmit={save}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-group">
                  <span className="form-label">SKU</span>
                  <input className="form-control" required minLength="3" value={form.sku} disabled={Boolean(editing)} onChange={event => updateField('sku', event.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Nombre</span>
                  <input className="form-control" required minLength="3" value={form.nombre} onChange={event => updateField('nombre', event.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label className="form-group">
                  <span className="form-label">Categoria</span>
                  <select className="form-control" required value={form.categoria_id} onChange={event => updateField('categoria_id', event.target.value)}>
                    <option value="">Seleccionar</option>
                    {catalogos.categorias.map(categoria => <option value={categoria.id} key={categoria.id}>{categoria.nombre}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">Proveedor principal</span>
                  <select className="form-control" value={form.proveedor_id} onChange={event => updateField('proveedor_id', event.target.value)}>
                    <option value="">Sin proveedor</option>
                    {catalogos.proveedores.map(proveedor => <option value={proveedor.id} key={proveedor.id}>{proveedor.nombre}</option>)}
                  </select>
                </label>
              </div>
              <div className="form-row-3">
                <label className="form-group">
                  <span className="form-label">Precio</span>
                  <input className="form-control" type="number" min="1" required value={form.precio} onChange={event => updateField('precio', event.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Stock actual</span>
                  <input className="form-control" type="number" min="0" required value={form.stock_actual} onChange={event => updateField('stock_actual', event.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Stock minimo</span>
                  <input className="form-control" type="number" min="0" required value={form.stock_minimo} onChange={event => updateField('stock_minimo', event.target.value)} />
                </label>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={form.activo} onChange={event => updateField('activo', event.target.checked)} />
                Producto activo
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Categories modal ─────────────────────── */}
      {catModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">Gestionar categorías</h2>
              <button type="button" className="btn-icon" onClick={() => setCatModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <label className="search-box">
                  <Search size={16} />
                  <input placeholder="Buscar categoría" value={catQuery} onChange={e => setCatQuery(e.target.value)} />
                </label>
                <button className="btn btn-primary btn-sm" onClick={() => { setCatEditing(null); setCatForm(emptyCatForm) }}>
                  <Plus size={14} />
                  Nueva
                </button>
              </div>

              {catError && <div className="alert alert-danger mb-4">{catError}</div>}

              <form onSubmit={saveCat} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  className="form-control"
                  placeholder="Nombre"
                  required minLength="2"
                  value={catForm.nombre}
                  onChange={e => setCatForm(f => ({ ...f, nombre: e.target.value }))}
                />
                <input
                  className="form-control"
                  placeholder="Descripción (opcional)"
                  value={catForm.descripcion}
                  onChange={e => setCatForm(f => ({ ...f, descripcion: e.target.value }))}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  {catEditing ? 'Guardar' : 'Crear'}
                </button>
                {catEditing && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCatEditing(null); setCatForm(emptyCatForm) }}>
                    Cancelar
                  </button>
                )}
              </form>

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
                    {catFiltrados.map(item => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td className="text-muted">{item.descripcion || 'Sin descripción'}</td>
                        <td className="text-right">
                          <button className="btn-icon" onClick={() => openCatEdit(item)} title="Editar">
                            <Edit size={15} />
                          </button>
                          <button className="btn-icon danger" onClick={() => removeCat(item)} title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {catFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>Aún no hay categorías. Crea la primera arriba.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
