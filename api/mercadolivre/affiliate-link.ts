import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre.js'

function validAffiliateUrl(value: string) {
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    return (
      h === 'mercadolivre.com' ||
      h.endsWith('.mercadolivre.com') ||
      h === 'mercadolivre.com.br' ||
      h.endsWith('.mercadolivre.com.br') ||
      h === 'mercadolibre.com' ||
      h.endsWith('.mercadolibre.com') ||
      h === 'meli.la' ||
      h.endsWith('.meli.la')
    )
  } catch {
    return false
  }
}

function cleanChannel(value: unknown) {
  return String(value || 'manual')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32) || 'manual'
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const productId = String(body.product_id || '').trim()
    const campaignId = body.campaign_id ? String(body.campaign_id).trim() : ''
    const affiliateUrl = String(body.affiliate_url || '').trim()
    const channel = cleanChannel(body.channel)

    if (!productId) return res.status(400).json({ error: 'product_id é obrigatório.' })
    if (!validAffiliateUrl(affiliateUrl)) {
      return res.status(400).json({ error: 'Informe um link oficial válido do Mercado Livre/Afiliados.' })
    }

    const headers = { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }

    const productRes = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,title,platform,metadata`,
      { headers }
    )
    const products = await productRes.json().catch(() => ([]))
    const product = Array.isArray(products) ? products[0] : null
    if (!productRes.ok || !product) return res.status(404).json({ error: 'Produto não encontrado.' })
    if (String(product.platform || '').toLowerCase() !== 'mercado livre') {
      return res.status(400).json({ error: 'Este produto não pertence ao Mercado Livre.' })
    }

    if (campaignId) {
      const campaignRes = await fetch(
        `${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,product_id`,
        { headers }
      )
      const campaigns = await campaignRes.json().catch(() => ([]))
      const campaign = Array.isArray(campaigns) ? campaigns[0] : null
      if (!campaignRes.ok || !campaign) return res.status(404).json({ error: 'Campanha não encontrada.' })
      if (campaign.product_id && campaign.product_id !== productId) {
        return res.status(400).json({ error: 'A campanha informada pertence a outro produto.' })
      }
    }

    const metadata = {
      ...(product.metadata || {}),
      affiliate_tracking_mode: 'radar_click_tracking_only',
      affiliate_source: 'mercadolivre_portal_afiliados',
      affiliate_link_saved_at: new Date().toISOString(),
      conversion_source_status: 'awaiting_official_affiliate_report_source',
    }

    const updateProduct = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&user_id=eq.${encodeURIComponent(user.id)}`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ affiliate_url: affiliateUrl, metadata, updated_at: new Date().toISOString() }),
      }
    )
    const updatedRows = await updateProduct.json().catch(() => ([]))
    if (!updateProduct.ok) {
      return res.status(updateProduct.status).json({ error: updatedRows?.message || 'Falha ao salvar link afiliado.' })
    }

    const existingRes = await fetch(
      `${url}/rest/v1/tracking_links?user_id=eq.${encodeURIComponent(user.id)}&product_id=eq.${encodeURIComponent(productId)}&utm_source=eq.mercadolivre&channel=eq.${encodeURIComponent(channel)}&is_active=eq.true&select=*`,
      { headers }
    )
    const existingRows = await existingRes.json().catch(() => ([]))
    if (!existingRes.ok) return res.status(existingRes.status).json({ error: 'Falha ao consultar tracking existente.' })
    const existing = Array.isArray(existingRows) ? existingRows[0] : null

    const subId = `ml|${productId.slice(-10)}|${channel}`
    const now = new Date().toISOString()
    let tracking: any

    if (existing) {
      const patchRes = await fetch(`${url}/rest/v1/tracking_links?id=eq.${encodeURIComponent(existing.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          campaign_id: campaignId || existing.campaign_id || null,
          destination_url: affiliateUrl,
          sub_id: subId,
          utm_medium: 'affiliate',
          utm_campaign: campaignId || existing.utm_campaign || null,
          metadata: {
            ...(existing.metadata || {}),
            marketplace: 'Mercado Livre',
            attribution_mode: 'radar_click_only_until_official_conversion_source',
          },
          updated_at: now,
        }),
      })
      const rows = await patchRes.json().catch(() => ([]))
      if (!patchRes.ok) return res.status(patchRes.status).json({ error: rows?.message || 'Falha ao atualizar tracking.' })
      tracking = Array.isArray(rows) ? rows[0] : rows
    } else {
      const slug = `ml-${crypto.randomBytes(6).toString('hex')}`
      const createRes = await fetch(`${url}/rest/v1/tracking_links`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: user.id,
          slug,
          title: `${String(product.title || 'Mercado Livre')} • ${channel}`,
          product_id: productId,
          campaign_id: campaignId || null,
          channel,
          sub_id: subId,
          destination_url: affiliateUrl,
          utm_source: 'mercadolivre',
          utm_medium: 'affiliate',
          utm_campaign: campaignId || null,
          is_active: true,
          metadata: {
            marketplace: 'Mercado Livre',
            source: 'mercadolivre_portal_afiliados',
            attribution_mode: 'radar_click_only_until_official_conversion_source',
          },
        }),
      })
      const rows = await createRes.json().catch(() => ([]))
      if (!createRes.ok) return res.status(createRes.status).json({ error: rows?.message || 'Falha ao criar tracking.' })
      tracking = Array.isArray(rows) ? rows[0] : rows
    }

    const origin = String(process.env.PUBLIC_APP_URL || 'https://radar-de-produtos-ia-l7t2mrlbl.vercel.app').replace(/\/$/, '')
    return res.status(200).json({
      success: true,
      product: Array.isArray(updatedRows) ? updatedRows[0] : updatedRows,
      tracking_link: tracking,
      short_url: `${origin}/t/${tracking.slug}`,
      attribution_mode: 'click_tracking_only',
      conversion_learning_enabled: false,
      message: 'Link afiliado do Mercado Livre salvo e rastreamento de cliques ativado. Conversões só entrarão no aprendizado quando houver fonte oficial confiável.',
    })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível configurar o link afiliado.' })
  }
}
