import { decryptMlSession, encryptMlSession, type MlSession } from '../../server/mercadolivre.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nqepcuktmbnjecjlemmh.supabase.co'
const BRIDGE = `${SUPABASE_URL}/functions/v1/mercadolivre-cron-bridge`

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

async function bridge(token: string, body: Record<string, unknown>) {
  const res = await fetch(BRIDGE, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Mercado Livre bridge HTTP ${res.status}`)
  return data
}

async function mlJson(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'RadarIA/1.0' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const err:any = new Error(data?.message || data?.error || `Mercado Livre HTTP ${res.status}`); err.status = res.status; throw err }
  return data
}

function isSkippableMlError(e:any){const m=String(e?.message||e||'').toLowerCase();return Number(e?.status)===404||m.includes('no winners found')||m.includes('not found')}

async function refreshSession(session: MlSession, clientSecret: string, appId: string) {
  if (session.expires_at && Date.now() < Number(session.expires_at) - 120_000) return { session, refreshed: false }
  if (!session.refresh_token) throw new Error('Sessão Mercado Livre sem refresh token.')
  const form = new URLSearchParams()
  form.set('grant_type', 'refresh_token'); form.set('client_id', appId); form.set('client_secret', clientSecret); form.set('refresh_token', session.refresh_token)
  const res = await fetch('https://api.mercadolibre.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form.toString() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.access_token) throw new Error(data?.message || data?.error || 'Falha ao renovar Mercado Livre.')
  return { refreshed: true, session: { access_token: data.access_token, refresh_token: data.refresh_token || session.refresh_token, expires_at: Date.now() + Number(data.expires_in || 21600) * 1000, user_id: data.user_id || session.user_id, scope: data.scope || session.scope, token_type: data.token_type || session.token_type } as MlSession }
}

function scoreCandidate(trendPosition: number, sold: number, price: number, competitors: number, freeShipping: boolean) {
  let score = 48
  score += Math.max(4, 28 - trendPosition * 1.7)
  if (sold >= 1000) score += 15; else if (sold >= 500) score += 12; else if (sold >= 100) score += 9; else if (sold >= 20) score += 5
  if (price >= 25 && price <= 600) score += 5
  if (freeShipping) score += 4
  if (competitors >= 80) score -= 5; else if (competitors > 0 && competitors <= 15) score += 4
  return clamp(Math.round(score), 0, 96)
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const oidc = String(req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN || '')
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET || ''
  const appId = process.env.MERCADO_LIVRE_APP_ID || ''
  const runId = crypto.randomUUID()
  let claimed = false

  try {
    if (!oidc) throw new Error('Vercel OIDC token ausente.')
    if (!clientSecret || !appId) throw new Error('Credenciais do Mercado Livre não configuradas.')
    const claim = await bridge(oidc, { mode: 'claim', run_id: runId })
    if (!claim?.allowed) return res.status(200).json({ success: true, skipped: true, reason: 'cooldown' })
    claimed = true
    const source = await bridge(oidc, { mode: 'connections', run_id: runId })
    const connections = Array.isArray(source?.connections) ? source.connections : []
    const allCandidates = new Map<string, any>()
    let trendKeywords = 0, skippedNoWinner = 0, skippedUpstream = 0

    for (const connection of connections) {
      if (!connection?.credentials_encrypted || !connection?.user_id) continue
      let session = decryptMlSession(String(connection.credentials_encrypted), clientSecret)
      const refreshed = await refreshSession(session, clientSecret, appId)
      session = refreshed.session
      if (refreshed.refreshed) await bridge(oidc, { mode: 'update_connection', run_id: runId, connection_id: connection.id, user_id: connection.user_id, credentials_encrypted: encryptMlSession(session, clientSecret) })

      const trends = await mlJson('https://api.mercadolibre.com/trends/MLB', session.access_token)
      const keywords = (Array.isArray(trends) ? trends : []).map((x: any) => String(x?.keyword || '').trim()).filter(Boolean).slice(0, 12)
      trendKeywords += keywords.length

      for (let trendIndex = 0; trendIndex < keywords.length; trendIndex++) {
        const keyword = keywords[trendIndex]
        let found:any
        try {
          const searchUrl = new URL('https://api.mercadolibre.com/products/search')
          searchUrl.searchParams.set('status', 'active'); searchUrl.searchParams.set('site_id', 'MLB'); searchUrl.searchParams.set('q', keyword); searchUrl.searchParams.set('limit', '2')
          found = await mlJson(searchUrl.toString(), session.access_token)
        } catch (e:any) { if (isSkippableMlError(e)) { skippedNoWinner++; continue } skippedUpstream++; continue }

        const catalog = Array.isArray(found?.results) ? found.results : []
        for (const product of catalog) {
          const catalogId = String(product?.id || '')
          if (!catalogId) continue
          let offers:any
          try { offers = await mlJson(`https://api.mercadolibre.com/products/${encodeURIComponent(catalogId)}/items?limit=20`, session.access_token) }
          catch (e:any) { if (isSkippableMlError(e)) { skippedNoWinner++; continue } skippedUpstream++; continue }
          const offerRows = Array.isArray(offers?.results) ? offers.results : []
          const candidates = offerRows.filter((x: any) => x?.item_id).slice(0, 2)
          let best: any = null
          for (const offer of candidates) {
            try {
              const item = await mlJson(`https://api.mercadolibre.com/items/${encodeURIComponent(String(offer.item_id))}`, session.access_token)
              if (!item?.id || !item?.permalink || Number(item?.price || 0) <= 0) continue
              if (!best || Number(item?.sold_quantity || 0) > Number(best?.sold_quantity || 0)) best = item
            } catch (e:any) { if (isSkippableMlError(e)) skippedNoWinner++; else skippedUpstream++ }
          }
          if (!best) continue
          const price = Number(best.price || 0), sold = Number(best.sold_quantity || 0), competitors = Number(offers?.paging?.total || offerRows.length || 0)
          const proactiveScore = scoreCandidate(trendIndex + 1, sold, price, competitors, Boolean(best?.shipping?.free_shipping))
          if (proactiveScore < 65) continue
          const externalId = String(best.id)
          const row = { user_id: connection.user_id, niche_key: String(product?.domain_id || best?.category_id || 'mercadolivre_trends').toLowerCase(), search_query: keyword, external_id: externalId, title: String(best.title || product?.name || keyword), image_url: String(best?.pictures?.[0]?.secure_url || best?.thumbnail || '').replace(/^http:/, 'https:'), product_url: String(best.permalink), affiliate_url: null, price, commission_rate: 0, commission_amount: 0, sales_count: sold, rating: 0, base_score: proactiveScore, niche_confidence: 0, proactive_score: proactiveScore, reason: { source: 'mercadolivre_trends_api', trend_keyword: keyword, trend_position: trendIndex + 1, catalog_product_id: catalogId, competitors, free_shipping: Boolean(best?.shipping?.free_shipping), conversion_learning_enabled: false, affiliate_link_required_after_selection: true, autonomous_prepare_enabled: false } }
          const key = `${connection.user_id}:${externalId}`
          const previous = allCandidates.get(key)
          if (!previous || Number(previous.proactive_score || 0) < proactiveScore) allCandidates.set(key, row)
        }
      }
    }

    const candidates = [...allCandidates.values()].sort((a, b) => Number(b.proactive_score) - Number(a.proactive_score)).slice(0, Math.max(10, connections.length * 20))
    const saved = await bridge(oidc, { mode: 'ingest', run_id: runId, candidates })
    claimed = false
    return res.status(200).json({ success: true, connections: connections.length, trend_keywords: trendKeywords, candidates: candidates.length, saved: Number(saved?.saved || 0), skipped_no_winner: skippedNoWinner, skipped_upstream: skippedUpstream, source: 'mercadolivre_trends_api' })
  } catch (err: any) {
    const message = String(err?.message || err || 'Falha desconhecida.')
    if (claimed) { try { await bridge(oidc, { mode: 'fail', run_id: runId, error: message, stage: 'mercadolivre_trends' }) } catch {} }
    return res.status(500).json({ success: false, error: message })
  }
}
