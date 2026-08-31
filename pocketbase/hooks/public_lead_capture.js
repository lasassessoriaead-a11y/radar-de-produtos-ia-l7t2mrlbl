// Public Lead Capture for single-operator production.
// Creates/updates inbound_leads + crm_contacts + crm_consent_logs.
// Public endpoint by design; no external outreach is triggered here.

routerAdd('POST', '/backend/v1/public/leads/capture', (e) => {
  const body = e.requestInfo().body || {}

  // Honeypot: bots often fill hidden fields.
  if ((body.company_website || '').trim()) {
    return e.json(200, { success: true, message: 'Recebido.' })
  }

  const name = (body.name || '').trim().slice(0, 120)
  const identifier = (body.identifier || '').trim().slice(0, 180)
  const channel = (body.channel || 'landing_page').trim()
  const productInterest = (body.product_interest || '').trim().slice(0, 220)
  const category = (body.category || '').trim().slice(0, 120)
  const declaredIntent = (body.declared_intent || 'Quero receber ofertas e conteúdos relacionados')
    .trim()
    .slice(0, 300)
  const campaignId = (body.campaign_id || '').trim().slice(0, 80)
  const productId = (body.product_id || '').trim().slice(0, 80)
  const originSource = (body.origin_source || 'Landing pública /ofertas').trim().slice(0, 300)
  const consentAccepted = body.consent_accepted === true
  const authorizedPurpose = (
    body.authorized_purpose ||
    'Receber ofertas, novidades e conteúdos relacionados aos interesses informados'
  )
    .trim()
    .slice(0, 300)
  const consentTextVersion = (body.consent_text_version || 'v1.0-public-capture')
    .trim()
    .slice(0, 80)

  if (!identifier) return e.badRequestError('Informe um contato para receber as ofertas.')
  if (!consentAccepted)
    return e.badRequestError('É necessário aceitar o consentimento para continuar.')

  const allowedChannels = [
    'landing_page',
    'form',
    'telegram',
    'newsletter',
    'campaign_page',
    'own_channel',
    'whatsapp',
    'other',
  ]
  const safeChannel = allowedChannels.includes(channel) ? channel : 'landing_page'

  // Resolve the single operator. Prefer explicit env; fallback to the first auth user.
  let userId = ($os.getenv('PUBLIC_LEAD_OWNER_ID') || '').trim()
  if (!userId) {
    try {
      const users = $app.findRecordsByFilter('users', '', 'created', 1, 0)
      if (users && users.length > 0) userId = users[0].id
    } catch (_) {}
  }

  if (!userId) {
    return e.json(503, {
      success: false,
      error: 'Captura ainda não configurada. Defina PUBLIC_LEAD_OWNER_ID no backend.',
    })
  }

  // Lightweight identifier validation. Do not force email because Telegram/WhatsApp are valid channels.
  if (identifier.length < 3) return e.badRequestError('Contato inválido.')

  const now = new Date().toISOString()
  const req = e.requestInfo()
  const headers = req.headers || {}
  const ua = (headers['user-agent'] || headers['User-Agent'] || '').slice(0, 150)
  const remoteIp = req.remoteIP || ''

  let maskedIp = ''
  if (remoteIp) {
    const parts = remoteIp.split('.')
    maskedIp = parts.length === 4 ? parts[0] + '.' + parts[1] + '.*.*' : 'anonymized'
  }

  // Lead Score: explicit inbound opt-in + declared product interest.
  let leadScore = 70
  if (productInterest) leadScore += 10
  if (category) leadScore += 5
  const intentLower = declaredIntent.toLowerCase()
  if (
    intentLower.includes('compr') ||
    intentLower.includes('cupom') ||
    intentLower.includes('oferta')
  )
    leadScore += 10
  leadScore = Math.min(100, leadScore)
  const scoreTier =
    leadScore >= 80
      ? 'hot'
      : leadScore >= 60
        ? 'interested'
        : leadScore >= 40
          ? 'potential'
          : 'cold'

  try {
    const leadsCol = $app.findCollectionByNameOrId('inbound_leads')
    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')
    const consentsCol = $app.findCollectionByNameOrId('crm_consent_logs')

    // Upsert inbound lead scoped to the single operator.
    let lead
    let leadIsNew = false
    try {
      const found = $app.findRecordsByFilter(
        'inbound_leads',
        `user_id = '${userId}' && identifier = "${identifier.replace(/"/g, '\\"')}"`,
        '-created',
        1,
        0,
      )
      if (found.length) lead = found[0]
    } catch (_) {}

    if (!lead) {
      lead = new Record(leadsCol)
      leadIsNew = true
    }

    lead.set('user_id', userId)
    lead.set('identifier', identifier)
    if (name) lead.set('name', name)
    lead.set('channel', safeChannel)
    lead.set('origin_source', originSource)
    lead.set('campaign_id', campaignId)
    lead.set('product_id', productId)
    lead.set('product_interest', productInterest)
    lead.set('declared_intent', declaredIntent)
    lead.set('lead_score', leadScore)
    lead.set('score_tier', scoreTier)
    lead.set('status', leadIsNew ? 'new' : lead.getString('status') || 'interested')
    lead.set('consent_status', 'active')
    lead.set('consent_date', now)
    lead.set('authorized_purpose', authorizedPurpose)
    lead.set('consent_text_version', consentTextVersion)
    lead.set('interactions_count', (lead.getInt('interactions_count') || 0) + 1)

    let leadTimeline = lead.get('timeline') || []
    if (!Array.isArray(leadTimeline)) leadTimeline = []
    leadTimeline.push({
      event_type: leadIsNew ? 'lead_captured' : 'lead_reengaged',
      date: now,
      channel: safeChannel,
      source: originSource,
      details: productInterest
        ? `Interesse declarado em "${productInterest}".`
        : 'Entrada voluntária pela landing pública.',
    })
    leadTimeline.push({
      event_type: 'consent_granted',
      date: now,
      details: `Consentimento ativo (${consentTextVersion}) para: "${authorizedPurpose}".`,
    })
    lead.set('timeline', leadTimeline)
    lead.set('metadata', { source: 'public_capture', category })
    $app.save(lead)

    // Upsert CRM contact.
    let contact
    let contactIsNew = false
    try {
      const found = $app.findRecordsByFilter(
        'crm_contacts',
        `user_id = '${userId}' && identifier = "${identifier.replace(/"/g, '\\"')}"`,
        '-created',
        1,
        0,
      )
      if (found.length) contact = found[0]
    } catch (_) {}

    if (!contact) {
      contact = new Record(contactsCol)
      contactIsNew = true
    }

    const categories = category ? [category] : []
    let relationshipScore = 55
    if (productInterest) relationshipScore += 10
    if (leadScore >= 80) relationshipScore += 10
    relationshipScore = Math.min(100, relationshipScore)

    contact.set('user_id', userId)
    contact.set('identifier', identifier)
    if (name) contact.set('name', name)
    contact.set('channel', safeChannel)
    contact.set('origin_source', originSource)
    contact.set('campaign_id', campaignId)
    contact.set('lead_id', lead.id)
    if (productInterest) contact.set('first_product_interest', productInterest)
    if (categories.length) contact.set('categories_of_interest', categories)
    contact.set('lead_score', leadScore)
    contact.set('relationship_score', relationshipScore)
    contact.set('status', contactIsNew ? 'novo' : contact.getString('status') || 'interessado')
    contact.set('is_customer', contact.getBool('is_customer'))
    contact.set('is_recurring_customer', contact.getBool('is_recurring_customer'))
    contact.set('purchases_count', contact.getInt('purchases_count') || 0)
    contact.set('next_best_action', 'Enviar conteúdo educativo')
    contact.set(
      'next_best_action_reason',
      'Lead inbound com consentimento ativo e interesse declarado.',
    )
    contact.set('last_interaction_date', now)
    contact.set('is_test_data', false)

    let timeline = contact.get('timeline') || []
    if (!Array.isArray(timeline)) timeline = []
    timeline.push({
      event_type: contactIsNew ? 'lead_captured' : 'interaction',
      date: now,
      channel: safeChannel,
      source: originSource,
      details: 'Entrada voluntária pela landing pública com consentimento ativo.',
    })
    contact.set('timeline', timeline)
    $app.save(contact)

    // Append an auditable consent log on every explicit grant.
    const consent = new Record(consentsCol)
    consent.set('user_id', userId)
    consent.set('contact_id', contact.id)
    consent.set('identifier', identifier)
    consent.set('channel', safeChannel)
    consent.set('authorized_purpose', authorizedPurpose)
    consent.set('consent_text_version', consentTextVersion)
    consent.set('status', 'active')
    consent.set('granted_at', now)
    consent.set('origin_source', originSource)
    consent.set('ip_masked', maskedIp)
    consent.set('user_agent_short', ua)
    consent.set('notes', 'Consentimento fornecido na landing pública de captura.')
    consent.set('is_test_data', false)
    $app.save(consent)

    return e.json(200, {
      success: true,
      lead_id: lead.id,
      contact_id: contact.id,
      lead_score: leadScore,
      score_tier: scoreTier,
      message: 'Cadastro realizado. Você entrou na lista de interesses com consentimento ativo.',
    })
  } catch (err) {
    console.log('Public lead capture error:', err)
    return e.json(500, { success: false, error: 'Não foi possível concluir o cadastro agora.' })
  }
})
