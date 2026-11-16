import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from './types'

/**
 * El access token vive solo en memoria; el refresh token es una cookie httpOnly
 * que el backend pone en /api/auth. Al recargar la página se recupera la sesión con /auth/refresh.
 */
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => {
  accessToken = t
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing: Promise<AuthResponse | null> | null = null
let onSessionExpired: (() => void) | null = null
export const setOnSessionExpired = (fn: () => void) => {
  onSessionExpired = fn
}

/** Una sola petición de refresh aunque fallen varias llamadas a la vez */
export function refreshSession() {
  refreshing ??= api
    .post<AuthResponse>('/auth/refresh')
    .then((r) => {
      setAccessToken(r.data.accessToken)
      return r.data
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
  const isAuthCall = original?.url?.startsWith('/auth/')
  if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
    original._retry = true
    const session = await refreshSession()
    if (session) return api(original)
    onSessionExpired?.()
  }
  return Promise.reject(error)
})

/** Extrae un mensaje legible de un error del backend */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (msg) return msg
    return err.message
  }
  return err instanceof Error ? err.message : 'Error inesperado'
}
