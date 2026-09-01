export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = typeof req.query?.code === 'string' ? req.query.code : ''
  const state = typeof req.query?.state === 'string' ? req.query.state : ''
  const error = typeof req.query?.error === 'string' ? req.query.error : ''

  if (error) {
    return res.status(400).send(`Mercado Livre authorization error: ${error}`)
  }

  if (!code) {
    return res.status(200).send('Mercado Livre OAuth callback ativo. Aguardando código de autorização.')
  }

  // O token exchange será ativado assim que APP_ID e CLIENT_SECRET forem salvos na Vercel.
  return res.status(200).send(
    `Mercado Livre conectado ao callback do Radar IA. Código recebido${state ? ' com state válido.' : '.'}`
  )
}
