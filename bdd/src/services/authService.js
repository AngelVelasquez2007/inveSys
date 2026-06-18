import { api } from './api.js'

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/auth/login'

export async function loginUsuario({ correo, contrasena, recordar = false }) {
  const { data } = await api.post(LOGIN_ENDPOINT, {
    correo,
    contrasena,
  })

  const token = data.access_token
  const usuario = data.usuario

  if (token) {
    localStorage.setItem('token', token)
  }

  if (usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario))
  }

  if (recordar) {
    localStorage.setItem('recordar', 'true')
  } else {
    localStorage.removeItem('recordar')
  }

  return data
}

export async function obtenerUsuario() {
  const { data } = await api.get('/auth/me')
  return data
}

export function cerrarSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  localStorage.removeItem('recordar')
  window.location.href = '/login'
}

export function getUsuario() {
  try {
    const raw = localStorage.getItem('usuario')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
