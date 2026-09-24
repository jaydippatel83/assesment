import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAccessToken, setSessionExpiredHandler } from '../api/client'
import type { MaskedUser } from '../api/types'
import { AuthContext, type AuthState } from './useAuth'

interface SessionResponse {
  accessToken: string
  user: MaskedUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MaskedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const startSession = useCallback((data: SessionResponse) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    api
      .post<SessionResponse>('/auth/refresh')
      .then((r) => startSession(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [startSession])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (input) => startSession((await api.post<SessionResponse>('/auth/login', input)).data),
      register: async (input) => startSession((await api.post<SessionResponse>('/auth/register', input)).data),
      logout: async () => {
        await api.post('/auth/logout').catch(() => undefined)
        setAccessToken(null)
        setUser(null)
      },
    }),
    [user, loading, startSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
