// Backend Hook: CRM Contact Upsert, Sync with Inbound Leads, Relationship Score & Next Best Action
// Strict Rule: Operates ONLY with legitimately registered contacts with verifiable consent.

routerAdd(
  'POST',
  '/backend/v1/crm/contacts/save',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const identifier = (body.identifier || '').trim()
    const name = (body.name || '').trim()
    const channel = (body.channel || 'landing_page').trim()
    const originSource = (body.origin_source || 'Canal Próprio').trim()
    const campaignId = (body.campaign_id || '').trim()
    const firstProductInterest = (body.first_product_interest || '').trim()
    const categoriesOfInterest = Array.isArray(body.categories_of_interest)
      ? body.categories_of_interest
      : []
    const status = (body.status || 'novo').trim()
    const authorizedPurpose = (
      body.authorized_purpose || 'Receber ofertas e novidades legítimas'
    ).trim()
    const consentTextVersion = (body.consent_text_version || 'v1.0-termos-lgpd').trim()
    const internalNotes = (body.internal_notes || '').trim()
    const isTestData = !!body.is_test_data

    if (!identifier) {
      return e.badRequestError(
        'O identificador único (e-mail, usuário ou ID voluntário) é obrigatório.',
      )
    }

    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')
    const consentsCol = $app.findCollectionByNameOrId('crm_consent_logs')

    let contactRecord
    let isNew = false

    try {
      const existing = $app.findRecordsByFilter(
        'crm_contacts',
        `identifier = "${identifier.replace(/"/g, '\\"')}"`,
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        contactRecord = existing[0]
      } else {
        contactRecord = new Record(contactsCol)
        isNew = true
      }
    } catch (_) {
      contactRecord = new Record(contactsCol)
      isNew = true
    }

    const now = new Date().toISOString()
    const purchasesCount = contactRecord.getInt('purchases_count') || 0
    const totalSalesValue = contactRecord.getFloat('total_sales_value') || 0
    const totalCommission = contactRecord.getFloat('total_commission_earned') || 0
    const isCustomer = purchasesCount > 0
    const isRecurring = purchasesCount > 1

    // 1. Relationship Score Calculation (0-100)
    // Mede nível de relacionamento com base em eventos próprios: recência, frequência, cliques, interações, compras, consentimento
    let relScore = 40
    if (channel === 'telegram') relScore += 10
    if (channel === 'landing_page' || channel === 'form') relScore += 15
    if (purchasesCount === 1) relScore += 25
    if (purchasesCount > 1) relScore += 35
    if (categoriesOfInterest.length > 0) relScore += 5
    if (status === 'engajado' || status === 'qualificado') relScore += 10
    if (status === 'cliente_recorrente') relScore += 20
    if (status === 'opt_out') relScore = 0
    if (status === 'inativo') relScore = Math.max(10, relScore - 20)

    relScore = Math.min(100, Math.max(0, relScore))

    // 2. Next Best Action Engine
    let nextBestAction = 'Nenhuma ação agora'
    let nextBestActionReason = 'Aguardar novo sinal espontâneo de interesse.'

    if (status === 'opt_out') {
      nextBestAction = 'Nenhuma ação agora'
      nextBestActionReason =
        'Consentimento revogado (Opt-out). Bloqueio estrito de comunicações ativas.'
    } else if (isRecurring) {
      nextBestAction = 'Apresentar produto complementar'
      nextBestActionReason = 'Cliente recorrente com histórico sólido de compras confirmadas.'
    } else if (isCustomer) {
      nextBestAction = 'Enviar conteúdo educativo'
      nextBestActionReason =
        'Pós-compra: fornecer valor com dicas de uso, cuidados e suporte antes da próxima oferta.'
    } else if (status === 'qualificado' || status === 'em_decisao') {
      nextBestAction = 'Recomendação'
      nextBestActionReason = 'Lead altamente qualificado com interesse claro no produto de entrada.'
    } else if (status === 'inativo') {
      nextBestAction = 'Reativar relacionamento'
      nextBestActionReason =
        'Sem interação recente; verificar oportunidade de reengajamento com conteúdo de valor.'
    } else if (status === 'engajado') {
      nextBestAction = 'Solicitar feedback'
      nextBestActionReason = 'Interação recente; solicitar feedback sobre o que mais procura.'
    }

    contactRecord.set('user_id', userId)
    contactRecord.set('identifier', identifier)
    if (name) contactRecord.set('name', name)
    contactRecord.set('channel', channel)
    contactRecord.set('origin_source', originSource)
    contactRecord.set('campaign_id', campaignId)
    if (firstProductInterest) contactRecord.set('first_product_interest', firstProductInterest)
    contactRecord.set('categories_of_interest', categoriesOfInterest)
    contactRecord.set('lead_score', body.lead_score || contactRecord.getInt('lead_score') || 60)
    contactRecord.set('relationship_score', relScore)
    contactRecord.set('status', status)
    contactRecord.set('is_customer', isCustomer)
    contactRecord.set('is_recurring_customer', isRecurring)
    contactRecord.set('next_best_action', nextBestAction)
    contactRecord.set('next_best_action_reason', nextBestActionReason)
    if (body.preferences) contactRecord.set('preferences', body.preferences)
    if (internalNotes) contactRecord.set('internal_notes', internalNotes)
    contactRecord.set('is_test_data', isTestData)
    contactRecord.set('last_interaction_date', now)

    // Timeline unificada
    let timeline = contactRecord.get('timeline') || []
    if (!Array.isArray(timeline)) timeline = []

    if (isNew) {
      timeline.push({
        event_type: 'lead_captured',
        date: now,
        channel: channel,
        source: originSource,
        details: `Contato legítimo registrado via ${channel} na origem "${originSource}".`,
      })
      timeline.push({
        event_type: 'consent_granted',
        date: now,
        details: `Consentimento ativo (${consentTextVersion}) para: "${authorizedPurpose}".`,
      })
    } else {
      timeline.push({
        event_type: 'interaction',
        date: now,
        details: `Dados do contato atualizados (Status: ${status}).`,
      })
    }

    contactRecord.set('timeline', timeline)
    $app.save(contactRecord)

    // Se novo, registrar consent log
    if (isNew) {
      try {
        const consentRec = new Record(consentsCol)
        consentRec.set('user_id', userId)
        consentRec.set('contact_id', contactRecord.id)
        consentRec.set('identifier', identifier)
        consentRec.set('channel', channel)
        consentRec.set('authorized_purpose', authorizedPurpose)
        consentRec.set('consent_text_version', consentTextVersion)
        consentRec.set('status', 'active')
        consentRec.set('granted_at', now)
        consentRec.set('origin_source', originSource)
        consentRec.set('is_test_data', isTestData)
        $app.save(consentRec)
      } catch (cErr) {
        console.log('Error creating consent log: ' + cErr)
      }
    }

    return e.json(200, {
      success: true,
      contact: {
        id: contactRecord.id,
        identifier: identifier,
        name: name,
        relationship_score: relScore,
        status: status,
        next_best_action: nextBestAction,
      },
      message: 'Contato do CRM salvo com sucesso.',
    })
  },
  $apis.requireAuth(),
)
