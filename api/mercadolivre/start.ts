import crypto from 'node:crypto'

function base64url(input: Buffer) {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.MERCADO_LIVRE_APP_ID
  const redirectUri =
    process.env.MERCADO_LIVRE_REDIRECT_URI ||
    'https://radar-de-produtos-ia-l7t2mrlbl.vercel.app/api/mercadolivre/callback'

  if (!appId) {
    return res.status(503).json({
      error: 'MERCADO_LIVRE_APP_ID não configurado na Vercel.',
      configured: false,
    })
  }

  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  const state = base64url(crypto.randomBytes(24))

  const auth = new URL('https://auth.mercadolivre.com.br/authorization')
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('client_id', appId)
  auth.searchParams.set('redirect_uri', redirectUri)
  auth.searchParams.set('code_challenge', challenge)
  auth.searchParams.set('code_challenge_method', 'S256')
  auth.searchParams.set('state', state)

  return res.status(200).json({
    configured: true,
    authorization_url: auth.toString(),
    state,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  })
}
