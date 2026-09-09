import { getSupabaseAdminConfig, readJson, safeHttpUrl } from '../server/supabase-admin.js'

type RateEntry = { count: number; resetAt: number }
const rateStore = new Map<string, RateEntry>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 6

const text = (value: unknown, max: number) =>
  String(value || '')
    .trim()
    .slice(0, max)
const normalizeIdentifier = (value: unknown) => text(value, 180).toLowerCase()
const nowIso = () => new Date().toISOString()

function clientIp(req: any) {
  return text(String(req.headers?.['x-forwarded-for'] || '').split(',')[0], 64) || 'unknown'
}

function checkRateLimit(ip: string) {
  const now = Date.now()
  const current = rateStore.get(ip)
  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  current.count += 1
  return current.count <= MAX_ATTEMPTS
}

function maskedIp(ip: string) {
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : 'anonymized'
}

async function getCampaign(url: string, headers: Record<string, string>, campaignId: string) {
  const response = await fetch(
    `${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&select=id,user_id,product_id,product_title,product_category,affiliate_url,product_url&limit=1`,
    { headers },
  )
  const rows = await readJson(response)
  if (!response.ok) throw new Error(rows?.message || 'Campanha inválida.')
  return Array.isArray(rows) ? rows[0] : null
}

async function findOne(
  url: string,
  headers: Record<string, string>,
  table: string,
  userId: string,
  identifier: string,
) {
  const response = await fetch(
    `${url}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}&identifier=eq.${encodeURIComponent(identifier)}&select=*&limit=1`,
    { headers },
  )
  const rows = await readJson(response)
  if (!response.ok) throw new Error(rows?.message || `Falha ao consultar ${table}.`)
  return Array.isArray(rows) ? rows[0] : null
}

async function saveRow(
  url: string,
  headers: Record<string, string>,
  table: string,
  payload: Record<string, unknown>,
  id?: string,
) {
  const endpoint = id
    ? `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`
    : `${url}/rest/v1/${table}`
  const response = await fetch(endpoint, {
    method: id ? 'PATCH' : 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  const rows = await readJson(response)
  if (!response.ok) throw new Error(rows?.message || `Falha ao salvar ${table}.`)
  return Array.isArray(rows) ? rows[0] : rows
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body: Record<string, any> = {}
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Dados do formulário inválidos.' })
  }
  if (text(body.company_website, 100))
    return res.status(200).json({ success: true, message: 'Recebido.' })

  const ip = clientIp(req)
  if (!checkRateLimit(ip))
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' })

  try {
    const identifier = normalizeIdentifier(body.identifier)
    const campaignId = text(body.campaign_id, 80)
    if (identifier.length < 3) return res.status(400).json({ error: 'Informe um contato válido.' })
    if (body.consent_accepted !== true)
      return res.status(400).json({ error: 'Aceite o consentimento para continuar.' })
    if (!campaignId)
      return res.status(400).json({ error: 'Esta página não está vinculada a uma campanha.' })

    const { url, headers } = getSupabaseAdminConfig()
    const campaign = await getCampaign(url, headers, campaignId)
    if (!campaign?.user_id) return res.status(404).json({ error: 'Campanha não encontrada.' })

    const createdAt = nowIso()
    const name = text(body.name, 120)
    const productInterest = text(body.product_interest || campaign.product_title, 220)
    const category = text(body.category || campaign.product_category, 120)
    const source = text(body.origin_source || 'Landing pública /ofertas', 300)
    const purpose = text(
      body.authorized_purpose || 'Receber ofertas e conteúdos relacionados ao interesse informado',
      300,
    )
    const consentVersion = text(body.consent_text_version || 'v1.1-public-capture', 80)
    const leadScore = Math.min(100, 80 + (productInterest ? 10 : 0) + (category ? 5 : 0))
    const timelineEvent = {
      event_type: 'lead_captured',
      date: createdAt,
      channel: 'landing_page',
      source,
      details: `Interesse voluntário em ${productInterest || 'ofertas relacionadas'}.`,
    }

    const existingLead = await findOne(url, headers, 'inbound_leads', campaign.user_id, identifier)
    const lead = await saveRow(
      url,
      headers,
      'inbound_leads',
      {
        user_id: campaign.user_id,
        identifier,
        name,
        channel: 'landing_page',
        origin_source: source,
        campaign_id: campaign.id,
        product_id: campaign.product_id || '',
        product_interest: productInterest,
        declared_intent: text(body.declared_intent || 'Quero conhecer esta oferta', 300),
        lead_score: leadScore,
        score_tier: 'hot',
        status: existingLead?.status || 'new',
        consent_status: 'active',
        consent_date: createdAt,
        authorized_purpose: purpose,
        consent_text_version: consentVersion,
        interactions_count: Number(existingLead?.interactions_count || 0) + 1,
        timeline: [
          ...(Array.isArray(existingLead?.timeline) ? existingLead.timeline : []),
          timelineEvent,
        ],
        metadata: { source: 'public_offer', category },
        updated_at: createdAt,
        ...(existingLead ? {} : { created_at: createdAt }),
      },
      existingLead?.id,
    )

    const existingContact = await findOne(
      url,
      headers,
      'crm_contacts',
      campaign.user_id,
      identifier,
    )
    const contact = await saveRow(
      url,
      headers,
      'crm_contacts',
      {
        user_id: campaign.user_id,
        identifier,
        name,
        channel: 'landing_page',
        origin_source: source,
        campaign_id: campaign.id,
        lead_id: lead.id,
        first_product_interest: productInterest,
        categories_of_interest: category ? [category] : [],
        lead_score: leadScore,
        relationship_score: Math.max(75, Number(existingContact?.relationship_score || 0)),
        status: existingContact?.status || 'novo',
        is_customer: Boolean(existingContact?.is_customer),
        is_recurring_customer: Boolean(existingContact?.is_recurring_customer),
        purchases_count: Number(existingContact?.purchases_count || 0),
        total_sales_value: Number(existingContact?.total_sales_value || 0),
        total_commission_earned: Number(existingContact?.total_commission_earned || 0),
        average_commission: Number(existingContact?.average_commission || 0),
        next_best_action: 'Enviar oferta solicitada',
        next_best_action_reason: 'Lead consentido demonstrou interesse nesta campanha.',
        last_interaction_date: createdAt,
        timeline: [
          ...(Array.isArray(existingContact?.timeline) ? existingContact.timeline : []),
          timelineEvent,
        ],
        is_test_data: false,
        updated_at: createdAt,
        ...(existingContact ? {} : { created_at: createdAt }),
      },
      existingContact?.id,
    )

    await saveRow(url, headers, 'crm_consent_logs', {
      user_id: campaign.user_id,
      contact_id: contact.id,
      identifier,
      channel: 'landing_page',
      authorized_purpose: purpose,
      consent_text_version: consentVersion,
      status: 'active',
      granted_at: createdAt,
      origin_source: source,
      ip_masked: maskedIp(ip),
      user_agent_short: text(req.headers?.['user-agent'], 150),
      notes: 'Consentimento fornecido voluntariamente na página pública da oferta.',
      is_test_data: false,
      created_at: createdAt,
      updated_at: createdAt,
    })

    return res.status(200).json({
      success: true,
      lead_id: lead.id,
      contact_id: contact.id,
      lead_score: leadScore,
      offer_url: safeHttpUrl(campaign.affiliate_url || campaign.product_url),
      message: 'Cadastro realizado. Sua oferta está pronta para ser acessada.',
    })
  } catch (error: any) {
    console.error('public-leads', error)
    return res
      .status(503)
      .json({ error: error?.message || 'Não foi possível concluir o cadastro agora.' })
  }
}
