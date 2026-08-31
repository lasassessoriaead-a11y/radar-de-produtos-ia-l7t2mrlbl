// Shopee connection state.
// Manual mode works even if the optional persistence collection has not been migrated yet.
// Open API is never declared connected without real credential validation.

function virtualShopeeConnection() {
  return {
    persisted: false,
    mode: 'manual',
    manual_enabled: true,
    api_status: 'waiting_credentials',
    app_id_masked: '',
    status_message:
      'Modo Manual ativo. Open API preparada, aguardando AppId/Secret liberados pela Shopee.',
    last_tested_at: '',
    metadata: {
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
    },
  }
}

function getShopeeConnection(userId) {
  try {
    const rows = $app.findRecordsByFilter(
      'marketplace_connections',
      `user_id = '${userId}' && marketplace = 'shopee'`,
      '-created',
      1,
      0,
    )
    if (rows.length) {
      return { persisted: true, record: rows[0] }
    }
  } catch (_) {
    // Collection may not exist yet in the Skip runtime. Manual mode must still work.
  }

  try {
    const col = $app.findCollectionByNameOrId('marketplace_connections')
    const rec = new Record(col)
    rec.set('user_id', userId)
    rec.set('marketplace', 'shopee')
    rec.set('mode', 'manual')
    rec.set('manual_enabled', true)
    rec.set('api_status', 'waiting_credentials')
    rec.set(
      'status_message',
      'Modo Manual ativo. Open API preparada, aguardando AppId/Secret liberados pela Shopee.',
    )
    rec.set('metadata', virtualShopeeConnection().metadata)
    $app.save(rec)
    return { persisted: true, record: rec }
  } catch (err) {
    console.log('Shopee persistence unavailable; using virtual manual mode:', err)
    return virtualShopeeConnection()
  }
}

function serializeShopeeConnection(conn) {
  if (!conn.persisted) return conn
  const rec = conn.record
  return {
    persisted: true,
    mode: rec.getString('mode') || 'manual',
    manual_enabled: rec.getBool('manual_enabled'),
    api_status: rec.getString('api_status') || 'waiting_credentials',
    app_id_masked: rec.getString('app_id_masked') || '',
    status_message: rec.getString('status_message') || '',
    last_tested_at: rec.getString('last_tested_at') || '',
    metadata: rec.get('metadata') || {},
  }
}

routerAdd(
  'GET',
  '/backend/v1/marketplaces/shopee/status',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    try {
      const data = serializeShopeeConnection(getShopeeConnection(userId))
      return e.json(200, {
        success: true,
        marketplace: 'Shopee',
        mode: data.mode || 'manual',
        manual_enabled: data.manual_enabled !== false,
        api_status: data.api_status || 'waiting_credentials',
        app_id_masked: data.app_id_masked || '',
        status_message: data.status_message || '',
        last_tested_at: data.last_tested_at || '',
        capabilities: data.metadata || {},
        persisted: data.persisted === true,
      })
    } catch (err) {
      console.log('Shopee status error:', err)
      // Manual mode is a capability of the app and doesn't need external credentials.
      return e.json(200, {
        success: true,
        marketplace: 'Shopee',
        mode: 'manual',
        manual_enabled: true,
        api_status: 'waiting_credentials',
        status_message:
          'Modo Manual disponível. Persistência da preferência ainda não está disponível neste runtime.',
        capabilities: virtualShopeeConnection().metadata,
        persisted: false,
      })
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
      const conn = getShopeeConnection(userId)

      if (conn.persisted) {
        const rec = conn.record
        rec.set('mode', mode)
        rec.set('manual_enabled', true)

        if (mode === 'manual') {
          rec.set(
            'status_message',
            'Modo Manual ativo: use Sub_id 1–5, gere o link na Shopee e importe o relatório de conversões no Radar.',
          )
        } else if (rec.getString('api_status') !== 'configured') {
          rec.set('api_status', 'waiting_credentials')
          rec.set(
            'status_message',
            'Open API selecionada, mas ainda não conectada. Aguardando AppId/Secret liberados pela Shopee. O modo Manual continua disponível.',
          )
        }
        $app.save(rec)

        return e.json(200, {
          success: true,
          mode,
          manual_enabled: true,
          api_status: rec.getString('api_status') || 'waiting_credentials',
          status_message: rec.getString('status_message') || '',
          persisted: true,
        })
      }

      // Graceful fallback: manual mode must remain operational even before migration.
      return e.json(200, {
        success: true,
        mode,
        manual_enabled: true,
        api_status: 'waiting_credentials',
        status_message:
          mode === 'manual'
            ? 'Modo Manual ativo. A preferência está temporariamente sem persistência no backend, mas o fluxo de Sub_ids e links pode ser usado.'
            : 'Open API selecionada visualmente. Aguardando credenciais/liberação da Shopee; o modo Manual continua disponível.',
        persisted: false,
      })
    } catch (err) {
      console.log('Shopee mode update error:', err)
      // Never block manual operation because the optional settings persistence failed.
      if (mode === 'manual') {
        return e.json(200, {
          success: true,
          mode: 'manual',
          manual_enabled: true,
          api_status: 'waiting_credentials',
          status_message:
            'Modo Manual ativo sem persistência de preferência. O restante do fluxo Shopee continua disponível.',
          persisted: false,
        })
      }

      return e.json(500, {
        success: false,
        error: 'Falha ao preparar Open API: ' + (err.message || 'erro interno'),
      })
    }
  },
  $apis.requireAuth(),
)
