export type UserRole = 'officer' | 'vendor' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  country?: string
  role: UserRole
  company_name?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  country?: string
  role: UserRole
  company_name?: string
  gst_number?: string
  category?: string
}
