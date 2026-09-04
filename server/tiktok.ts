import crypto from 'node:crypto'

export const TIKTOK_APP_KEY = process.env.TIKTOK_SHOP_APP_KEY || ''
export const TIKTOK_APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET || ''
export const TIKTOK_API_BASE = 'https://open-api.tiktokglobalshop.com'

function keyMaterial() {
  if (!TIKTOK_APP_SECRET) throw new Error('TikTok Shop App Secret não configurado no servidor.')
  return crypto.createHash('sha256').update(TIKTOK_APP_SECRET).digest()
}

export function encryptCredentials(value: object) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial(), iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decryptCredentials<T = any>(value: string): T {
  const raw = Buffer.from(value, 'base64url')
  if (raw.length < 29) throw new Error('Credenciais TikTok inválidas.')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial(), iv)
  decipher.setAuthTag(tag)
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as T
}

export function signTikTokRequest(path: string, params: Record<string, string | number>, bodyText = '') {
  if (!TIKTOK_APP_SECRET) throw new Error('TikTok Shop App Secret não configurado no servidor.')
  const paramString = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'access_token')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  const signString = `${TIKTOK_APP_SECRET}${path}${paramString}${bodyText}${TIKTOK_APP_SECRET}`
  return crypto.createHmac('sha256', TIKTOK_APP_SECRET).update(signString).digest('hex')
}

export async function callTikTokCreatorApi(opts: {
  path: string
  accessToken: string
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | undefined>
  body?: any
}) {
  if (!TIKTOK_APP_KEY) throw new Error('TikTok Shop App Key não configurada no servidor.')
  const method = opts.method || 'POST'
  const timestamp = Math.floor(Date.now() / 1000)
  const query: Record<string, string | number> = { app_key: TIKTOK_APP_KEY, timestamp }
  for (const [k, v] of Object.entries(opts.query || {})) if (v !== undefined && v !== '') query[k] = v
  const bodyText = opts.body && method !== 'GET' ? JSON.stringify(opts.body) : ''
  const sign = signTikTokRequest(opts.path, query, bodyText)
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(query).map(([k,v]) => [k, String(v)])), sign })
  const res = await fetch(`${TIKTOK_API_BASE}${opts.path}?${qs.toString()}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-tts-access-token': opts.accessToken },
    body: bodyText || undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.code !== 0) throw new Error(data?.message || `TikTok Shop API falhou (${res.status}).`)
  return data
}
