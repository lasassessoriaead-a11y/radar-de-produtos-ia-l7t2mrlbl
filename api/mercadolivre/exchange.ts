export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appId = process.env.MERCADO_LIVRE_APP_ID
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET
  const redirectUri =
    process.env.MERCADO_LIVRE_REDIRECT_URI ||
    'https://radar-de-produtos-ia-l7t2mrlbl.vercel.app/api/mercadolivre/callback'

  if (!appId || !clientSecret) {
    return res.status(503).json({
      error: 'Credenciais do Mercado Livre ainda não configuradas na Vercel.',
      configured: false,
    })
  }

  const { code, code_verifier } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Código de autorização ou PKCE ausente.' })
  }

  const form = new URLSearchParams()
  form.set('grant_type', 'authorization_code')
  form.set('client_id', appId)
  form.set('client_secret', clientSecret)
  form.set('code', String(code))
  form.set('redirect_uri', redirectUri)
  form.set('code_verifier', String(code_verifier))

  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form.toString(),
  })
  const token = await tokenRes.json().catch(() => ({}))

  if (!tokenRes.ok) {
    return res.status(tokenRes.status).json({
      error: token?.message || token?.error || 'Falha ao obter token do Mercado Livre.',
      details: token,
    })
  }

  // Por segurança, o refresh token não é devolvido em texto para a interface.
  // A persistência segura será ativada no backend após as credenciais serem configuradas.
  return res.status(200).json({
    success: true,
    access_token: token.access_token,
    expires_in: token.expires_in,
    user_id: token.user_id,
    scope: token.scope,
    token_type: token.token_type,
    refresh_token_received: Boolean(token.refresh_token),
  })
}
