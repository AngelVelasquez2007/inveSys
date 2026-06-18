import { api } from './api.js'

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/auth/login'
const REGISTRO_ENDPOINT = import.meta.env.VITE_REGISTRO_ENDPOINT || '/auth/register'

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

export async function registrarUsuario({ nombre, correo, contrasena }) {
  const { data } = await api.post(REGISTRO_ENDPOINT, {
    nombre,
    correo,
    contrasena,
  })

  return data
}

export function cerrarSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}