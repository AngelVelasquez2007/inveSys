import { api } from './api.js'

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/auth/login'
const REGISTRO_ADMIN_ENDPOINT = import.meta.env.VITE_REGISTRO_ADMIN_ENDPOINT || '/auth/register/admin'
const REGISTRO_USUARIO_ENDPOINT = import.meta.env.VITE_REGISTRO_USUARIO_ENDPOINT || '/auth/register/usuario'
const VERIFICAR_CODIGO_ENDPOINT = import.meta.env.VITE_VERIFICAR_CODIGO_ENDPOINT || '/auth/verificar-codigo'

export async function loginUsuario({ correo, contrasena }) {
  const { data } = await api.post(LOGIN_ENDPOINT, {
    correo,
    contrasena,
  })

  const token = data.access_token || data.token || data.accessToken
  const usuario = data.usuario || data.user || null

  if (token) {
    sessionStorage.setItem('token', token)
  }

  if (usuario) {
    sessionStorage.setItem('usuario', JSON.stringify(usuario))
  }

  return data
}

export async function registrarAdmin({ nombre, correo, contrasena, nombre_empresa }) {
  const { data } = await api.post(REGISTRO_ADMIN_ENDPOINT, {
    nombre,
    correo,
    contrasena,
    nombre_empresa,
  })

  return data
}

export async function registrarUsuario({ nombre, correo, contrasena, codigo_admin, sucursal_id }) {
  const { data } = await api.post(REGISTRO_USUARIO_ENDPOINT, {
    nombre,
    correo,
    contrasena,
    codigo_admin,
    sucursal_id,
  })

  return data
}

export async function verificarCodigoAdmin(codigo_admin) {
  const { data } = await api.post(VERIFICAR_CODIGO_ENDPOINT, { codigo_admin })
  return data
}

export function cerrarSesion() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('usuario')
}
