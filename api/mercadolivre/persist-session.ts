import { encryptMlSession, getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const secret = process.env.MERCADO_LIVRE_CLIENT_SECRET
    const appId = process.env.MERCADO_LIVRE_APP_ID
    if (!secret || !appId) {
      return res.status(200).json({ success: false, configured: false, persisted: false })
    }

    let sessionData: any
    let setCookie: string | undefined
    try {
      const out = await getMercadoLivreSession(req)
      sessionData = out.session
      setCookie = out.setCookie
    } catch (err: any) {
      if (/não conectado/i.test(String(err?.message || ''))) {
        return res.status(200).json({ success: true, configured: true, connected: false, persisted: false })
      }
      throw err
    }

    if (setCookie) res.setHeader('Set-Cookie', setCookie)
    const encrypted = encryptMlSession(sessionData, secret)
    const masked = appId.length <= 6 ? appId : `${appId.slice(0, 3)}***${appId.slice(-3)}`
    const now = new Date().toISOString()

    const save = await fetch(`${url}/rest/v1/marketplace_connections?on_conflict=user_id,marketplace`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: auth,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: user.id,
        marketplace: 'mercadolivre',
        mode: 'official_api',
        manual_enabled: true,
        api_status: 'connected',
        app_id_masked: masked,
        credentials_encrypted: encrypted,
        status_message: 'Mercado Livre conectado e apto para o Hunter Proativo.',
        last_tested_at: now,
        metadata: {
          ml_user_id: sessionData.user_id || null,
          scope: sessionData.scope || null,
          proactive_discovery: true,
          credential_storage: 'aes-256-gcm',
        },
        updated_at: now,
      }),
    })
    const rows = await save.json().catch(() => ([]))
    if (!save.ok) {
      return res.status(save.status).json({
        error: Array.isArray(rows) ? 'Falha ao persistir sessão do Mercado Livre.' : rows?.message || 'Falha ao persistir sessão do Mercado Livre.',
      })
    }

    return res.status(200).json({
      success: true,
      configured: true,
      connected: true,
      persisted: true,
      connection: Array.isArray(rows) ? rows[0] : rows,
    })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível persistir a sessão do Mercado Livre.' })
  }
}
