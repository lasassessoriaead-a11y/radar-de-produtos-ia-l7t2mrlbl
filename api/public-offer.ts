import { getSupabaseAdminConfig, readJson } from '../server/supabase-admin.js'

const cleanId = (value: unknown) =>
  String(value || '')
    .trim()
    .slice(0, 80)

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const campaignId = cleanId(req.query?.campaign)
    if (!campaignId) return res.status(400).json({ error: 'Campanha não informada.' })

    const { url, headers } = getSupabaseAdminConfig()
    const select = [
      'id',
      'product_id',
      'product_title',
      'product_image',
      'product_category',
      'platform',
      'price_at_creation',
      'promo_price_at_creation',
      'campaign_name',
    ].join(',')
    const response = await fetch(
      `${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&select=${select}&limit=1`,
      { headers },
    )
    const rows = await readJson(response)
    if (!response.ok) throw new Error(rows?.message || 'Falha ao carregar a oferta.')
    const campaign = Array.isArray(rows) ? rows[0] : null
    if (!campaign) return res.status(404).json({ error: 'Oferta não encontrada.' })

    return res.status(200).json({
      success: true,
      offer: {
        campaign_id: campaign.id,
        product_id: campaign.product_id || '',
        title: campaign.product_title || 'Oferta selecionada',
        image_url: campaign.product_image || '',
        category: campaign.product_category || '',
        platform: campaign.platform || '',
        price: Number(campaign.price_at_creation || 0),
        promo_price: Number(campaign.promo_price_at_creation || 0),
        campaign_name: campaign.campaign_name || '',
      },
    })
  } catch (error: any) {
    console.error('public-offer', error)
    return res.status(503).json({ error: error?.message || 'Oferta indisponível no momento.' })
  }
}
