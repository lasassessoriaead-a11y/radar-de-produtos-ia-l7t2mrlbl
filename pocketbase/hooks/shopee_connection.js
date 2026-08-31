// Shopee connection state.
// Manual mode is operational without API credentials.
// Open API remains prepared but cannot be declared connected until real credentials are validated.

function getOrCreateShopeeConnection(userId) {
  let rec = null
  try {
    const rows = $app.findRecordsByFilter(
      'marketplace_connections',
      `user_id = '${userId}' && marketplace = 'shopee'`,
      '-created',
      1,
      0,
    )
    if (rows.length) rec = rows[0]
  } catch (_) {}

  if (!rec) {
    const col = $app.findCollectionByNameOrId('marketplace_connections')
    rec = new Record(col)
    rec.set('user_id', userId)
    rec.set('marketplace', 'shopee')
    rec.set('mode', 'manual')
    rec.set('manual_enabled', true)
    rec.set('api_status', 'waiting_credentials')
    rec.set(
      'status_message',
      'Modo Manual ativo. Open API preparada, aguardando AppId/Secret liberados pela Shopee.',
    )
    rec.set('metadata', {
      manual_capabilities: [
        'advanced_sub_ids_1_5',
        'affiliate_link_registration',
        'csv_conversion_import',
        'deterministic_attribution_by_sub_id_5',
      ],
      api_capabilities_planned: [
        'product_discovery',
        'commission_sync',
        'affiliate_link_generation',
        'conversion_sync',
      ],
    })
    $app.save(rec)
  }
  return rec
}

routerAdd(
  'GET',
  '/backend/v1/marketplaces/shopee/status',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    try {
      const rec = getOrCreateShopeeConnection(userId)
      return e.json(200, {
        success: true,
        marketplace: 'Shopee',
        mode: rec.getString('mode') || 'manual',
        manual_enabled: rec.getBool('manual_enabled'),
        api_status: rec.getString('api_status') || 'waiting_credentials',
        app_id_masked: rec.getString('app_id_masked') || '',
        status_message: rec.getString('status_message') || '',
        last_tested_at: rec.getString('last_tested_at') || '',
        capabilities: rec.get('metadata') || {},
      })
    } catch (err) {
      console.log('Shopee status error:', err)
      return e.json(500, { error: 'Erro ao carregar status da Shopee.' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/marketplaces/shopee/mode',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')
    const body = e.requestInfo().body || {}
    const mode = body.mode === 'open_api' ? 'open_api' : 'manual'

    try {
      const rec = getOrCreateShopeeConnection(userId)
      rec.set('mode', mode)

      if (mode === 'manual') {
        rec.set('manual_enabled', true)
        rec.set(
          'status_message',
          'Modo Manual ativo: use Sub_id 1–5, gere o link na Shopee e importe o relatório de conversões no Radar.',
        )
      } else {
        rec.set('manual_enabled', true)
        if (rec.getString('api_status') !== 'configured') {
          rec.set('api_status', 'waiting_credentials')
          rec.set(
            'status_message',
            'Open API selecionada, mas ainda não conectada. Aguardando AppId/Secret liberados pela Shopee. O modo Manual continua disponível.',
          )
        }
      }

      $app.save(rec)
      return e.json(200, {
        success: true,
        mode,
        manual_enabled: rec.getBool('manual_enabled'),
        api_status: rec.getString('api_status'),
        status_message: rec.getString('status_message'),
      })
    } catch (err) {
      console.log('Shopee mode update error:', err)
      return e.json(500, { error: 'Erro ao atualizar modo da Shopee.' })
    }
  },
  $apis.requireAuth(),
)
