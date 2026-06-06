import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import apiClient from '../lib/axios'
import type { User, LoginPayload, RegisterPayload } from '../types/auth'

// ── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  loginWithToken: (token: string, user: User) => void
  logout: () => void
}

// ── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('vb_user')
      return stored ? (JSON.parse(stored) as User) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('vb_token'),
  )
  const [isLoading, setIsLoading] = useState(false)

  // Keep axios header in sync whenever token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('vb_token', token)
    } else {
      localStorage.removeItem('vb_token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('vb_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('vb_user')
    }
  }, [user])

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    setIsLoading(true)
    try {
      // FastAPI OAuth2PasswordRequestForm requires form-encoded body
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)

      const { data } = await apiClient.post('/api/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      setToken(data.access_token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithToken = useCallback((accessToken: string, userData: User) => {
    setToken(accessToken)
    setUser(userData)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true)
    try {
      await apiClient.post('/api/auth/register', payload)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
