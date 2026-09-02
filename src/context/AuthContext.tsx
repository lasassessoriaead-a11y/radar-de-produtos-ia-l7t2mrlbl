import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email || undefined,
    name:
      (user.user_metadata?.name as string | undefined) ||
      (user.email ? user.email.split('@')[0] : undefined),
  }
}

function mirrorSession(accessToken?: string | null, user?: User | null) {
  if (accessToken && user) {
    // Existing services still read pb.authStore.token. Keep only the Supabase JWT there;
    // authentication itself is fully handled by Supabase.
    pb.authStore.save(accessToken, mapUser(user) as any)
  } else {
    pb.authStore.clear()
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!active) return
        const session = data.session
        setUser(mapUser(session?.user || null))
        setToken(session?.access_token || null)
        mirrorSession(session?.access_token, session?.user || null)
      } catch (err) {
        console.error('Supabase session bootstrap failed:', err)
        setUser(null)
        setToken(null)
        mirrorSession(null, null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(mapUser(session?.user || null))
      setToken(session?.access_token || null)
      mirrorSession(session?.access_token, session?.user || null)
      setIsLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw new Error(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      )
      setUser(mapUser(data.user))
      setToken(data.session?.access_token || null)
      mirrorSession(data.session?.access_token, data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name || email.split('@')[0] } },
      })
      if (error) {
        const msg = /already registered|already been registered|user already/i.test(error.message)
          ? 'Este e-mail já possui uma conta. Use a opção Entrar.'
          : error.message
        throw new Error(msg)
      }

      if (!data.session) {
        throw new Error('Conta criada. Verifique seu e-mail para confirmar o acesso antes de entrar.')
      }

      setUser(mapUser(data.user))
      setToken(data.session.access_token)
      mirrorSession(data.session.access_token, data.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    mirrorSession(null, null)
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
