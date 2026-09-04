import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre'
import { TIKTOK_APP_KEY } from '../../server/tiktok'

const COOKIE = 'radar_tiktok_creator_oauth'

function encode(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Método não permitido.' })
  try {
    const session = await requireSupabaseUser(req)
    if (!TIKTOK_APP_KEY) return res.status(503).json({ success: false, error: 'TikTok Shop App Key ainda não configurada no servidor.' })

    const state = crypto.randomBytes(32).toString('hex')
    const authToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const value = encode({ state, user_id: session.user.id, auth_token: authToken, created_at: Date.now() })
    res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/api/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
    const authorization_url = `https://shop.tiktok.com/alliance/creator/auth?app_key=${encodeURIComponent(TIKTOK_APP_KEY)}&state=${encodeURIComponent(state)}`
    return res.status(200).json({ success: true, authorization_url })
  } catch (error: any) {
    return res.status(error?.status || 500).json({ success: false, error: error?.message || 'Não foi possível iniciar a autorização do TikTok Shop.' })
  }
}
