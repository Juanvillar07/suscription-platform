import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, setOnSessionExpired } from '@/lib/api'
import type { AuthResponse, User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // Restaurar sesión desde la cookie de refresh al cargar la app
  useEffect(() => {
    refreshSession()
      .then((s) => setUser(s?.user ?? null))
      .finally(() => setLoading(false))
    setOnSessionExpired(() => {
      setUser(null)
      queryClient.clear()
    })
  }, [queryClient])

  const handleAuth = useCallback((data: AuthResponse) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(
    async (email: string, password: string) =>
      handleAuth((await api.post<AuthResponse>('/auth/login', { email, password })).data),
    [handleAuth],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      handleAuth((await api.post<AuthResponse>('/auth/register', { name, email, password })).data),
    [handleAuth],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setAccessToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
