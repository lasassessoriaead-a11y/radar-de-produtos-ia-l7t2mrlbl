// Endpoint for searching real products on Mercado Livre API
// Adapter architecture ready for multiple marketplaces
// Deduplicates by (platform, external_id) and creates snapshot history

routerAdd(
  'POST',
  '/backend/v1/hunter/search',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const query = (body.query || '').trim()
    const category = (body.category || '').trim()
    const minPrice = parseFloat(body.min_price) || 0
    const maxPrice = parseFloat(body.max_price) || 0
    const minSales = parseInt(body.min_sales, 10) || 0
    const minRating = parseFloat(body.min_rating) || 0
    const estimatedCommissionRate = parseFloat(body.estimated_commission_rate) || 0
    const marketplace = (body.marketplace || 'Mercado Livre').trim()
    const limit = Math.min(30, Math.max(5, parseInt(body.limit, 10) || 15))

    if (!query && !category) {
      return e.badRequestError('Informe uma palavra-chave ou categoria para buscar.')
    }

    // Check for ML token in env or secrets or body override
    const mlToken = (body.ml_token || $os.getenv('MERCADO_LIVRE_ACCESS_TOKEN') || '').trim()

    // 1. Adapter Execution for Mercado Livre
    let rawItems = []
    let apiStatus = 'ok'
    let requiresAuthMessage = ''

    if (marketplace === 'Mercado Livre') {
      try {
        let mlUrl = 'https://api.mercadolibre.com/sites/MLB/search?'
        const params = []
        if (query) params.push('q=' + encodeURIComponent(query))
        if (category && category !== 'Todas' && category !== 'Geral') {
          // If category is not in query, append it
          if (!query.toLowerCase().includes(category.toLowerCase())) {
            params.push('q=' + encodeURIComponent(category + ' ' + query))
          }
        }
        if (minPrice > 0 || maxPrice > 0) {
          const priceRange = `${minPrice > 0 ? minPrice : '*'}-${maxPrice > 0 ? maxPrice : '*'}`
          params.push('price=' + encodeURIComponent(priceRange))
        }
        params.push('limit=' + limit)

        mlUrl += params.join('&')

        const headers = {
          'User-Agent': 'RadarDeProdutosIA/2.0',
          Accept: 'application/json',
        }
        if (mlToken) {
          headers['Authorization'] = 'Bearer ' + mlToken
        }

        const res = $http.send({
          url: mlUrl,
          method: 'GET',
          headers: headers,
          timeout: 15,
        })

        if (res.statusCode === 200) {
          const parsed = res.json || {}
          rawItems = parsed.results || []
        } else if (res.statusCode === 403 || res.statusCode === 401) {
          apiStatus = 'token_required'
          requiresAuthMessage =
            'Conecte seu token gratuito do Mercado Livre para ativar a busca em tempo real. Você pode gerá-lo no Mercado Livre Developers e informá-lo em Configurações > Token Mercado Livre.'
        } else {
          apiStatus = 'api_error'
          requiresAuthMessage = `Mercado Livre retornou status HTTP ${res.statusCode}. Verifique os parâmetros ou seu token de acesso.`
        }
      } catch (httpErr) {
        console.log('HTTP error fetching ML API: ' + httpErr)
        apiStatus = 'network_error'
        requiresAuthMessage = 'Falha ao conectar com a API do Mercado Livre: ' + httpErr.message
      }
    } else {
      // For future marketplaces not yet officially connected
      return e.json(200, {
        success: true,
        marketplace,
        status: 'unsupported_marketplace',
        message: `O conector para ${marketplace} está preparado na arquitetura e será ativado quando as credenciais forem fornecidas.`,
        products: [],
        total_found: 0,
      })
    }

    if (apiStatus !== 'ok') {
      return e.json(200, {
        success: false,
        marketplace,
        status: apiStatus,
        message: requiresAuthMessage,
        products: [],
        total_found: 0,
      })
    }

    // 2. Normalization Layer (Mercado Livre -> Internal Schema)
    const normalizedList = []
    const discoveredCol = $app.findCollectionByNameOrId('discovered_products')
    const snapshotsCol = $app.findCollectionByNameOrId('product_snapshots')

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i]
      const extId = item.id || ''
      if (!extId) continue

      const title = item.title || 'Produto sem título'
      const price = parseFloat(item.price) || 0
      const originalPrice = parseFloat(item.original_price) || price
      const promoPrice = price < originalPrice && price > 0 ? price : 0
      const effectivePrice = promoPrice > 0 ? promoPrice : price

      // Sold quantity (ML gives sold_quantity)
      const soldQuantity = parseInt(item.sold_quantity, 10) || 0

      // Reviews / Rating (ML returns seller reputation or reviews)
      let rating = 0
      let reviewsCount = 0
      if (item.reviews) {
        rating = parseFloat(item.reviews.rating_average) || 0
        reviewsCount = parseInt(item.reviews.total, 10) || 0
      } else if (item.seller?.seller_reputation) {
        // Fallback to seller reputation rating
        const rep = item.seller.seller_reputation
        if (rep.level_id === '5_green') rating = 4.8
        else if (rep.level_id === '4_light_green') rating = 4.4
        else if (rep.level_id === '3_yellow') rating = 3.9
        else rating = 4.2
      } else {
        rating = 4.5 // Default reasonable estimate
      }

      // Thumbnail normalization
      let thumb = item.thumbnail || ''
      if (thumb && thumb.startsWith('http://')) {
        thumb = thumb.replace('http://', 'https://')
      }
      // Upscale ML thumbnail (replace -I.jpg with -O.jpg)
      if (thumb && thumb.includes('-I.jpg')) {
        thumb = thumb.replace('-I.jpg', '-O.jpg')
      }

      const sellerName =
        item.seller?.nickname || item.official_store_name || 'Vendedor Mercado Livre'
      const permalink = item.permalink || `https://produto.mercadolivre.com.br/MLB-${extId}`

      // Commission: NOT provided by ML API. If user supplied an estimate or default, use it and mark flag
      let commRate = estimatedCommissionRate > 0 ? estimatedCommissionRate : 0
      let commAmount = 0
      let isEstimated = true
      if (commRate > 0 && effectivePrice > 0) {
        commAmount = Math.round(effectivePrice * (commRate / 100) * 100) / 100
      }

      // Filter checks on normalized data
      if (minSales > 0 && soldQuantity < minSales) continue
      if (minRating > 0 && rating > 0 && rating < minRating) continue

      // Estimated demand/trend scores from sales velocity
      const trendsScore = soldQuantity > 500 ? 9 : soldQuantity > 100 ? 7 : 5
      const demandScore = soldQuantity > 1000 ? 9 : soldQuantity > 200 ? 7 : 5
      const competitionLevel = soldQuantity > 2000 ? 8 : 5

      // 3. Deduplication Check in discovered_products
      let record
      let isNew = false
      try {
        record = $app.findFirstRecordByData('discovered_products', 'external_id', extId)
      } catch (_) {
        record = new Record(discoveredCol)
        isNew = true
      }

      record.set('external_id', extId)
      record.set('platform', 'Mercado Livre')
      record.set('title', title)
      record.set('image_url', thumb)
      record.set('category', category || 'Mercado Livre')
      record.set('price', originalPrice > price ? originalPrice : price)
      record.set('promo_price', promoPrice)
      record.set('commission_rate', commRate)
      record.set('commission_amount', commAmount)
      record.set('commission_is_estimated', isEstimated)
      record.set('sales_count', soldQuantity)
      record.set('reviews_count', reviewsCount)
      record.set('rating', rating)
      record.set('seller', sellerName)
      record.set('product_url', permalink)
      record.set('competition_level', competitionLevel)
      record.set('trends_score', trendsScore)
      record.set('demand_score', demandScore)
      record.set('source', 'api')
      record.set('raw_data', {
        id: item.id,
        site_id: item.site_id,
        condition: item.condition,
        installments: item.installments,
        shipping: item.shipping,
        available_quantity: item.available_quantity,
      })

      if (isNew) {
        record.set('status', 'pending')
      }

      $app.save(record)

      // 4. Record Snapshot for Trend History
      try {
        const snap = new Record(snapshotsCol)
        snap.set('discovered_id', record.id)
        snap.set('external_id', extId)
        snap.set('platform', 'Mercado Livre')
        snap.set('price', record.getFloat('price'))
        snap.set('promo_price', record.getFloat('promo_price'))
        snap.set('commission_rate', record.getFloat('commission_rate'))
        snap.set('commission_amount', record.getFloat('commission_amount'))
        snap.set('sales_count', record.getFloat('sales_count'))
        snap.set('reviews_count', record.getFloat('reviews_count'))
        snap.set('rating', record.getFloat('rating'))
        snap.set('opportunity_score', record.getFloat('opportunity_score'))
        snap.set('ranking_position', i + 1)
        snap.set('snapshot_date', new Date().toISOString())
        $app.save(snap)
      } catch (snapErr) {
        console.log('Error saving snapshot: ' + snapErr)
      }

      normalizedList.push(record)
    }

    // Sort by opportunity_score descending
    normalizedList.sort((a, b) => b.getFloat('opportunity_score') - a.getFloat('opportunity_score'))

    return e.json(200, {
      success: true,
      marketplace: 'Mercado Livre',
      status: 'ok',
      total_found: normalizedList.length,
      products: normalizedList,
    })
  },
  $apis.requireAuth(),
)
