import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre.js'

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

// Shopee is stricter than our internal tags. Keep Sub IDs compact and
// alphanumeric only so campaign UUIDs / separators never reach the API.
function cleanSubId(value: any, fallback: string) {
  const normalized = String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return (normalized || fallback.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'radar').slice(0, 24)
}

async function shopeeGraphql(query: string) {
  const appId = String(process.env.SHOPEE_AFFILIATE_APP_ID || '').trim()
  const secret = String(process.env.SHOPEE_AFFILIATE_SECRET || '').trim()
  if (!appId || !secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')
  const payload = JSON.stringify({ query })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex')
  const rr = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
  })
  const data = await rr.json().catch(() => ({}))
  if (!rr.ok) throw new Error(data?.message || `Shopee respondeu HTTP ${rr.status}.`)
  if (Array.isArray(data?.errors) && data.errors.length) {
    const e = data.errors[0]
    throw new Error(e?.extensions?.message || e?.message || 'Erro ao gerar link rastreável na Shopee.')
  }
  return data?.data || {}
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const productId = String(body.product_id || '').trim()
    if (!productId) return res.status(400).json({ error: 'Produto obrigatório.' })

    const headers = { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }
    const pr = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers })
    const rows = await pr.json().catch(() => ([]))
    const product = Array.isArray(rows) ? rows[0] : null
    if (!pr.ok || !product) return res.status(404).json({ error: 'Produto não encontrado no Radar.' })
    if (String(product.platform || '').toLowerCase() !== 'shopee') return res.status(400).json({ error: 'Sub IDs da Shopee só podem ser gerados para produtos Shopee.' })

    // Prefer the original product URL. A previously generated affiliate short URL
    // remains only as a fallback and is never rewritten in the product record.
    const originUrl = String(product.product_url || product.affiliate_url || '').trim()
    if (!originUrl) return res.status(400).json({ error: 'Produto sem URL da Shopee.' })

    const externalId = String(product.metadata?.external_id || productId.slice(0, 8))
    const channel = cleanSubId(body.channel, 'radar')
    const campaignTag = cleanSubId(body.campaign_id ? `c${String(body.campaign_id).slice(0, 12)}` : 'cmanual', 'cmanual')
    const variationTag = cleanSubId(body.variation_id ? `v${String(body.variation_id).slice(0, 12)}` : 'vbase', 'vbase')
    const creativeTag = cleanSubId(body.creative_id ? `cr${String(body.creative_id).slice(0, 12)}` : 'crbase', 'crbase')
    const productTag = cleanSubId(`p${externalId}`, 'pradar')
    const subIds = [productTag, campaignTag, channel, variationTag, creativeTag]

    const mutation = `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(originUrl)}, subIds: [${subIds.map((s) => JSON.stringify(s)).join(', ')}] }) { shortLink } }`
    const data = await shopeeGraphql(mutation)
    const shortLink = String(data?.generateShortLink?.shortLink || '').trim()
    if (!shortLink) throw new Error('A Shopee não retornou o link curto rastreável.')

    const slug = `shp-${crypto.randomBytes(5).toString('hex')}`
    const trackingPayload = {
      user_id: user.id,
      slug,
      title: `${product.title} • ${channel}`.slice(0, 180),
      campaign_id: body.campaign_id || null,
      creative_id: body.creative_id || null,
      product_id: product.id,
      publication_id: body.publication_id || null,
      variation_id: body.variation_id || null,
      channel,
      sub_id: subIds.join('|'),
      shopee_sub_ids: subIds,
      destination_url: shortLink,
      utm_source: 'shopee',
      utm_medium: channel,
      utm_campaign: campaignTag,
      utm_content: subIds.join(','),
      utm_term: variationTag,
      is_active: true,
      metadata: {
        marketplace: 'Shopee',
        origin_url: originUrl,
        affiliate_short_link: shortLink,
        external_product_id: externalId,
        generated_by: 'Radar IA',
      },
    }

    const sr = await fetch(`${url}/rest/v1/tracking_links`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(trackingPayload),
    })
    const saved = await sr.json().catch(() => ([]))
    if (!sr.ok) return res.status(sr.status).json({ error: saved?.message || 'Link gerado, mas não foi possível salvar o rastreamento.' })

    return res.status(200).json({
      success: true,
      short_link: shortLink,
      sub_ids: subIds,
      tracking_link: Array.isArray(saved) ? saved[0] : saved,
      message: 'Link Shopee rastreável gerado com 5 Sub IDs e salvo no Radar.',
    })
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Não foi possível gerar o link rastreável da Shopee.' })
  }
}
