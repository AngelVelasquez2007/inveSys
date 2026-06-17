import { api } from './api.js'

const LOGIN_ENDPOINT = '/auth/login'

export async function loginUsuario({ correo, contrasena }) {
  const { data } = await api.post(LOGIN_ENDPOINT, {
    correo,
    contrasena,
  })

  const token = data.access_token || data.token || data.accessToken
  const usuario = data.usuario || data.user || null

  if (token) {
    localStorage.setItem('token', token)
  }

  if (usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario))
  }

  return data
}

export function obtenerToken() {
  return localStorage.getItem('token')
}

export function estaAutenticado() {
  return Boolean(obtenerToken())
}

export function obtenerUsuario() {
  const usuario = localStorage.getItem('usuario')

  if (!usuario) {
    return null
  }

  try {
    return JSON.parse(usuario)
  } catch {
    return null
  }
}

export function cerrarSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}
