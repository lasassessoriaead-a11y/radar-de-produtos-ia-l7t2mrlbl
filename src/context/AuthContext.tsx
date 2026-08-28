import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

interface AuthContextType {
  user: RecordModel | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email?: string, password?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [token, setToken] = useState<string | null>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check initial auth state or auto-login with default demo user if not logged in
    async function initAuth() {
      if (!pb.authStore.isValid) {
        try {
          await pb.collection('users').authWithPassword('luka2510@hotmail.com', 'Skip@Pass')
        } catch (err) {
          console.warn('Auto demo login skipped or failed:', err)
        }
      }
      setUser(pb.authStore.record)
      setToken(pb.authStore.token)
      setIsLoading(false)
    }

    initAuth()

    const unsubscribe = pb.authStore.onChange((tok, rec) => {
      setToken(tok)
      setUser(rec)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email = 'luka2510@hotmail.com', password = 'Skip@Pass') => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword(email, password)
      setUser(pb.authStore.record)
      setToken(pb.authStore.token)
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
      value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
