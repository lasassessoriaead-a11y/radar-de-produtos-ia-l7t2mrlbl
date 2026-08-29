// Backend Hook: CRM Consent Center & Privacy Management (LGPD Compliance)
// Features: Revoke (Opt-out), Update consent, Register new consent, Export contact data, Anonymize / Delete

routerAdd(
  'POST',
  '/backend/v1/crm/consents/action',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const action = (body.action || '').trim() // 'revoke', 'grant_new', 'update', 'anonymize', 'export'
    const contactId = (body.contact_id || '').trim()
    const identifier = (body.identifier || '').trim()
    const channel = (body.channel || 'geral').trim()
    const authorizedPurpose = (body.authorized_purpose || 'Ofertas e Recomendações').trim()
    const notes = (body.notes || '').trim()

    if (!contactId && !identifier) {
      return e.badRequestError('Informe contact_id ou identifier.')
    }

    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')
    const consentsCol = $app.findCollectionByNameOrId('crm_consent_logs')
    const recsCol = $app.findCollectionByNameOrId('crm_recommendations')

    let contactRecord
    try {
      if (contactId) {
        contactRecord = $app.findRecordById('crm_contacts', contactId)
      } else {
        const list = $app.findRecordsByFilter(
          'crm_contacts',
          `identifier = "${identifier.replace(/"/g, '\\"')}"`,
          '-created',
          1,
          0,
        )
        if (!list || list.length === 0) return e.notFoundError('Contato não encontrado.')
        contactRecord = list[0]
      }
    } catch (err) {
      return e.notFoundError('Contato não encontrado: ' + err.message)
    }

    const now = new Date().toISOString()
    let timeline = contactRecord.get('timeline') || []
    if (!Array.isArray(timeline)) timeline = []

    if (action === 'revoke' || action === 'opt_out') {
      // 1. Revogar Consentimento (Opt-Out Estrito)
      contactRecord.set('status', 'opt_out')
      contactRecord.set('relationship_score', 0)
      contactRecord.set('next_best_action', 'Nenhuma ação agora')
      contactRecord.set(
        'next_best_action_reason',
        'Consentimento revogado pelo titular (Opt-Out). Bloqueio estrito de comunicações ativas.',
      )

      timeline.push({
        event_type: 'opt_out',
        date: now,
        channel: channel,
        details: `Consentimento revogado (Opt-out) para o canal "${channel}". Motivo/Observação: "${notes || 'Solicitação do usuário'}".`,
      })
      contactRecord.set('timeline', timeline)
      $app.save(contactRecord)

      // Criar/atualizar consent log
      try {
        const cLog = new Record(consentsCol)
        cLog.set('user_id', userId)
        cLog.set('contact_id', contactRecord.id)
        cLog.set('identifier', contactRecord.getString('identifier'))
        cLog.set('channel', channel)
        cLog.set('authorized_purpose', authorizedPurpose)
        cLog.set('status', 'revoked')
        cLog.set('revoked_at', now)
        cLog.set('notes', notes || 'Opt-out manual no Centro de Consentimentos')
        cLog.set('is_test_data', contactRecord.getBool('is_test_data'))
        $app.save(cLog)
      } catch (_) {}

      // Descartar recomendações pendentes para não gerar sugestões indevidas
      try {
        const pendingRecs = $app.findRecordsByFilter(
          'crm_recommendations',
          `contact_id = "${contactRecord.id}" && status = "sugerida"`,
          '-created',
          20,
          0,
        )
        for (let k = 0; k < pendingRecs.length; k++) {
          pendingRecs[k].set('status', 'descartada')
          pendingRecs[k].set(
            'cadence_block_reason',
            'Bloqueado por revogação de consentimento (Opt-Out).',
          )
          $app.save(pendingRecs[k])
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        action: 'revoke',
        status: 'opt_out',
        message:
          'Consentimento revogado com sucesso. O contato foi marcado como Opt-Out e todas as recomendações foram bloqueadas.',
      })
    } else if (action === 'grant_new' || action === 'update') {
      // 2. Registrar Novo Consentimento ou Atualizar
      const prevStatus = contactRecord.getString('status')
      const newStatus = prevStatus === 'opt_out' ? 'interessado' : prevStatus

      contactRecord.set('status', newStatus)
      if (newStatus !== 'opt_out') {
        contactRecord.set(
          'relationship_score',
          Math.max(50, contactRecord.getInt('relationship_score')),
        )
      }

      timeline.push({
        event_type: 'consent_granted',
        date: now,
        channel: channel,
        details: `Novo consentimento registrado para "${authorizedPurpose}" no canal ${channel}.`,
      })
      contactRecord.set('timeline', timeline)
      $app.save(contactRecord)

      // Salvar log
      try {
        const cLog = new Record(consentsCol)
        cLog.set('user_id', userId)
        cLog.set('contact_id', contactRecord.id)
        cLog.set('identifier', contactRecord.getString('identifier'))
        cLog.set('channel', channel)
        cLog.set('authorized_purpose', authorizedPurpose)
        cLog.set('status', 'active')
        cLog.set('granted_at', now)
        cLog.set('notes', notes)
        cLog.set('is_test_data', contactRecord.getBool('is_test_data'))
        $app.save(cLog)
      } catch (_) {}

      return e.json(200, {
        success: true,
        action: action,
        status: newStatus,
        message: 'Consentimento atualizado e registrado no histórico de conformidade.',
      })
    } else if (action === 'export') {
      // 3. Exportação de Dados do Titular (LGPD)
      const exportPayload = {
        identificador: contactRecord.getString('identifier'),
        nome: contactRecord.getString('name'),
        canal: contactRecord.getString('channel'),
        status: contactRecord.getString('status'),
        produtos_comprados: contactRecord.get('purchased_products'),
        preferencias: contactRecord.get('preferences'),
        historico_feedbacks: contactRecord.get('feedback_history'),
        timeline_eventos: contactRecord.get('timeline'),
        data_criacao: contactRecord.getString('created'),
      }

      return e.json(200, {
        success: true,
        action: 'export',
        data: exportPayload,
        message: 'Dados exportados em conformidade com o direito de acesso LGPD.',
      })
    } else if (action === 'anonymize') {
      // 4. Anonimização dos Dados Pessoais
      contactRecord.set('name', 'Contato Anonimizado')
      contactRecord.set('identifier', `anon_${contactRecord.id.slice(0, 8)}@anonimizado.local`)
      contactRecord.set('status', 'opt_out')
      contactRecord.set('internal_notes', 'Dados pessoais anonimizados a pedido do titular.')
      contactRecord.set('preferences', {})

      timeline.push({
        event_type: 'data_anonymized',
        date: now,
        details: 'Dados pessoais anonimizados em conformidade com o Art. 18 da LGPD.',
      })
      contactRecord.set('timeline', timeline)
      $app.save(contactRecord)

      return e.json(200, {
        success: true,
        action: 'anonymize',
        message: 'Dados do contato foram anonimizados com sucesso.',
      })
    }

    return e.badRequestError('Ação desconhecida.')
  },
  $apis.requireAuth(),
)
