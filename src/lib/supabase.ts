const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase não configurado no frontend.')
}

const SESSION_KEY = 'radar_supabase_session'

export type SupabaseAuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export type SupabaseSession = {
  access_token: string
  refresh_token: string
  expires_in?: number
  expires_at?: number
  token_type?: string
  user: SupabaseAuthUser
}

function headers(token?: string) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`
    throw new Error(message)
  }
  return data
}

function normalizeSession(data: any): SupabaseSession {
  const expiresIn = Number(data.expires_in || 3600)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: data.token_type,
    user: data.user,
  }
}

export const supabaseAuth = {
  load(): SupabaseSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  save(session: SupabaseSession | null) {
    if (!session) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  },

  async signIn(email: string, password: string): Promise<SupabaseSession> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
    })
    const session = normalizeSession(await parse(res))
    this.save(session)
    return session
  },

  async signUp(email: string, password: string, name?: string): Promise<SupabaseSession | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email,
        password,
        data: { name: name || email.split('@')[0] },
      }),
    })
    const data = await parse(res)
    if (!data?.access_token) return null
    const session = normalizeSession(data)
    this.save(session)
    return session
  },

  async refresh(refreshToken: string): Promise<SupabaseSession> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const session = normalizeSession(await parse(res))
    this.save(session)
    return session
  },

  async getUser(accessToken: string): Promise<SupabaseAuthUser> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: headers(accessToken),
    })
    return await parse(res)
  },

  async signOut(accessToken?: string) {
    if (accessToken) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: headers(accessToken),
      }).catch(() => undefined)
    }
    this.save(null)
  },
}
