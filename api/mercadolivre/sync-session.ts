import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const { session, setCookie } = await getMercadoLivreSession(req)
    if (setCookie) res.setHeader('Set-Cookie', setCookie)

    const meRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    })
    const me = await meRes.json().catch(() => ({}))
    if (!meRes.ok || !me?.id) {
      return res.status(401).json({ error: me?.message || 'Sessão do Mercado Livre inválida.' })
    }

    const secret = process.env.MERCADO_LIVRE_CLIENT_SECRET
    if (!secret) return res.status(503).json({ error: 'Mercado Livre não configurado.' })

    const { encryptMlSession } = await import('../../server/mercadolivre.js')
    const encrypted = encryptMlSession(session, secret)
    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      marketplace: 'mercadolivre',
      mode: 'official_api',
      manual_enabled: false,
      api_status: 'connected',
      credentials_encrypted: encrypted,
      status_message: 'Mercado Livre conectado e disponível para o Hunter Proativo.',
      last_tested_at: now,
      metadata: {
        ml_user_id: String(me.id),
        nickname: String(me.nickname || ''),
        country_id: String(me.country_id || ''),
        scope: String(session.scope || ''),
        autonomous_hunter_enabled: true,
        persisted_at: now,
      },
      updated_at: now,
    }

    const save = await fetch(`${url}/rest/v1/marketplace_connections?on_conflict=user_id,marketplace`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: auth,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    })
    const rows = await save.json().catch(() => ([]))
    if (!save.ok) {
      return res.status(save.status).json({ error: rows?.message || 'Falha ao persistir conexão do Mercado Livre.' })
    }

    return res.status(200).json({
      success: true,
      connected: true,
      persisted: true,
      user_id: me.id,
      nickname: me.nickname || '',
      connection: Array.isArray(rows) ? rows[0] : rows,
    })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível sincronizar a sessão do Mercado Livre.' })
  }
}
