// Hook for Conversions Engine: CSV Import, Manual Entry, Attribution & Recalculation
// Routes:
//   POST /backend/v1/conversions/import-csv -> Process and attribute CSV conversions
//   POST /backend/v1/conversions/create-manual -> Manual conversion entry
//   GET  /backend/v1/performance/summary -> Complete verified performance summary

routerAdd(
  'POST',
  '/backend/v1/conversions/import-csv',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const rows = Array.isArray(body.rows) ? body.rows : []
    const isTestDataImport = body.is_test_data === true

    if (rows.length === 0) {
      return e.badRequestError('Nenhuma linha de conversão recebida para importação.')
    }

    try {
      const convCol = $app.findCollectionByNameOrId('conversions')
      const imported = []
      let confirmedCount = 0
      let probableCount = 0
      let unattributedCount = 0

      // Cache existing tracking links for user to optimize deterministic sub_id matching
      let allUserLinks = []
      try {
        allUserLinks = $app.findRecordsByFilter(
          'tracking_links',
          `user_id = '${userId}'`,
          '-created',
          200,
          0,
        )
      } catch (_) {}

      // Cache campaigns
      let allCampaigns = []
      try {
        allCampaigns = $app.findRecordsByFilter(
          'campaigns',
          `user_id = '${userId}'`,
          '-created',
          100,
          0,
        )
      } catch (_) {}

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rawSubId = (row.sub_id || row.tracking_id || row.tag || '').trim()
        const saleAmount = parseFloat(row.sale_amount || row.venda || row.valor || '0')
        const commAmount = parseFloat(row.commission_amount || row.comissao || '0')
        const orderId = (
          row.order_id ||
          row.id_pedido ||
          row.id_externo ||
          `csv_${Date.now()}_${i}`
        ).trim()
        const status = (row.status || 'confirmed').toLowerCase()
        const convDate = row.date || row.data || new Date().toISOString()
        const rawProductName = (row.product_name || row.produto || '').trim().toLowerCase()
        const isRowTest = row.is_test_data !== undefined ? !!row.is_test_data : isTestDataImport

        let attributionConfidence = 'unattributed'
        let attributionMethod = 'none'
        let matchedLinkId = ''
        let matchedCampId = ''
        let matchedVarId = ''
        let matchedCreativeId = ''
        let matchedPubId = ''
        let matchedChannel = row.channel || ''

        // 1. DETERMINISTIC MATCH via exact sub_id
        if (rawSubId) {
          const matchedLink = allUserLinks.find(
            (l) => l.getString('sub_id') === rawSubId || l.getString('slug') === rawSubId,
          )
          if (matchedLink) {
            attributionConfidence = 'confirmed'
            attributionMethod = 'exact_sub_id'
            matchedLinkId = matchedLink.id
            matchedCampId = matchedLink.getString('campaign_id')
            matchedVarId = matchedLink.getString('variation_id')
            matchedCreativeId = matchedLink.getString('creative_id')
            matchedPubId = matchedLink.getString('publication_id')
            matchedChannel = matchedLink.getString('channel') || matchedChannel
          }
        }

        // 2. PROBABLE MATCH via Product Title + Unique Active Campaign
        if (attributionConfidence === 'unattributed' && rawProductName) {
          const matchedCamp = allCampaigns.find((c) => {
            const title = (c.getString('product_title') || '').toLowerCase()
            return title.includes(rawProductName) || rawProductName.includes(title)
          })

          if (matchedCamp) {
            attributionConfidence = 'probable'
            attributionMethod = 'product_and_time_match'
            matchedCampId = matchedCamp.id
            matchedChannel = matchedCamp.getString('primary_channel') || matchedChannel
          }
        }

        if (attributionConfidence === 'confirmed') confirmedCount++
        else if (attributionConfidence === 'probable') probableCount++
        else unattributedCount++

        // Save conversion record
        const convRec = new Record(convCol)
        convRec.set('user_id', userId)
        convRec.set('product_id', row.product_id || '')
        convRec.set('campaign_id', matchedCampId)
        convRec.set('variation_id', matchedVarId)
        convRec.set('creative_id', matchedCreativeId)
        convRec.set('publication_id', matchedPubId)
        convRec.set('tracking_link_id', matchedLinkId)
        convRec.set('sub_id', rawSubId)
        convRec.set('external_order_id', orderId)
        convRec.set('channel', matchedChannel || 'Afiliados Geral')
        convRec.set('sale_amount', saleAmount)
        convRec.set('commission_amount', commAmount)
        convRec.set('currency', row.currency || 'BRL')
        convRec.set(
          'status',
          status === 'cancelada' ? 'canceled' : status === 'estornada' ? 'refunded' : 'confirmed',
        )
        convRec.set('source_type', 'csv_import')
        convRec.set('attribution_confidence', attributionConfidence)
        convRec.set('attribution_method', attributionMethod)
        convRec.set('conversion_date', convDate)
        convRec.set('raw_payload', row)
        convRec.set('is_test_data', isRowTest)
        $app.save(convRec)

        // If matched to variation and confirmed/probable, update variation counters
        if (matchedVarId) {
          try {
            const vRec = $app.findRecordById('campaign_variations', matchedVarId)
            const currentConv = vRec.getInt('conversions') || 0
            const currentSales = vRec.getInt('sales_count') || 0
            const currentComm = vRec.getFloat('total_commission') || 0
            vRec.set('conversions', currentConv + 1)
            vRec.set('sales_count', currentSales + 1)
            vRec.set('total_commission', currentComm + commAmount)
            $app.save(vRec)
          } catch (_) {}
        }

        imported.push({
          id: convRec.id,
          order_id: orderId,
          attribution: attributionConfidence,
          commission: commAmount,
          campaign_id: matchedCampId,
        })
      }

      // Audit Log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('entity_type', 'conversion')
        audit.set('entity_id', '')
        audit.set('action', 'csv_imported')
        audit.set('title', `Importadas ${rows.length} conversões via CSV`)
        audit.set('details', {
          total: rows.length,
          confirmed: confirmedCount,
          probable: probableCount,
          unattributed: unattributedCount,
        })
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        total_imported: rows.length,
        confirmed_count: confirmedCount,
        probable_count: probableCount,
        unattributed_count: unattributedCount,
        imported_rows: imported,
      })
    } catch (err) {
      console.log('Error importing CSV conversions:', err)
      return e.json(500, { error: 'Erro ao importar conversões: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/conversions/create-manual',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const saleAmount = parseFloat(body.sale_amount || '0')
    const commissionAmount = parseFloat(body.commission_amount || '0')
    const isTestDataManual = !!body.is_test_data

    if (saleAmount <= 0 && commissionAmount <= 0) {
      return e.badRequestError('Valor da venda ou comissão é obrigatório.')
    }

    try {
      const convCol = $app.findCollectionByNameOrId('conversions')
      const convRec = new Record(convCol)

      convRec.set('user_id', userId)
      convRec.set('product_id', body.product_id || '')
      convRec.set('campaign_id', body.campaign_id || '')
      convRec.set('variation_id', body.variation_id || '')
      convRec.set('creative_id', body.creative_id || '')
      convRec.set('publication_id', body.publication_id || '')
      convRec.set('tracking_link_id', body.tracking_link_id || '')
      convRec.set('sub_id', body.sub_id || '')
      convRec.set('external_order_id', body.external_order_id || `manual_${Date.now()}`)
      convRec.set('channel', body.channel || 'Manual')
      convRec.set('sale_amount', saleAmount)
      convRec.set('commission_amount', commissionAmount)
      convRec.set('currency', body.currency || 'BRL')
      convRec.set('status', body.status || 'confirmed')
      convRec.set('source_type', 'manual_entry')
      convRec.set('attribution_confidence', body.campaign_id ? 'confirmed' : 'unattributed')
      convRec.set('attribution_method', 'manual_entry')
      convRec.set('conversion_date', body.conversion_date || new Date().toISOString())
      convRec.set('notes', body.notes || '')
      convRec.set('is_test_data', isTestDataManual)
      $app.save(convRec)

      return e.json(200, {
        success: true,
        conversion_id: convRec.id,
        message: 'Conversão manual registrada com sucesso!',
      })
    } catch (err) {
      console.log('Error creating manual conversion:', err)
      return e.json(500, { error: 'Erro ao salvar conversão: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/performance/summary',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    try {
      // 1. Publications count
      let pubs = []
      try {
        pubs = $app.findRecordsByFilter('publications', `user_id = '${userId}'`, '-created', 500, 0)
      } catch (_) {}

      // 2. Click events count (Raw vs Valid) — filter out test data for genuine KPIs
      let clicks = []
      try {
        clicks = $app.findRecordsByFilter(
          'click_events',
          `user_id = '${userId}'`,
          '-created',
          2000,
          0,
        )
      } catch (_) {}

      // 3. Conversions count & commission
      let convs = []
      try {
        convs = $app.findRecordsByFilter(
          'conversions',
          `user_id = '${userId}'`,
          '-created',
          1000,
          0,
        )
      } catch (_) {}

      // 4. Costs
      let costs = []
      try {
        costs = $app.findRecordsByFilter(
          'campaign_costs',
          `user_id = '${userId}'`,
          '-created',
          500,
          0,
        )
      } catch (_) {}

      // EXCLUIR DADOS DE TESTE (is_test_data = true) DAS MÉTRICAS REAIS
      const realClicks = clicks.filter((c) => !c.getBool('is_test_data'))
      const realConvs = convs.filter((c) => !c.getBool('is_test_data'))

      const totalPublications = pubs.length
      const rawClicks = realClicks.length
      const validClicks = realClicks.filter((c) => c.getBool('is_valid')).length
      const botClicks = rawClicks - validClicks

      const confirmedConvs = realConvs.filter((c) => c.getString('status') === 'confirmed')
      const totalSales = confirmedConvs.reduce(
        (acc, c) => acc + (c.getFloat('sale_amount') || 0),
        0,
      )
      const totalCommission = confirmedConvs.reduce(
        (acc, c) => acc + (c.getFloat('commission_amount') || 0),
        0,
      )
      const totalCosts = costs.reduce((acc, c) => acc + (c.getFloat('amount') || 0), 0)

      const netProfit = totalCommission - totalCosts
      const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0
      const conversionRate = validClicks > 0 ? (confirmedConvs.length / validClicks) * 100 : 0

      // Performance by Channel breakdown
      const channelMap = {}
      pubs.forEach((p) => {
        const ch = p.getString('channel') || 'Outro'
        if (!channelMap[ch]) {
          channelMap[ch] = {
            channel: ch,
            publications: 0,
            raw_clicks: 0,
            valid_clicks: 0,
            conversions: 0,
            commission: 0,
            costs: 0,
          }
        }
        channelMap[ch].publications++
      })

      realClicks.forEach((c) => {
        const ch = c.getString('channel') || 'Outro'
        if (!channelMap[ch]) {
          channelMap[ch] = {
            channel: ch,
            publications: 0,
            raw_clicks: 0,
            valid_clicks: 0,
            conversions: 0,
            commission: 0,
            costs: 0,
          }
        }
        channelMap[ch].raw_clicks++
        if (c.getBool('is_valid')) channelMap[ch].valid_clicks++
      })

      confirmedConvs.forEach((c) => {
        const ch = c.getString('channel') || 'Outro'
        if (!channelMap[ch]) {
          channelMap[ch] = {
            channel: ch,
            publications: 0,
            raw_clicks: 0,
            valid_clicks: 0,
            conversions: 0,
            commission: 0,
            costs: 0,
          }
        }
        channelMap[ch].conversions++
        channelMap[ch].commission += c.getFloat('commission_amount') || 0
      })

      costs.forEach((c) => {
        const ch = c.getString('channel') || 'Outro'
        if (channelMap[ch]) {
          channelMap[ch].costs += c.getFloat('amount') || 0
        }
      })

      return e.json(200, {
        kpis: {
          publications: totalPublications,
          raw_clicks: rawClicks,
          valid_clicks: validClicks,
          bot_clicks_filtered: botClicks,
          conversions_count: confirmedConvs.length,
          total_sales: totalSales,
          total_commission: totalCommission,
          total_costs: totalCosts,
          net_profit: netProfit,
          roi_percentage: Math.round(roi * 10) / 10,
          conversion_rate: Math.round(conversionRate * 100) / 100,
        },
        channel_breakdown: Object.values(channelMap),
        last_updated: new Date().toISOString(),
      })
    } catch (err) {
      console.log('Error generating performance summary:', err)
      return e.json(500, { error: 'Erro ao carregar resumo de performance: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
