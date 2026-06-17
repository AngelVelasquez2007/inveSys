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

export function cerrarSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}