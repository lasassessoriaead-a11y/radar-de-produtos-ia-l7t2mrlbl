import type { VercelRequest, VercelResponse } from '@vercel/node'
import { TIKTOK_APP_KEY, TIKTOK_APP_SECRET, encryptCredentials } from '../../server/tiktok'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const COOKIE = 'radar_tiktok_creator_oauth'
const REQUIRED = ['creator.affiliate.info', 'creator.affiliate_collaboration.read', 'creator.affiliate.share_link.read', 'creator.affiliate.link.write']

function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => { const i=v.indexOf('='); return [v.slice(0,i), v.slice(i+1)] }))
}
function decode(value: string) { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) }
function done(res: VercelResponse, ok: boolean, message: string) {
  const target = `/?tiktok_oauth=${ok ? 'success' : 'error'}&message=${encodeURIComponent(message)}`
  return res.redirect(302, target)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Método não permitido.')
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  try {
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')
    const error = String(req.query.error || '')
    if (error || !code) return done(res, false, 'Autorização TikTok Shop cancelada ou não concluída.')

    const raw = cookies(String(req.headers.cookie || ''))[COOKIE]
    if (!raw) return done(res, false, 'Sessão de autorização expirada. Inicie a conexão novamente no Radar.')
    const saved = decode(raw)
    if (!saved?.state || saved.state !== state || !saved.user_id || !saved.auth_token || Date.now() - Number(saved.created_at || 0) > 10 * 60 * 1000) return done(res, false, 'Estado OAuth inválido ou expirado.')
    if (!TIKTOK_APP_KEY || !TIKTOK_APP_SECRET) return done(res, false, 'Credenciais TikTok Shop ainda não configuradas no servidor.')
    if (!SUPABASE_URL || !SUPABASE_KEY) return done(res, false, 'Supabase ainda não está configurado no servidor.')

    const verify = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${saved.auth_token}` } })
    const verifiedUser = verify.ok ? await verify.json() : null
    if (!verifiedUser?.id || verifiedUser.id !== saved.user_id) return done(res, false, 'Sessão do Radar inválida ou expirada.')

    const qs = new URLSearchParams({ app_key: TIKTOK_APP_KEY, app_secret: TIKTOK_APP_SECRET, auth_code: code, grant_type: 'authorized_code' })
    const tokenRes = await fetch(`https://auth.tiktok-shops.com/api/v2/token/get?${qs.toString()}`)
    const token = await tokenRes.json().catch(() => null)
    if (!tokenRes.ok || token?.code !== 0 || !token?.data?.access_token) throw new Error(token?.message || 'Falha ao obter token do TikTok Shop.')
    const data = token.data
    if (Number(data.user_type) !== 1) throw new Error('A conta autorizada não foi reconhecida como Creator do TikTok Shop.')
    const granted = Array.isArray(data.granted_scopes) ? data.granted_scopes.map(String) : []
    const missing = REQUIRED.filter(s => !granted.includes(s))

    const credentials = encryptCredentials({ access_token: data.access_token, refresh_token: data.refresh_token || null, access_token_expire_in: data.access_token_expire_in || null, refresh_token_expire_in: data.refresh_token_expire_in || null })
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${saved.auth_token}`, 'Content-Type': 'application/json' }
    const lookup = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_connections?user_id=eq.${encodeURIComponent(saved.user_id)}&marketplace=eq.tiktok_shop&select=id&limit=1`, { headers })
    const rows = lookup.ok ? await lookup.json() : []
    const id = rows?.[0]?.id
    const payload = {
      user_id: saved.user_id,
      marketplace: 'tiktok_shop',
      mode: 'api',
      manual_enabled: true,
      api_status: missing.length ? 'limited' : 'connected',
      app_id_masked: TIKTOK_APP_KEY.length > 6 ? `${TIKTOK_APP_KEY.slice(0,3)}***${TIKTOK_APP_KEY.slice(-3)}` : 'configured',
      credentials_encrypted: credentials,
      status_message: missing.length ? `Conectado com permissões pendentes: ${missing.join(', ')}` : 'TikTok Shop Creator conectado.',
      last_tested_at: new Date().toISOString(),
      metadata: { open_id: data.open_id || null, user_type: Number(data.user_type), granted_scopes: granted, missing_scopes: missing, connected_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }
    const url = id ? `${SUPABASE_URL}/rest/v1/marketplace_connections?id=eq.${id}` : `${SUPABASE_URL}/rest/v1/marketplace_connections`
    const save = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
    if (!save.ok) throw new Error(`Falha ao salvar conexão TikTok Shop (${save.status}).`)
    return done(res, true, missing.length ? `TikTok conectado, mas faltam permissões: ${missing.join(', ')}` : 'TikTok Shop Creator conectado com sucesso.')
  } catch (e: any) {
    return done(res, false, e?.message || 'Erro ao concluir autorização TikTok Shop.')
  }
}
