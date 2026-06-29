import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
})

export function apiError(error) {
  return error?.response?.data?.detail || error?.message || 'No se pudo completar la operacion'
}
