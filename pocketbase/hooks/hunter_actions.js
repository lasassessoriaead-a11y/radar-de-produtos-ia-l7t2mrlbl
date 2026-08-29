// Hook to approve a discovered product and promote it to the main Radar (products collection)
// Or discard a discovered product so it leaves the pending list

routerAdd(
  'POST',
  '/backend/v1/hunter/approve',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const discoveredId = (body.id || body.discovered_id || '').trim()

    if (!discoveredId) {
      return e.badRequestError('ID do produto descoberto obrigatório')
    }

    try {
      const discRec = $app.findFirstRecordByData('discovered_products', 'id', discoveredId)
      const productsCol = $app.findCollectionByNameOrId('products')

      // Check if product already in main products collection by product_url or title
      let mainRec
      let isNewMain = false
      const title = discRec.getString('title')
      const prodUrl = discRec.getString('product_url')

      try {
        if (prodUrl) {
          mainRec = $app.findFirstRecordByData('products', 'product_url', prodUrl)
        } else {
          mainRec = $app.findFirstRecordByData('products', 'title', title)
        }
      } catch (_) {
        mainRec = new Record(productsCol)
        isNewMain = true
      }

      mainRec.set('title', title)
      mainRec.set('image_url', discRec.getString('image_url'))
      mainRec.set('platform', discRec.getString('platform'))
      mainRec.set('category', discRec.getString('category'))
      mainRec.set('niche', discRec.getString('niche') || 'Oportunidade Caçador')
      mainRec.set('price', discRec.getFloat('price'))
      mainRec.set('promo_price', discRec.getFloat('promo_price'))
      mainRec.set('commission_rate', discRec.getFloat('commission_rate'))
      mainRec.set('commission_amount', discRec.getFloat('commission_amount'))
      mainRec.set('sales_count', discRec.getFloat('sales_count'))
      mainRec.set('reviews_count', discRec.getFloat('reviews_count'))
      mainRec.set('rating', discRec.getFloat('rating'))
      mainRec.set('seller', discRec.getString('seller'))
      mainRec.set('product_url', prodUrl)
      mainRec.set('affiliate_url', discRec.getString('affiliate_url') || prodUrl)
      mainRec.set('competition_level', discRec.getFloat('competition_level') || 5)
      mainRec.set('trends_score', discRec.getFloat('trends_score') || 7)
      mainRec.set('demand_score', discRec.getFloat('demand_score') || 7)
      mainRec.set('opportunity_score', discRec.getFloat('opportunity_score'))
      mainRec.set('opportunity_level', discRec.getString('opportunity_level') || 'good')
      mainRec.set('ai_analysis', discRec.getString('ai_analysis'))
      mainRec.set('ai_summary', discRec.getString('ai_summary'))
      mainRec.set('source', 'api')
      mainRec.set('metadata', {
        discovered_id: discRec.id,
        external_id: discRec.getString('external_id'),
        approved_at: new Date().toISOString(),
      })

      $app.save(mainRec)

      // Mark discovered record as approved
      discRec.set('status', 'approved')
      discRec.set('radar_product_id', mainRec.id)
      $app.save(discRec)

      return e.json(200, {
        success: true,
        message: 'Produto aprovado e adicionado ao Radar com sucesso!',
        product: mainRec,
        discovered: discRec,
      })
    } catch (err) {
      console.log('Error approving product: ' + err)
      return e.json(500, { error: 'Erro ao aprovar produto para o Radar: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/hunter/discard',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const discoveredId = (body.id || body.discovered_id || '').trim()

    if (!discoveredId) {
      return e.badRequestError('ID do produto descoberto obrigatório')
    }

    try {
      const discRec = $app.findFirstRecordByData('discovered_products', 'id', discoveredId)
      discRec.set('status', 'discarded')
      $app.save(discRec)

      return e.json(200, {
        success: true,
        message: 'Produto descartado da lista de oportunidades.',
        discovered: discRec,
      })
    } catch (err) {
      console.log('Error discarding product: ' + err)
      return e.json(500, { error: 'Erro ao descartar produto: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
