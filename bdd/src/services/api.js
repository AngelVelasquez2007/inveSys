import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function apiError(error) {
  const status = error?.response?.status

  if (status === 401) {
    return 'No autorizado. Inicia sesión nuevamente.'
  }

  if (status === 404) {
    return 'No se encontró el endpoint solicitado en el backend.'
  }

  if (status === 500) {
    return 'Error interno del servidor. Intenta nuevamente.'
  }

  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    'No se pudo completar la solicitud'
  )
}
