export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX
  if (!key || !cx) {
    return res.status(500).json({
      provider: 'google_search',
      provider_name: 'Google Search',
      status: 'credentials_required',
      status_label: 'Credenciais ausentes',
      is_connected: false,
      message: 'GOOGLE_SEARCH_API_KEY e GOOGLE_SEARCH_CX ainda não estão disponíveis no ambiente da Vercel.',
      total_found: 0,
      signals: [],
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const query = String(body.query || body.product_title || body.category || '').trim()
  const limit = Math.max(1, Math.min(20, Number(body.limit || 10)))
  if (!query) return res.status(400).json({ error: 'Informe um termo ou produto para pesquisar.' })

  const intents = [
    query,
    '"' + query + '" vale a pena',
    '"' + query + '" review',
    '"' + query + '" melhor preço',
    '"' + query + '" problema OR reclamação',
  ]

  const collected: any[] = []
  for (const q of intents.slice(0, 3)) {
    const endpoint = new URL('https://www.googleapis.com/customsearch/v1')
    endpoint.searchParams.set('key', key)
    endpoint.searchParams.set('cx', cx)
    endpoint.searchParams.set('q', q)
    endpoint.searchParams.set('num', String(Math.min(10, limit)))
    endpoint.searchParams.set('hl', 'pt-BR')
    endpoint.searchParams.set('gl', 'br')

    const rr = await fetch(endpoint.toString())
    const data = await rr.json().catch(() => ({}))
    if (!rr.ok) {
      return res.status(200).json({
        provider: 'google_search',
        provider_name: 'Google Search',
        status: 'api_error',
        status_label: 'Erro da API',
        is_connected: true,
        message: data?.error?.message || 'Falha na consulta do Google Search.',
        total_found: 0,
        signals: [],
      })
    }

    for (const item of data.items || []) {
      let community = ''
      try { community = new URL(item.link).hostname } catch {}
      collected.push({
        external_id: String(item.cacheId || item.link || crypto.randomUUID()),
        title: String(item.title || ''),
        snippet: String(item.snippet || ''),
        community,
        source_url: String(item.link || ''),
        published_at: null,
        upvotes: 0,
        comments_count: 0,
        raw_metadata: { displayLink: item.displayLink || '', query: q },
      })
    }
    if (collected.length >= limit) break
  }

  const seen = new Set<string>()
  const signals = collected.filter((x) => {
    const k = x.source_url || x.title
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, limit)

  return res.status(200).json({
    provider: 'google_search',
    provider_name: 'Google Search',
    status: 'ok',
    status_label: 'Busca real concluída',
    is_connected: true,
    message: signals.length + ' sinais públicos encontrados.',
    total_found: signals.length,
    signals,
  })
}
