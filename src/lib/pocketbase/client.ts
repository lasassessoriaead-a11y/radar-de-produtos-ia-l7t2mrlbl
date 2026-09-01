type AuthRecord = {
  id: string
  email?: string
  name?: string
  [key: string]: unknown
}

type SessionPayload = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
}

type ChangeListener = (token: string, record: AuthRecord | null) => void

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const STORAGE_KEY = 'radar_supabase_session'

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
}

function normalizeRecord<T extends Record<string, any>>(row: T): T {
  if (!row) return row
  return {
    ...row,
    created: row.created ?? row.created_at,
    updated: row.updated ?? row.updated_at ?? row.created_at,
    collectionId: row.collectionId ?? '',
    collectionName: row.collectionName ?? '',
  }
}

function cleanWritePayload(data: Record<string, any>) {
  const {
    collectionId,
    collectionName,
    created,
    updated,
    expand,
    ...rest
  } = data || {}
  return rest
}

function mapSort(sort?: string) {
  if (!sort) return ''
  return sort
    .split(',')
    .map((part) => {
      const p = part.trim()
      if (!p) return ''
      const desc = p.startsWith('-')
      const field = (desc ? p.slice(1) : p).replace(/^created$/, 'created_at').replace(/^updated$/, 'updated_at')
      return `${field}.${desc ? 'desc' : 'asc'}`
    })
    .filter(Boolean)
    .join(',')
}

function applyFilter(params: URLSearchParams, raw?: string) {
  if (!raw?.trim()) return
  const filter = raw.trim()

  // Common PocketBase OR search: field ~ "term" || field2 ~ "term"
  if (filter.includes('||')) {
    const ors = filter
      .split('||')
      .map((piece) => piece.trim())
      .map((piece) => {
        const like = piece.match(/^([a-zA-Z0-9_]+)\s*~\s*["'](.+?)["']$/)
        if (like) return `${like[1]}.ilike.*${like[2].replace(/[,()]/g, '')}*`
        const eq = piece.match(/^([a-zA-Z0-9_]+)\s*=\s*["'](.+?)["']$/)
        if (eq) return `${eq[1]}.eq.${eq[2].replace(/[,()]/g, '')}`
        return ''
      })
      .filter(Boolean)
    if (ors.length) params.set('or', `(${ors.join(',')})`)
    return
  }

  // Common AND filters.
  const pieces = filter.split('&&').map((p) => p.trim())
  for (const piece of pieces) {
    let m = piece.match(/^([a-zA-Z0-9_]+)\s*=\s*["'](.+?)["']$/)
    if (m) {
      params.set(m[1], `eq.${m[2]}`)
      continue
    }
    m = piece.match(/^([a-zA-Z0-9_]+)\s*=\s*(true|false)$/i)
    if (m) {
      params.set(m[1], `eq.${m[2].toLowerCase()}`)
      continue
    }
    m = piece.match(/^([a-zA-Z0-9_]+)\s*~\s*["'](.+?)["']$/)
    if (m) {
      params.set(m[1], `ilike.*${m[2]}*`)
      continue
    }
    m = piece.match(/^([a-zA-Z0-9_]+)\s*(>=|<=|>|<)\s*([0-9.]+)$/)
    if (m) {
      const op = m[2] === '>=' ? 'gte' : m[2] === '<=' ? 'lte' : m[2] === '>' ? 'gt' : 'lt'
      params.set(m[1], `${op}.${m[3]}`)
    }
  }
}

class SupabaseCompatClient {
  private listeners = new Set<ChangeListener>()
  private _token = ''
  private _record: AuthRecord | null = null
  private _refreshToken = ''

  constructor() {
    this.restoreSession()
  }

  autoCancellation(_value: boolean) {}

  private restoreSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const session = JSON.parse(raw)
      this._token = session.access_token || ''
      this._refreshToken = session.refresh_token || ''
      this._record = session.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          }
        : null
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  private persistSession(session: SessionPayload | null) {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY)
      this._token = ''
      this._refreshToken = ''
      this._record = null
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      this._token = session.access_token || ''
      this._refreshToken = session.refresh_token || ''
      this._record = {
        id: session.user.id,
        email: session.user.email,
        name:
          (session.user.user_metadata?.name as string | undefined) ||
          session.user.email?.split('@')[0],
      }
    }
    this.listeners.forEach((fn) => fn(this._token, this._record))
  }

  private headers(extra?: HeadersInit) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${this._token || SUPABASE_KEY}`,
      ...extra,
    }
  }

  private async authRequest(path: string, body: Record<string, unknown>) {
    ensureConfigured()
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload?.msg || payload?.message || payload?.error_description || 'Falha de autenticação')
    }
    return payload
  }

  auth = {
    signUp: async (email: string, password: string, name?: string) => {
      const payload = await this.authRequest('signup', {
        email,
        password,
        data: name ? { name } : {},
      })
      if (payload.access_token) this.persistSession(payload as SessionPayload)
      return payload
    },
  }

  authStore = {
    get token() {
      return client._token
    },
    get record() {
      return client._record
    },
    get isValid() {
      return Boolean(client._token && client._record)
    },
    clear: () => this.persistSession(null),
    onChange: (fn: ChangeListener) => {
      this.listeners.add(fn)
      return () => this.listeners.delete(fn)
    },
  }

  collection<T extends Record<string, any> = Record<string, any>>(name: string) {
    const request = async (
      method: string,
      params = new URLSearchParams(),
      body?: Record<string, any>,
      prefer?: string,
    ) => {
      ensureConfigured()
      const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(name)}${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url, {
        method,
        headers: this.headers({
          'Content-Type': 'application/json',
          ...(prefer ? { Prefer: prefer } : {}),
        }),
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.message || payload?.hint || `Erro Supabase HTTP ${res.status}`)
      }
      if (res.status === 204) return { data: null, total: 0 }
      const data = await res.json().catch(() => null)
      const range = res.headers.get('content-range')
      const total = range?.includes('/') ? Number(range.split('/')[1]) || 0 : Array.isArray(data) ? data.length : 0
      return { data, total }
    }

    return {
      authWithPassword: async (email: string, password: string) => {
        const payload = (await this.authRequest('token?grant_type=password', {
          email,
          password,
        })) as SessionPayload
        this.persistSession(payload)
        return payload
      },

      getList: async (
        page = 1,
        perPage = 30,
        options: { filter?: string; sort?: string; expand?: string } = {},
      ) => {
        const params = new URLSearchParams()
        params.set('select', '*')
        applyFilter(params, options.filter)
        const order = mapSort(options.sort)
        if (order) params.set('order', order)
        const from = Math.max(0, (page - 1) * perPage)
        const to = from + perPage - 1
        params.set('offset', String(from))
        params.set('limit', String(perPage))
        const { data, total } = await request('GET', params, undefined, 'count=exact')
        const items = (Array.isArray(data) ? data : []).map(normalizeRecord) as T[]
        return {
          page,
          perPage,
          totalItems: total,
          totalPages: perPage > 0 ? Math.ceil(total / perPage) : 1,
          items,
        }
      },

      getFullList: async (options: { filter?: string; sort?: string } = {}) => {
        const params = new URLSearchParams()
        params.set('select', '*')
        applyFilter(params, options.filter)
        const order = mapSort(options.sort)
        if (order) params.set('order', order)
        params.set('limit', '1000')
        const { data } = await request('GET', params)
        return (Array.isArray(data) ? data : []).map(normalizeRecord) as T[]
      },

      getOne: async (id: string) => {
        const params = new URLSearchParams()
        params.set('select', '*')
        params.set('id', `eq.${id}`)
        params.set('limit', '1')
        const { data } = await request('GET', params)
        const row = Array.isArray(data) ? data[0] : null
        if (!row) throw new Error('Registro não encontrado')
        return normalizeRecord(row) as T
      },

      create: async (data: Partial<T>) => {
        const payload: Record<string, any> = cleanWritePayload(data as Record<string, any>)
        if (this._record?.id && !payload.user_id) payload.user_id = this._record.id
        const { data: rows } = await request(
          'POST',
          new URLSearchParams(),
          payload,
          'return=representation',
        )
        const row = Array.isArray(rows) ? rows[0] : rows
        return normalizeRecord(row) as T
      },

      update: async (id: string, data: Partial<T>) => {
        const params = new URLSearchParams()
        params.set('id', `eq.${id}`)
        const payload = cleanWritePayload(data as Record<string, any>)
        delete payload.user_id
        const { data: rows } = await request('PATCH', params, payload, 'return=representation')
        const row = Array.isArray(rows) ? rows[0] : rows
        return normalizeRecord(row) as T
      },

      delete: async (id: string) => {
        const params = new URLSearchParams()
        params.set('id', `eq.${id}`)
        await request('DELETE', params)
        return true
      },

      subscribe: async (
        _topic: string,
        _callback: (event: { action: string; record: T }) => void,
      ) => {
        // Realtime will be ported after the core CRUD/auth cutover.
        return async () => {}
      },
    }
  }
}

const client = new SupabaseCompatClient()

export default client
