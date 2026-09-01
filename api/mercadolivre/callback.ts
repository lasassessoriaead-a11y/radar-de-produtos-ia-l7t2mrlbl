export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')

  const code = typeof req.query?.code === 'string' ? req.query.code : ''
  const state = typeof req.query?.state === 'string' ? req.query.state : ''
  const error = typeof req.query?.error === 'string' ? req.query.error : ''

  const base = 'https://radar-de-produtos-ia-l7t2mrlbl.vercel.app/configuracoes'

  if (error) {
    return res.redirect(`${base}?ml_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return res.status(200).send('Callback do Mercado Livre ativo.')
  }

  return res.redirect(
    `${base}?ml_code=${encodeURIComponent(code)}&ml_state=${encodeURIComponent(state)}`
  )
}
