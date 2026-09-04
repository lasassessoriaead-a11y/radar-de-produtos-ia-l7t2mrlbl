import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_KEY = process.env.TIKTOK_SHOP_APP_KEY || ''
const APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
    if (!saved?.state || saved.state !== state || !saved.user_id || Date.now() - Number(saved.created_at || 0) > 10 * 60 * 1000) return done(res, false, 'Estado OAuth inválido ou expirado.')
    if (!APP_KEY || !APP_SECRET) return done(res, false, 'Credenciais TikTok Shop ainda não configuradas no servidor.')

    const qs = new URLSearchParams({ app_key: APP_KEY, app_secret: APP_SECRET, auth_code: code, grant_type: 'authorized_code' })
    const tokenRes = await fetch(`https://auth.tiktok-shops.com/api/v2/token/get?${qs.toString()}`)
    const token = await tokenRes.json().catch(() => null)
    if (!tokenRes.ok || token?.code !== 0 || !token?.data?.access_token) throw new Error(token?.message || 'Falha ao obter token do TikTok Shop.')
    const data = token.data
    if (Number(data.user_type) !== 1) throw new Error('A conta autorizada não foi reconhecida como Creator do TikTok Shop.')
    const granted = Array.isArray(data.granted_scopes) ? data.granted_scopes.map(String) : []
    const missing = REQUIRED.filter(s => !granted.includes(s))

    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Armazenamento seguro da conexão TikTok não está configurado.')
    const payload = {
      user_id: saved.user_id,
      platform: 'tiktok_shop',
      status: missing.length ? 'limited' : 'connected',
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      token_expires_at: data.access_token_expire_in ? new Date(Number(data.access_token_expire_in) * 1000).toISOString() : null,
      metadata: { open_id: data.open_id || null, user_type: Number(data.user_type), granted_scopes: granted, missing_scopes: missing, connected_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }
    const lookup = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_connections?user_id=eq.${encodeURIComponent(saved.user_id)}&platform=eq.tiktok_shop&select=id&limit=1`, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } })
    const rows = lookup.ok ? await lookup.json() : []
    const id = rows?.[0]?.id
    const url = id ? `${SUPABASE_URL}/rest/v1/marketplace_connections?id=eq.${id}` : `${SUPABASE_URL}/rest/v1/marketplace_connections`
    const save = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
    if (!save.ok) throw new Error(`Falha ao salvar conexão TikTok Shop (${save.status}).`)
    return done(res, true, missing.length ? `TikTok conectado, mas faltam permissões: ${missing.join(', ')}` : 'TikTok Shop Creator conectado com sucesso.')
  } catch (e: any) {
    return done(res, false, e?.message || 'Erro ao concluir autorização TikTok Shop.')
  }
}
