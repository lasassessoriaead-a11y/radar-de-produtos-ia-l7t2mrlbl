type YoutubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const key = process.env.YOUTUBE_API_KEY

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      provider: 'youtube',
      provider_name: 'YouTube',
      is_configured: Boolean(key),
      status: key ? 'active' : 'pending_integration',
      status_label: key ? 'Ativo' : 'Aguardando credencial',
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!key) {
    return res.status(200).json({
      provider: 'youtube',
      provider_name: 'YouTube',
      status: 'credentials_required',
      status_label: 'Credencial ausente',
      is_connected: false,
      message: 'YOUTUBE_API_KEY ainda não está disponível no ambiente da Vercel.',
      total_found: 0,
      signals: [],
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const query = String(body.query || body.product_title || body.category || '').trim()
  const limit = Math.max(1, Math.min(10, Number(body.limit || 10)))
  if (!query) return res.status(400).json({ error: 'Informe um termo ou produto para pesquisar.' })

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('key', key)
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('q', `${query} review vale a pena`) 
  endpoint.searchParams.set('maxResults', String(limit))
  endpoint.searchParams.set('regionCode', 'BR')
  endpoint.searchParams.set('relevanceLanguage', 'pt')
  endpoint.searchParams.set('safeSearch', 'moderate')

  const response = await fetch(endpoint)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return res.status(200).json({
      provider: 'youtube',
      provider_name: 'YouTube',
      status: 'api_error',
      status_label: 'Erro da API',
      is_connected: true,
      message: data?.error?.message || 'Falha na consulta do YouTube.',
      total_found: 0,
      signals: [],
    })
  }

  const signals = ((data.items || []) as YoutubeSearchItem[])
    .filter((item) => item.id?.videoId && item.snippet?.title)
    .map((item) => ({
      external_id: `youtube:${item.id!.videoId}`,
      title: String(item.snippet?.title || ''),
      snippet: String(item.snippet?.description || ''),
      community: String(item.snippet?.channelTitle || 'YouTube'),
      author_display: String(item.snippet?.channelTitle || ''),
      source_url: `https://www.youtube.com/watch?v=${item.id!.videoId}`,
      published_at: item.snippet?.publishedAt || null,
      upvotes: 0,
      comments_count: 0,
      raw_metadata: { video_id: item.id!.videoId, query },
    }))

  return res.status(200).json({
    provider: 'youtube',
    provider_name: 'YouTube',
    status: 'ok',
    status_label: 'Busca real concluída',
    is_connected: true,
    message: `${signals.length} sinais públicos encontrados no YouTube.`,
    total_found: signals.length,
    signals,
    data_usage: 'market_intent_analysis_only',
    outreach_allowed: false,
  })
}
