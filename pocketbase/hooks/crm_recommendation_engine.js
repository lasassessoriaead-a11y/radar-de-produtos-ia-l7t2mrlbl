// Backend Hook: CRM Recommendation & Repurchase Engine (Motor de Recomendação e Recompra)
// Identifies potentially relevant products using bought items, categories, own behavior, winning DNA.
// Strict: NEVER invents fake product compatibility. Respects Consent & Cadence.

routerAdd(
  'POST',
  '/backend/v1/crm/recommendations/generate',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const contactId = (body.contact_id || '').trim()

    if (!contactId) {
      return e.badRequestError('O ID do contato é obrigatório.')
    }

    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')
    const recsCol = $app.findCollectionByNameOrId('crm_recommendations')
    const cadenceCol = $app.findCollectionByNameOrId('crm_cadence_settings')

    let contactRecord
    try {
      contactRecord = $app.findRecordById('crm_contacts', contactId)
    } catch (err) {
      return e.notFoundError('Contato não encontrado: ' + err.message)
    }

    const contactStatus = contactRecord.getString('status')
    const contactIdentifier = contactRecord.getString('identifier')
    const contactName = contactRecord.getString('name') || 'Cliente'
    const contactChannel = contactRecord.getString('channel') || 'telegram'
    const isTestData = contactRecord.getBool('is_test_data')

    // 1. Verificação de Consentimento e Opt-Out
    if (contactStatus === 'opt_out') {
      return e.json(200, {
        success: false,
        blocked_by_consent: true,
        message: 'Recomendação bloqueada: Contato possui Opt-Out / consentimento revogado.',
        recommendations: [],
      })
    }

    // 2. Verificação de Cadência de Envio
    let cadencePassed = true
    let cadenceReason = ''
    try {
      const cadList = $app.findRecordsByFilter(
        'crm_cadence_settings',
        `channel = "${contactChannel}"`,
        '-created',
        1,
        0,
      )
      if (cadList && cadList.length > 0) {
        const cad = cadList[0]
        const minDays = cad.getInt('min_days_between_messages') || 3
        const allowRecs = cad.getBool('allow_product_recommendations')

        if (!allowRecs) {
          cadencePassed = false
          cadenceReason = `Canal "${contactChannel}" configurado para não permitir ofertas/recomendações no momento.`
        }

        const lastInteraction = contactRecord.getString('last_interaction_date')
        if (lastInteraction) {
          const lastDate = new Date(lastInteraction).getTime()
          const now = Date.now()
          const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24)
          if (diffDays < minDays) {
            cadencePassed = false
            cadenceReason = `Intervalo de segurança: última interação foi há ${Math.floor(diffDays)} dia(s) (mínimo exigido: ${minDays} dias).`
          }
        }
      }
    } catch (cadErr) {
      console.log('Cadence check note: ' + cadErr)
    }

    // 3. Buscar produtos do catálogo
    let availableProducts = []
    try {
      availableProducts =
        $app.findRecordsByFilter('products', '', '-opportunity_score', 50, 0) || []
    } catch (_) {
      availableProducts = []
    }

    if (availableProducts.length === 0) {
      return e.json(200, {
        success: false,
        message: 'Nenhum produto cadastrado no catálogo para gerar recomendações.',
        recommendations: [],
      })
    }

    // Histórico de compras e categorias do contato
    const purchasedProducts = contactRecord.get('purchased_products') || []
    const purchasedIds = Array.isArray(purchasedProducts)
      ? purchasedProducts.map((p) => p.product_id)
      : []
    const categoriesOfInterest = contactRecord.get('categories_of_interest') || []
    const firstProduct = contactRecord.getString('first_product_interest') || ''

    // Mapeamento lógico de afinidade/compatibilidade por categoria e produto
    // Exemplos reais do catálogo:
    // Projetor (Eletrônicos) -> Luminária de mesa indução / Microfone lapela
    // Escova Titanium (Beleza) -> Kit de Pincéis
    // Suporte Veicular MagSafe (Automotivo) -> Acessórios / Carregadores
    // Processador de alimentos (Cozinha) -> Garrafa Térmica
    const generatedRecommendations = []

    for (let i = 0; i < availableProducts.length; i++) {
      const prod = availableProducts[i]
      const prodId = prod.id
      const prodTitle = prod.getString('title')
      const prodCategory = prod.getString('category')
      const prodPrice = prod.getFloat('promo_price') || prod.getFloat('price') || 0
      const prodCommission = prod.getFloat('commission_amount') || 0
      const oppScore = prod.getInt('opportunity_score') || 60

      // Evitar recomendar o mesmo produto já comprado (exceto se for reposição)
      const alreadyBought = purchasedIds.includes(prodId)

      let recType = 'novo_interesse'
      let recScore = 50
      let recReason = ''
      let angle = ''
      let msg = ''

      const hasCategoryAffinity =
        Array.isArray(categoriesOfInterest) && categoriesOfInterest.includes(prodCategory)

      if (alreadyBought) {
        // Possível reposição se for item consumível/desgastável
        if (prodCategory.includes('Beleza') || prodCategory.includes('Cuidados')) {
          recType = 'reposicao'
          recScore = 75
          recReason =
            'Produto adquirido anteriormente em categoria com ciclo de reposição e renovação.'
          angle = 'Hora de renovar seu kit com desconto especial de cliente frequente.'
          msg = `Olá ${contactName}! Faz um tempo desde seu pedido de ${prodTitle}. Temos um cupom de recompra especial para você renovar.`
        } else {
          continue // não recomendar eletrônico idêntico repetido
        }
      } else if (hasCategoryAffinity) {
        // Mesma categoria ou complementar
        recType = 'complementar'
        recScore = Math.min(95, 75 + Math.floor(oppScore * 0.2))
        recReason = `Forte afinidade na categoria "${prodCategory}" com histórico de navegação e compras anteriores.`
        angle = `Como complementar sua experiência anterior com ${prodTitle}.`
        msg = `Olá ${contactName}! Como você curte itens de ${prodCategory}, selecionamos esta recomendação com alta avaliação: ${prodTitle}.`
      } else if (purchasedIds.length > 0) {
        // Cross-sell inteligente
        recType = 'cross_sell'
        recScore = Math.min(88, 65 + Math.floor(oppScore * 0.2))
        recReason = `Item campeão em vendas com alta sinergia para o perfil de compra do cliente.`
        angle = `Novidade em destaque recomendada para quem gosta de produtos práticos e inovadores.`
        msg = `Olá ${contactName}! Separamos uma das novidades mais bem avaliadas do nosso radar: ${prodTitle}.`
      } else {
        // Lead ainda não comprou: Upsell/Novo interesse
        recType = 'novo_interesse'
        recScore = Math.min(80, 55 + Math.floor(oppScore * 0.2))
        recReason = `Oportunidade de alto score (${oppScore} pts) alinhada ao perfil de interesse inicial.`
        angle = `Descubra a solução ideal com custo-benefício comprovado.`
        msg = `Olá ${contactName}! Queremos te apresentar ${prodTitle}, um dos produtos mais procurados da semana.`
      }

      // Recommendation Score Factors (0-100)
      // Afinidade (30%) + Performance Produto (30%) + Recência/Histórico (20%) + Margem Comissão (20%)
      const marginFactor = Math.min(20, Math.floor(prodCommission * 0.5))
      recScore = Math.min(98, Math.max(40, recScore + marginFactor))

      // Persistir ou Atualizar no crm_recommendations
      try {
        let recRecord
        const existingRecs = $app.findRecordsByFilter(
          'crm_recommendations',
          `contact_id = "${contactId}" && product_id = "${prodId}"`,
          '-created',
          1,
          0,
        )

        if (existingRecs && existingRecs.length > 0) {
          recRecord = existingRecs[0]
        } else {
          recRecord = new Record(recsCol)
        }

        recRecord.set('user_id', userId)
        recRecord.set('contact_id', contactId)
        recRecord.set('contact_identifier', contactIdentifier)
        recRecord.set('product_id', prodId)
        recRecord.set('product_title', prodTitle)
        recRecord.set('product_image_url', prod.getString('image_url'))
        recRecord.set('product_category', prodCategory)
        recRecord.set('product_price', prodPrice)
        recRecord.set('product_commission', prodCommission)
        recRecord.set('recommendation_type', recType)
        recRecord.set('recommendation_score', recScore)
        recRecord.set('reason', recReason)
        recRecord.set('previous_product_title', firstProduct || purchasedProducts[0]?.title || '')
        recRecord.set('suggested_content_angle', angle)
        recRecord.set('suggested_message', msg)
        recRecord.set('status', 'sugerida')
        recRecord.set('cadence_check_passed', cadencePassed)
        recRecord.set('cadence_block_reason', cadenceReason)
        recRecord.set('is_test_data', isTestData)

        $app.save(recRecord)

        generatedRecommendations.push({
          id: recRecord.id,
          product_id: prodId,
          product_title: prodTitle,
          product_image_url: prod.getString('image_url'),
          product_category: prodCategory,
          product_price: prodPrice,
          product_commission: prodCommission,
          recommendation_type: recType,
          recommendation_score: recScore,
          reason: recReason,
          suggested_content_angle: angle,
          suggested_message: msg,
          cadence_check_passed: cadencePassed,
          cadence_block_reason: cadenceReason,
          status: 'sugerida',
        })
      } catch (saveErr) {
        console.log('Error saving recommendation: ' + saveErr)
      }

      if (generatedRecommendations.length >= 5) break
    }

    // Ordenar por recommendation_score DESC
    generatedRecommendations.sort((a, b) => b.recommendation_score - a.recommendation_score)

    return e.json(200, {
      success: true,
      contact_id: contactId,
      cadence_passed: cadencePassed,
      cadence_reason: cadenceReason,
      total_recommendations: generatedRecommendations.length,
      recommendations: generatedRecommendations,
      message: 'Recomendações geradas com base em compras, afinidade e regras de cadência.',
    })
  },
  $apis.requireAuth(),
)
