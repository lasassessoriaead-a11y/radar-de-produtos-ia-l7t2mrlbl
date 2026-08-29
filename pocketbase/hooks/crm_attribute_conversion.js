// Backend Hook: Conversion Attribution to CRM Contact (Customer & Recurring Customer Engine)
// Rule: When a confirmed conversion is attributed, update or suggest update to Customer / Recurring Customer.

routerAdd(
  'POST',
  '/backend/v1/crm/contacts/attribute-conversion',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const contactIdentifier = (body.contact_identifier || '').trim()
    const contactId = (body.contact_id || '').trim()
    const conversionId = (body.conversion_id || '').trim()
    const productId = (body.product_id || '').trim()
    const productTitle = (body.product_title || 'Produto de Oferta').trim()
    const productCategory = (body.product_category || 'Geral').trim()
    const saleAmount = parseFloat(body.sale_amount) || 0
    const commissionAmount = parseFloat(body.commission_amount) || 0
    const orderId = (body.order_id || 'PEDIDO-' + Math.floor(Math.random() * 90000 + 10000)).trim()
    const channel = (body.channel || 'Telegram').trim()
    const campaignId = (body.campaign_id || '').trim()
    const origin = (body.origin || 'Campanha Direta').trim()

    if (!contactIdentifier && !contactId) {
      return e.badRequestError('Informe contact_identifier ou contact_id.')
    }

    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')
    let contactRecord

    try {
      if (contactId) {
        contactRecord = $app.findRecordById('crm_contacts', contactId)
      } else {
        const list = $app.findRecordsByFilter(
          'crm_contacts',
          `identifier = "${contactIdentifier.replace(/"/g, '\\"')}"`,
          '-created',
          1,
          0,
        )
        if (!list || list.length === 0) return e.notFoundError('Contato não encontrado no CRM.')
        contactRecord = list[0]
      }
    } catch (err) {
      return e.notFoundError('Contato não encontrado: ' + err.message)
    }

    const now = new Date().toISOString()
    const previousPurchases = contactRecord.getInt('purchases_count') || 0
    const newPurchasesCount = previousPurchases + 1
    const prevSales = contactRecord.getFloat('total_sales_value') || 0
    const prevComm = contactRecord.getFloat('total_commission_earned') || 0

    const newTotalSales = prevSales + saleAmount
    const newTotalComm = prevComm + commissionAmount
    const newAvgComm = newPurchasesCount > 0 ? newTotalComm / newPurchasesCount : 0

    const isRecurring = newPurchasesCount > 1
    const newStatus = isRecurring ? 'cliente_recorrente' : 'cliente'

    // Atualizar categorias de interesse adicionando a comprada
    let categories = contactRecord.get('categories_of_interest') || []
    if (!Array.isArray(categories)) categories = []
    if (productCategory && !categories.includes(productCategory)) {
      categories.push(productCategory)
    }

    // Histórico de produtos comprados
    let purchasedProducts = contactRecord.get('purchased_products') || []
    if (!Array.isArray(purchasedProducts)) purchasedProducts = []
    purchasedProducts.push({
      product_id: productId,
      title: productTitle,
      category: productCategory,
      sale_amount: saleAmount,
      commission_amount: commissionAmount,
      order_id: orderId,
      purchase_date: now,
      channel: channel,
      campaign_id: campaignId,
      conversion_id: conversionId,
    })

    // Relationship Score recalculation
    let relScore = isRecurring ? 90 : 75
    if (categories.length > 1) relScore += 5
    if (contactRecord.getString('status') === 'opt_out') relScore = 0

    // Next Best Action
    let nextAction = isRecurring ? 'Apresentar produto complementar' : 'Enviar conteúdo educativo'
    let nextReason = isRecurring
      ? 'Cliente recorrente! Apresentar produto de alto valor ou reposição complementar.'
      : 'Primeira compra confirmada. Iniciar jornada de pós-compra e valor útil.'

    contactRecord.set('purchases_count', newPurchasesCount)
    contactRecord.set('is_customer', true)
    contactRecord.set('is_recurring_customer', isRecurring)
    contactRecord.set('total_sales_value', newTotalSales)
    contactRecord.set('total_commission_earned', newTotalComm)
    contactRecord.set('average_commission', newAvgComm)
    contactRecord.set('status', newStatus)
    contactRecord.set('categories_of_interest', categories)
    contactRecord.set('purchased_products', purchasedProducts)
    contactRecord.set('relationship_score', Math.min(100, relScore))
    contactRecord.set('next_best_action', nextAction)
    contactRecord.set('next_best_action_reason', nextReason)
    if (!contactRecord.getString('first_purchase_date')) {
      contactRecord.set('first_purchase_date', now)
    }
    contactRecord.set('last_purchase_date', now)
    contactRecord.set('last_interaction_date', now)

    // Timeline update
    let timeline = contactRecord.get('timeline') || []
    if (!Array.isArray(timeline)) timeline = []

    timeline.push({
      event_type: isRecurring ? 'repurchase_confirmed' : 'purchase_confirmed',
      date: now,
      channel: channel,
      details: `${isRecurring ? 'Recompra' : 'Primeira compra'} atribuída: "${productTitle}" (Pedido ${orderId}) — Comissão: +R$ ${commissionAmount.toFixed(2)}.`,
    })

    timeline.push({
      event_type: 'status_changed',
      date: now,
      details: `Status alterado para ${newStatus === 'cliente_recorrente' ? 'CLIENTE RECORRENTE' : 'CLIENTE'}.`,
    })

    contactRecord.set('timeline', timeline)
    $app.save(contactRecord)

    return e.json(200, {
      success: true,
      contact_id: contactRecord.id,
      is_customer: true,
      is_recurring_customer: isRecurring,
      purchases_count: newPurchasesCount,
      total_commission: newTotalComm,
      status: newStatus,
      message: `Conversão de R$ ${saleAmount.toFixed(2)} atribuída com sucesso. Cliente atualizado para ${newStatus}.`,
    })
  },
  $apis.requireAuth(),
)
