// Hook to manage watchlist items and compute real trend signals from snapshots
// Signals: 📈 rising (subindo), 🔥 trending_hot (em alta), ➡️ stable (estável), 📉 falling (caindo), insufficient_data (dados insuficientes)

routerAdd(
  'POST',
  '/backend/v1/watchlist/toggle',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const externalId = (body.external_id || '').trim()
    const platform = (body.platform || 'Mercado Livre').trim()
    const title = (body.title || '').trim()
    const imageUrl = (body.image_url || '').trim()
    const productUrl = (body.product_url || '').trim()
    const category = (body.category || '').trim()
    const price = parseFloat(body.price) || 0
    const commRate = parseFloat(body.commission_rate) || 0
    const commAmount = parseFloat(body.commission_amount) || 0
    const sales = parseFloat(body.sales_count) || 0
    const rating = parseFloat(body.rating) || 0
    const score = parseFloat(body.opportunity_score) || 50
    const discoveredId = (body.discovered_id || '').trim()
    const productId = (body.product_id || '').trim()

    if (!externalId && !title) {
      return e.badRequestError('ID externo ou título obrigatório')
    }

    const key = externalId || title
    const watchlistCol = $app.findCollectionByNameOrId('watchlist')

    try {
      // Check if already in watchlist
      let existing
      try {
        const found = $app.findRecordsByFilter(
          'watchlist',
          `user_id = '${userId}' && external_id = '${key}'`,
          '',
          1,
          0,
        )
        if (found && found.length > 0) existing = found[0]
      } catch (_) {}

      if (existing) {
        $app.delete(existing)
        return e.json(200, {
          success: true,
          action: 'removed',
          message: 'Removido da Watchlist de acompanhamento',
        })
      } else {
        const rec = new Record(watchlistCol)
        rec.set('user_id', userId)
        rec.set('external_id', key)
        rec.set('platform', platform)
        rec.set('title', title)
        rec.set('image_url', imageUrl)
        rec.set('product_url', productUrl)
        rec.set('category', category)
        rec.set('initial_price', price)
        rec.set('current_price', price)
        rec.set('initial_commission_rate', commRate)
        rec.set('current_commission_rate', commRate)
        rec.set('initial_commission_amount', commAmount)
        rec.set('current_commission_amount', commAmount)
        rec.set('initial_sales_count', sales)
        rec.set('current_sales_count', sales)
        rec.set('initial_rating', rating)
        rec.set('current_rating', rating)
        rec.set('initial_score', score)
        rec.set('current_score', score)
        rec.set('trend_signal', 'insufficient_data')
        rec.set('discovered_id', discoveredId)
        rec.set('product_id', productId)
        $app.save(rec)

        return e.json(200, {
          success: true,
          action: 'added',
          message: 'Adicionado à Watchlist com sucesso!',
          record: rec,
        })
      }
    } catch (err) {
      console.log('Error toggling watchlist: ' + err)
      return e.json(500, { error: 'Erro ao atualizar Watchlist: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/watchlist/items',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    try {
      const items = $app.findRecordsByFilter(
        'watchlist',
        `user_id = '${userId}'`,
        '-current_score',
        50,
        0,
      )

      const enriched = items.map((w) => {
        const extId = w.getString('external_id')
        let snapshots = []
        try {
          snapshots = $app.findRecordsByFilter(
            'product_snapshots',
            `external_id = '${extId}'`,
            '-created',
            10,
            0,
          )
        } catch (_) {}

        // Compute trend signal from snapshots
        let trendSignal = 'insufficient_data'
        let alertReason = ''

        if (snapshots && snapshots.length >= 2) {
          const latest = snapshots[0]
          const prev = snapshots[1]
          const scoreDiff =
            latest.getFloat('opportunity_score') - prev.getFloat('opportunity_score')
          const priceDiff = latest.getFloat('price') - prev.getFloat('price')
          const salesDiff = latest.getFloat('sales_count') - prev.getFloat('sales_count')

          if (scoreDiff >= 5 || salesDiff >= 100) {
            trendSignal = 'trending_hot'
            alertReason = '🔥 Score em forte alta (+ ' + scoreDiff + ' pts)'
          } else if (scoreDiff > 0 || (priceDiff < 0 && Math.abs(priceDiff) >= 5)) {
            trendSignal = 'rising'
            alertReason = priceDiff < 0 ? '📉 Preço caiu (melhor conversão)' : '📈 Score subindo'
          } else if (scoreDiff < -5) {
            trendSignal = 'falling'
            alertReason = '📉 Queda de score de oportunidade'
          } else {
            trendSignal = 'stable'
            alertReason = '➡️ Métricas estáveis'
          }
        }

        return {
          id: w.id,
          external_id: extId,
          platform: w.getString('platform'),
          title: w.getString('title'),
          image_url: w.getString('image_url'),
          product_url: w.getString('product_url'),
          category: w.getString('category'),
          initial_price: w.getFloat('initial_price'),
          current_price: w.getFloat('current_price'),
          initial_score: w.getFloat('initial_score'),
          current_score: w.getFloat('current_score'),
          initial_sales_count: w.getFloat('initial_sales_count'),
          current_sales_count: w.getFloat('current_sales_count'),
          trend_signal: trendSignal,
          alert_reason: alertReason,
          snapshots_count: snapshots ? snapshots.length : 0,
          created: w.getString('created'),
          updated: w.getString('updated'),
        }
      })

      return e.json(200, {
        items: enriched,
        total: enriched.length,
      })
    } catch (err) {
      console.log('Error fetching watchlist: ' + err)
      return e.json(500, { error: 'Erro ao carregar Watchlist: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
