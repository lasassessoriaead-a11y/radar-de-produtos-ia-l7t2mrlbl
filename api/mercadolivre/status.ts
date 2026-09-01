import crypto from 'node:crypto'

function key(secret: string) {
  return crypto.createHash('sha256').update(secret).digest()
}

function decrypt(value: string, secret: string) {
  const raw = Buffer.from(value, 'base64url')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(secret), iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  return JSON.parse(out)
}

function cookie(req: any, name: string) {
  const raw = String(req.headers.cookie || '')
  const found = raw.split(';').map((x: string) => x.trim()).find((x: string) => x.startsWith(name + '='))
  return found ? found.slice(name.length + 1) : ''
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.MERCADO_LIVRE_CLIENT_SECRET
  const appId = process.env.MERCADO_LIVRE_APP_ID
  if (!secret || !appId) return res.status(200).json({ configured: false, connected: false })

  const value = cookie(req, 'radar_ml_session')
  if (!value) return res.status(200).json({ configured: true, connected: false })

  try {
    const session = decrypt(value, secret)
    const meRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!meRes.ok) {
      return res.status(200).json({
        configured: true,
        connected: false,
        expired: Date.now() >= Number(session.expires_at || 0),
      })
    }
    const me = await meRes.json().catch(() => ({}))
    return res.status(200).json({
      configured: true,
      connected: true,
      user_id: me.id || session.user_id,
      nickname: me.nickname || '',
      country_id: me.country_id || '',
      expires_at: session.expires_at,
      scope: session.scope || '',
    })
  } catch {
    return res.status(200).json({ configured: true, connected: false })
  }
}
