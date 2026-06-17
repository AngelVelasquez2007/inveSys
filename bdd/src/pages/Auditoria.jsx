import { useEffect, useState } from 'react'
import { api, apiError } from '../services/api.js'

export default function Auditoria() {
  const [eventos, setEventos] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/auditoria')
      .then(response => {
        setEventos(response.data)
        setError('')
      })
      .catch(err => setError(apiError(err)))
  }, [])

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Auditoria</h1>
          <p className="page-subtitle">Registro automatico de INSERT, UPDATE y DELETE.</p>
        </div>
      </header>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Tabla</th>
                <th>Registro</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map(evento => (
                <tr key={evento.id}>
                  <td>AUD-{String(evento.id).padStart(4, '0')}</td>
                  <td>{evento.usuario}</td>
                  <td><span className="badge badge-blue">{evento.accion}</span></td>
                  <td>{evento.tabla_afectada}</td>
                  <td>{evento.registro_id || 'N/A'}</td>
                  <td>{new Date(evento.created_at).toLocaleString('es-CO')}</td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-muted">No hay eventos de auditoria para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
