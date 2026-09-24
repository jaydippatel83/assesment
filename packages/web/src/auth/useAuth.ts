import type { LoginInput, RegisterInput } from '@app/core'
import { createContext, useContext } from 'react'
import type { MaskedUser } from '../api/types'

export interface AuthState {
  user: MaskedUser | null
  loading: boolean
  login(input: LoginInput): Promise<void>
  register(input: RegisterInput): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
