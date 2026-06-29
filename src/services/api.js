import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
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
  if (error?.code === 'ECONNABORTED') {
    return 'El servidor no respondió a tiempo. Verifica que FastAPI esté corriendo en el puerto 8000.'
  }

  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    'No se pudo completar la solicitud'
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
