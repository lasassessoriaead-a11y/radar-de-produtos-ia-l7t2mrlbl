import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

export interface AuthUser {
  id: string
  email?: string
  name?: string
  [key: string]: unknown
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(pb.authStore.record as AuthUser | null)
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    setUser(pb.authStore.record as AuthUser | null)
    setToken(pb.authStore.token || null)
    setIsLoading(false)

    const unsubscribe = pb.authStore.onChange((tok, rec) => {
      setToken(tok || null)
      setUser(rec as AuthUser | null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword(email, password)
      setUser(pb.authStore.record as AuthUser | null)
      setToken(pb.authStore.token || null)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      const result = await pb.auth.signUp(email, password, name)
      if (!result?.access_token) {
        throw new Error(
          'Conta criada. Confirme o e-mail se o Supabase solicitar e depois faça login.',
        )
      }
      setUser(pb.authStore.record as AuthUser | null)
      setToken(pb.authStore.token || null)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
