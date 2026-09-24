import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

let accessToken: string | null = null
let onSessionExpired: () => void = () => {}

export const setAccessToken = (token: string | null) => {
  accessToken = token
}
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler
}

export const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
  const isAuthCall = original?.url?.startsWith('/auth/')
  if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
    throw error
  }
  original._retried = true
  try {
    refreshing ??= api.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data.accessToken)
    setAccessToken(await refreshing)
  } catch {
    setAccessToken(null)
    onSessionExpired()
    throw error
  } finally {
    refreshing = null
  }
  return api(original)
})

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] }
}

export function apiError(err: unknown): ApiErrorBody['error'] {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return (err.response.data as ApiErrorBody).error
  }
  return { code: 'NETWORK', message: 'Could not reach the server. Is the API running?' }
}
