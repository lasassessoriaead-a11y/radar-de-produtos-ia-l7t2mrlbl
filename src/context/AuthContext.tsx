import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabaseAuth, type SupabaseAuthUser, type SupabaseSession } from '@/lib/supabase'
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

function mapUser(user: SupabaseAuthUser | null | undefined): AuthUser | null {
  if (!user) return null
  const metaName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : undefined
  return {
    id: user.id,
    email: user.email,
    name: metaName || user.email?.split('@')[0],
  }
}

function mirrorSession(session: SupabaseSession | null) {
  if (session?.access_token && session.user) {
    pb.authStore.save(session.access_token, mapUser(session.user) as any)
  } else {
    pb.authStore.clear()
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const apply = (session: SupabaseSession | null) => {
    setUser(mapUser(session?.user))
    setToken(session?.access_token || null)
    mirrorSession(session)
  }

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        let session = supabaseAuth.load()
        if (!session) {
          if (active) apply(null)
          return
        }

        const now = Math.floor(Date.now() / 1000)
        if (session.expires_at && session.expires_at <= now + 30 && session.refresh_token) {
          session = await supabaseAuth.refresh(session.refresh_token)
        } else {
          const freshUser = await supabaseAuth.getUser(session.access_token)
          session = { ...session, user: freshUser }
          supabaseAuth.save(session)
        }

        if (active) apply(session)
      } catch (err) {
        console.warn('Sessão Supabase inválida, limpando sessão local.', err)
        supabaseAuth.save(null)
        if (active) apply(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const session = await supabaseAuth.signIn(email.trim(), password)
      apply(session)
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (/invalid login credentials/i.test(msg)) throw new Error('E-mail ou senha incorretos.')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      const session = await supabaseAuth.signUp(email.trim(), password, name)
      if (!session) {
        throw new Error('Conta criada. Verifique seu e-mail para confirmar o acesso antes de entrar.')
      }
      apply(session)
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (/already registered|already been registered|user already/i.test(msg)) {
        throw new Error('Este e-mail já possui uma conta. Use a opção Entrar.')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await supabaseAuth.signOut(token || undefined)
    apply(null)
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
