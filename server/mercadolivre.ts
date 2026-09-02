import crypto from 'node:crypto'

export type MlSession = {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user_id?: number | string
  scope?: string
  token_type?: string
}

function key(secret: string) {
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptMlSession(payload: MlSession, secret: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(secret), iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decryptMlSession(value: string, secret: string): MlSession {
  const raw = Buffer.from(value, 'base64url')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(secret), iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  return JSON.parse(out)
}

export function readCookie(req: any, name: string) {
  const raw = String(req.headers?.cookie || '')
  const found = raw
    .split(';')
    .map((x: string) => x.trim())
    .find((x: string) => x.startsWith(name + '='))
  return found ? found.slice(name.length + 1) : ''
}

export function sessionCookie(value: string) {
  return `radar_ml_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=15552000`
}

export async function getMercadoLivreSession(req: any) {
  const appId = process.env.MERCADO_LIVRE_APP_ID
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET
  if (!appId || !clientSecret) {
    throw new Error('Credenciais do Mercado Livre não configuradas.')
  }

  const raw = readCookie(req, 'radar_ml_session')
  if (!raw) throw new Error('Mercado Livre não conectado.')

  let session = decryptMlSession(raw, clientSecret)
  let setCookie: string | undefined

  const expiresSoon = !session.expires_at || Date.now() >= Number(session.expires_at) - 60_000
  if (expiresSoon) {
    if (!session.refresh_token) throw new Error('Sessão do Mercado Livre expirada. Reconecte a conta.')

    const form = new URLSearchParams()
    form.set('grant_type', 'refresh_token')
    form.set('client_id', appId)
    form.set('client_secret', clientSecret)
    form.set('refresh_token', session.refresh_token)

    const rr = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    })
    const data = await rr.json().catch(() => ({}))
    if (!rr.ok || !data?.access_token) {
      throw new Error(data?.message || data?.error || 'Não foi possível renovar o acesso do Mercado Livre.')
    }

    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: Date.now() + Number(data.expires_in || 21600) * 1000,
      user_id: data.user_id || session.user_id,
      scope: data.scope || session.scope,
      token_type: data.token_type || session.token_type,
    }
    setCookie = sessionCookie(encryptMlSession(session, clientSecret))
  }

  return { session, setCookie }
}

export async function requireSupabaseUser(req: any) {
  const auth = String(req.headers?.authorization || '')
  if (!auth.startsWith('Bearer ')) throw new Error('Autenticação necessária no Radar.')

  const url = process.env.SUPABASE_URL || 'https://nqepcuktmbnjecjlemmh.supabase.co'
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_WwJyhBQ-6jt7QdBO6O86xg_MxsgbsNR'

  const rr = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: auth,
    },
  })
  const user = await rr.json().catch(() => ({}))
  if (!rr.ok || !user?.id) throw new Error('Sessão do Radar inválida.')
  return { user, auth, url, key }
}
