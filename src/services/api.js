import axios from 'axios'

const DEFAULT_API_URL = 'https://proyecto-final-bdd-i.onrender.com'

export function getApiUrl() {
  return localStorage.getItem('invesys_api_url') || import.meta.env.VITE_API_URL || DEFAULT_API_URL
}

export function setApiUrl(url) {
  const cleanUrl = url.replace(/\/+$/, '')
  localStorage.setItem('invesys_api_url', cleanUrl)
  api.defaults.baseURL = cleanUrl
}

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl()

  const token = sessionStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('usuario')

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export function apiError(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    'Error de conexión. Verifica que el servidor esté activo.'
  )
}

export function hayToken() {
  const token = sessionStorage.getItem('token')

  if (!token) return false

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
