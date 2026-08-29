// Backend Hook for Inbound Leads CRM, Consent Tracking, and Lead Score calculation
// Strict compliance: Only stores consenting inbound leads from own channels (LP, forms, Telegram, newsletter)

routerAdd(
  'POST',
  '/backend/v1/audience/inbound-lead/capture',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const identifier = (body.identifier || '').trim() // e-mail, telefone voluntário ou id telegram
    const name = (body.name || '').trim()
    const channel = (body.channel || 'landing_page').trim()
    const originSource = (body.origin_source || 'Canal Próprio').trim()
    const productId = (body.product_id || '').trim()
    const productInterest = (body.product_interest || '').trim()
    const campaignId = (body.campaign_id || '').trim()
    const declaredIntent = (
      body.declared_intent || 'Interesse direto em receber oferta/avaliação'
    ).trim()
    const consentStatus = (body.consent_status || 'active').trim() // 'active' | 'revoked'
    const authorizedPurpose = (
      body.authorized_purpose || 'Receber ofertas, novidades e cupons de desconto exclusivos'
    ).trim()
    const consentTextVersion = (body.consent_text_version || 'v1.0-termos-claros-2025').trim()
    const notes = (body.notes || '').trim()

    if (!identifier) {
      return e.badRequestError('O identificador (e-mail, usuário ou ID voluntário) é obrigatório.')
    }

    if (consentStatus !== 'active' && consentStatus !== 'revoked') {
      return e.badRequestError('Status de consentimento inválido.')
    }

    const leadsCol = $app.findCollectionByNameOrId('inbound_leads')
    const oppsCol = $app.findCollectionByNameOrId('audience_opportunities')

    // 1. Lead Score Calculation (0 a 100)
    // Considera: Canal de origem, intenção declarada, produto associado, cliques/interações
    let leadScore = 60
    if (channel === 'landing_page' || channel === 'form') leadScore += 20
    if (channel === 'telegram') leadScore += 15
    if (productInterest) leadScore += 10
    if (
      declaredIntent.toLowerCase().includes('comprar') ||
      declaredIntent.toLowerCase().includes('cupom')
    )
      leadScore += 10

    leadScore = Math.min(100, Math.max(10, leadScore))

    let scoreTier = 'interested'
    if (leadScore >= 80) scoreTier = 'hot'
    else if (leadScore >= 60) scoreTier = 'interested'
    else if (leadScore >= 40) scoreTier = 'potential'
    else scoreTier = 'cold'

    // 2. Timeline Event
    const now = new Date().toISOString()
    const initialTimeline = [
      {
        event_type: 'consent_granted',
        date: now,
        channel: channel,
        source: originSource,
        details: `Consentimento registrado com sucesso (${consentTextVersion}) para: "${authorizedPurpose}"`,
      },
      {
        event_type: 'lead_captured',
        date: now,
        details: `Lead inbound registrado no canal ${channel} com interesse em "${productInterest || 'Ofertas Gerais'}".`,
      },
    ]

    // 3. Persist or Update Lead
    let leadRecord
    let isNew = false
    try {
      const existing = $app.findRecordsByFilter(
        'inbound_leads',
        `identifier = "${identifier.replace(/"/g, '\\"')}"`,
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        leadRecord = existing[0]
      } else {
        leadRecord = new Record(leadsCol)
        isNew = true
      }
    } catch (_) {
      leadRecord = new Record(leadsCol)
      isNew = true
    }

    leadRecord.set('user_id', userId)
    leadRecord.set('identifier', identifier)
    if (name) leadRecord.set('name', name)
    leadRecord.set('channel', channel)
    leadRecord.set('origin_source', originSource)
    leadRecord.set('campaign_id', campaignId)
    leadRecord.set('product_id', productId)
    leadRecord.set('product_interest', productInterest)
    leadRecord.set('declared_intent', declaredIntent)
    leadRecord.set('lead_score', leadScore)
    leadRecord.set('score_tier', scoreTier)
    leadRecord.set('status', isNew ? 'new' : leadRecord.getString('status') || 'interested')
    leadRecord.set('consent_status', consentStatus)
    leadRecord.set('consent_date', now)
    leadRecord.set('authorized_purpose', authorizedPurpose)
    leadRecord.set('consent_text_version', consentTextVersion)
    leadRecord.set('clicks_count', leadRecord.getInt('clicks_count') || 0)
    leadRecord.set('interactions_count', (leadRecord.getInt('interactions_count') || 0) + 1)
    leadRecord.set('notes', notes)

    // Atualizar timeline mantendo histórico
    let currentTimeline = leadRecord.get('timeline') || []
    if (!Array.isArray(currentTimeline)) currentTimeline = []
    currentTimeline = [...currentTimeline, ...initialTimeline]
    leadRecord.set('timeline', currentTimeline)

    $app.save(leadRecord)

    // 4. Criar Oportunidade Inbound na fila de Oportunidades se for novo lead
    if (isNew) {
      try {
        const oppRec = new Record(oppsCol)
        oppRec.set('user_id', userId)
        oppRec.set('title', `Novo Lead Inbound Consentido: ${name || identifier}`)
        oppRec.set('opportunity_type', 'inbound_lead')
        oppRec.set(
          'description',
          `Lead voluntário capturado via ${channel} com interesse em "${productInterest || 'Ofertas'}". Consentimento ativo.`,
        )
        oppRec.set('action_suggested', 'create_campaign')
        oppRec.set(
          'suggested_content_angle',
          `Oferta direta e conteúdo relevante para ${productInterest || 'o produto'}`,
        )
        oppRec.set(
          'suggested_reply_text',
          `Olá ${name || ''}! Aqui está o material e o link promocional que você solicitou. Qualquer dúvida, estou à disposição.`,
        )
        oppRec.set('source', channel)
        oppRec.set('source_url', originSource)
        oppRec.set('product_id', productId)
        oppRec.set('product_title', productInterest)
        oppRec.set('campaign_id', campaignId)
        oppRec.set('intent_score', leadScore)
        oppRec.set('relevance_score', 95)
        oppRec.set('priority_level', scoreTier === 'hot' ? 'hot' : 'high')
        oppRec.set('status', 'new')
        oppRec.set('lead_id', leadRecord.id)
        $app.save(oppRec)
      } catch (oppErr) {
        console.log('Error creating inbound lead opportunity: ' + oppErr)
      }
    }

    return e.json(200, {
      success: true,
      lead_id: leadRecord.id,
      lead_score: leadScore,
      score_tier: scoreTier,
      consent_status: consentStatus,
      message: 'Lead inbound e termo de consentimento registrados com sucesso.',
    })
  },
  $apis.requireAuth(),
)

// Endpoint para Revogação de Consentimento (Opt-Out)
routerAdd(
  'POST',
  '/backend/v1/audience/inbound-lead/revoke-consent',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const leadId = (body.lead_id || '').trim()
    const identifier = (body.identifier || '').trim()

    if (!leadId && !identifier) {
      return e.badRequestError('Informe o ID ou identificador do lead para revogação.')
    }

    try {
      let leadRecord
      if (leadId) {
        leadRecord = $app.findRecordById('inbound_leads', leadId)
      } else {
        const list = $app.findRecordsByFilter(
          'inbound_leads',
          `identifier = "${identifier.replace(/"/g, '\\"')}"`,
          '-created',
          1,
          0,
        )
        if (!list || list.length === 0) return e.notFoundError('Lead não encontrado.')
        leadRecord = list[0]
      }

      const now = new Date().toISOString()
      leadRecord.set('consent_status', 'revoked')
      leadRecord.set('consent_revoked_at', now)
      leadRecord.set('status', 'opt_out')

      let timeline = leadRecord.get('timeline') || []
      if (!Array.isArray(timeline)) timeline = []
      timeline.push({
        event_type: 'consent_revoked',
        date: now,
        details:
          'Consentimento revogado pelo usuário (Opt-Out). Futuras automações e contatos bloqueados.',
      })
      leadRecord.set('timeline', timeline)

      $app.save(leadRecord)

      return e.json(200, {
        success: true,
        lead_id: leadRecord.id,
        consent_status: 'revoked',
        message: 'Consentimento revogado com sucesso. O lead foi marcado como Opt-Out.',
      })
    } catch (err) {
      return e.badRequestError('Erro ao revogar consentimento: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
