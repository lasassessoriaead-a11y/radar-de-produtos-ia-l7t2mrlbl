// Hook for Publishing Provider: Telegram Official Bot API & Manual Publishing
// Routes:
//   POST /backend/v1/publish/telegram -> Real publish to Telegram Bot API
//   POST /backend/v1/publish/manual-prepare -> Prepare manual bundle
//   POST /backend/v1/publish/manual-mark -> Mark manual publication as completed
//   POST /backend/v1/channels/telegram/test -> Test Telegram bot token and chat connection
//   POST /backend/v1/channels/telegram/save -> Save Telegram channel connection

routerAdd(
  'POST',
  '/backend/v1/channels/telegram/test',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const botToken = (body.bot_token || '').trim()
    const chatId = (body.chat_id || '').trim()

    if (!botToken || !chatId) {
      return e.badRequestError('Bot Token e Chat ID são obrigatórios para testar a conexão.')
    }

    try {
      // 1. Test getMe on Telegram API
      const getMeRes = $http.send({
        url: `https://api.telegram.org/bot${botToken}/getMe`,
        method: 'GET',
        timeout: 10,
      })

      if (getMeRes.statusCode !== 200) {
        return e.json(400, {
          success: false,
          error: 'Bot Token inválido ou não autorizado pelo Telegram.',
        })
      }

      const botInfo = getMeRes.json?.result || {}
      const botUsername = botInfo.username
        ? `@${botInfo.username}`
        : botInfo.first_name || 'Telegram Bot'

      // 2. Test sending a silent test message to verify chat/channel permissions
      const testMsgRes = $http.send({
        url: `https://api.telegram.org/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🟢 *Radar de Produtos IA — Conexão Verificada*\n\nSeu bot *${botUsername}* foi conectado com sucesso para publicações automáticas.`,
          parse_mode: 'Markdown',
          disable_notification: true,
        }),
        timeout: 12,
      })

      if (testMsgRes.statusCode !== 200) {
        const errorDesc =
          testMsgRes.json?.description || 'Verifique se o bot é administrador do canal/grupo.'
        return e.json(400, {
          success: false,
          bot_username: botUsername,
          error: `Bot autenticado (${botUsername}), mas falhou ao enviar para o Chat ID: ${errorDesc}`,
        })
      }

      return e.json(200, {
        success: true,
        bot_username: botUsername,
        chat_id: chatId,
        message: `Conexão bem-sucedida com ${botUsername} no chat ${chatId}!`,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Falha na requisição ao Telegram: ' + err.message,
      })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/channels/telegram/save',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const botToken = (body.bot_token || '').trim()
    const chatId = (body.chat_id || '').trim()
    const displayName = (body.display_name || 'Canal Telegram').trim()

    if (!botToken || !chatId) {
      return e.badRequestError('Bot Token e Chat ID são obrigatórios')
    }

    try {
      const connCol = $app.findCollectionByNameOrId('channel_connections')
      let connRec = null

      try {
        const existing = $app.findRecordsByFilter(
          'channel_connections',
          `user_id = '${userId}' && channel_type = 'telegram'`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) connRec = existing[0]
      } catch (_) {}

      if (!connRec) {
        connRec = new Record(connCol)
      }

      // Encrypt token securely
      const secretKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY') || 'radar_enc_key_32_bytes_pad_001'
      const safeKey = secretKey.slice(0, 32).padEnd(32, '0')
      const encryptedToken = $security.encrypt(botToken, safeKey)

      const maskedToken = botToken.slice(0, 6) + '...' + botToken.slice(-4)

      connRec.set('user_id', userId)
      connRec.set('channel_type', 'telegram')
      connRec.set('display_name', displayName)
      connRec.set('is_active', true)
      connRec.set('is_connected', true)
      connRec.set('credentials_masked', {
        masked_token: maskedToken,
        chat_id: chatId,
        bot_username: body.bot_username || '',
      })
      connRec.set('credentials_encrypted', encryptedToken)
      connRec.set('settings', {
        chat_id: chatId,
        auto_publish_enabled: true,
      })
      connRec.set('last_tested_at', new Date().toISOString())
      connRec.set('status_message', 'Conexão ativa e verificada com Telegram Bot API.')

      $app.save(connRec)

      // Audit log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('entity_type', 'channel')
        audit.set('entity_id', connRec.id)
        audit.set('action', 'channel_connected')
        audit.set('title', `Canal Telegram conectado: ${displayName}`)
        audit.set('details', { chat_id: chatId, bot_username: body.bot_username || '' })
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        channel_id: connRec.id,
        is_connected: true,
        display_name: displayName,
        chat_id: chatId,
        masked_token: maskedToken,
      })
    } catch (err) {
      console.log('Error saving telegram channel:', err)
      return e.json(500, { error: 'Erro ao salvar conexão Telegram: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/publish/telegram',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignId = (body.campaign_id || '').trim()
    const publicationId = (body.publication_id || '').trim()
    const creativeImageUrl = (body.image_url || '').trim()
    const copyText = (body.copy_text || '').trim()
    const ctaText = (body.cta_text || 'Conferir Oferta').trim()
    const trackingUrl = (body.tracking_url || '').trim()
    const price = parseFloat(body.price || '0')
    const promoPrice = parseFloat(body.promo_price || '0')

    if (!copyText || !trackingUrl) {
      return e.badRequestError('Texto da mensagem e Link de rastreamento são obrigatórios.')
    }

    try {
      // 1. Get user telegram connection
      let connRec = null
      try {
        const existing = $app.findRecordsByFilter(
          'channel_connections',
          `user_id = '${userId}' && channel_type = 'telegram' && is_connected = true`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) connRec = existing[0]
      } catch (_) {}

      if (!connRec) {
        return e.json(400, {
          success: false,
          error: 'Canal Telegram não conectado. Configure o Bot Token e Chat ID nas Conexões.',
        })
      }

      const settings = connRec.get('settings') || {}
      const chatId = settings.chat_id || connRec.get('credentials_masked')?.chat_id
      const encryptedToken = connRec.getString('credentials_encrypted')

      const secretKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY') || 'radar_enc_key_32_bytes_pad_001'
      const safeKey = secretKey.slice(0, 32).padEnd(32, '0')
      const botToken = $security.decrypt(encryptedToken, safeKey)

      if (!botToken || !chatId) {
        return e.json(400, {
          success: false,
          error: 'Credenciais do Telegram incompletas ou corrompidas.',
        })
      }

      // Format Telegram Message with inline button for CTA
      let formattedText = copyText

      // If price info present, append nicely if not in text
      if (promoPrice > 0 && !copyText.includes(promoPrice.toFixed(2))) {
        formattedText += `\n\n💰 *Por apenas R$ ${promoPrice.toFixed(2)}*`
      }

      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: `🛒 ${ctaText}`,
              url: trackingUrl,
            },
          ],
        ],
      }

      let tgRes
      // If we have an image URL, use sendPhoto, otherwise sendMessage
      if (
        creativeImageUrl &&
        (creativeImageUrl.startsWith('http://') || creativeImageUrl.startsWith('https://'))
      ) {
        tgRes = $http.send({
          url: `https://api.telegram.org/bot${botToken}/sendPhoto`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: creativeImageUrl,
            caption: formattedText.slice(0, 1024), // Telegram caption limit
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          }),
          timeout: 15,
        })
      } else {
        tgRes = $http.send({
          url: `https://api.telegram.org/bot${botToken}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: formattedText,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          }),
          timeout: 15,
        })
      }

      if (tgRes.statusCode !== 200) {
        const errDesc =
          tgRes.json?.description || 'Erro desconhecido retornado pela Telegram Bot API'
        return e.json(400, {
          success: false,
          error: `Falha ao publicar no Telegram: ${errDesc}`,
        })
      }

      const tgResult = tgRes.json?.result || {}
      const messageId = String(tgResult.message_id || '')

      // Update or create publication record
      const pubCol = $app.findCollectionByNameOrId('publications')
      let pubRec
      if (publicationId) {
        try {
          pubRec = $app.findRecordById('publications', publicationId)
        } catch (_) {
          pubRec = new Record(pubCol)
        }
      } else {
        pubRec = new Record(pubCol)
      }

      pubRec.set('user_id', userId)
      pubRec.set('campaign_id', campaignId)
      pubRec.set('variation_id', body.variation_id || '')
      pubRec.set('creative_id', body.creative_id || '')
      pubRec.set('product_id', body.product_id || '')
      pubRec.set('channel', 'Telegram')
      pubRec.set('channel_type', 'telegram')
      pubRec.set('publication_mode', 'telegram_bot')
      pubRec.set('status', 'published')
      pubRec.set('published_at', new Date().toISOString())
      pubRec.set('external_message_id', messageId)
      pubRec.set('external_post_url', `https://t.me/c/${chatId.replace('-100', '')}/${messageId}`)
      pubRec.set('copy_used', copyText)
      pubRec.set('cta_used', ctaText)
      pubRec.set('creative_image_url', creativeImageUrl)
      pubRec.set('tracking_full_url', trackingUrl)
      pubRec.set('destination_url', body.destination_url || '')
      pubRec.set('price_at_publish', price || promoPrice || 0)
      $app.save(pubRec)

      // Update Campaign status to published
      if (campaignId) {
        try {
          const campRec = $app.findRecordById('campaigns', campaignId)
          campRec.set('status', 'published')
          $app.save(campRec)
        } catch (_) {}
      }

      // Audit Log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('entity_type', 'publication')
        audit.set('entity_id', pubRec.id)
        audit.set('action', 'published_telegram')
        audit.set('title', `Publicado no Telegram com sucesso`)
        audit.set('details', { message_id: messageId, chat_id: chatId })
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        publication_id: pubRec.id,
        message_id: messageId,
        published_at: pubRec.getString('published_at'),
        message: 'Campanha publicada no canal do Telegram com sucesso!',
      })
    } catch (err) {
      console.log('Error in publish telegram:', err)
      return e.json(500, { error: 'Erro ao processar publicação: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/publish/manual-mark',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignId = (body.campaign_id || '').trim()
    const variationId = (body.variation_id || '').trim()
    const creativeId = (body.creative_id || '').trim()
    const productId = (body.product_id || '').trim()
    const channel = (body.channel || 'Instagram').trim()
    const channelType = (body.channel_type || 'instagram').toLowerCase()
    const postUrl = (body.post_url || '').trim()
    const copyUsed = (body.copy_used || '').trim()
    const ctaUsed = (body.cta_used || '').trim()
    const creativeImageUrl = (body.creative_image_url || '').trim()
    const trackingUrl = (body.tracking_url || '').trim()
    const trackingLinkId = (body.tracking_link_id || '').trim()
    const priceAtPublish = parseFloat(body.price_at_publish || '0')

    try {
      const pubCol = $app.findCollectionByNameOrId('publications')
      const pubRec = new Record(pubCol)

      pubRec.set('user_id', userId)
      pubRec.set('campaign_id', campaignId)
      pubRec.set('variation_id', variationId)
      pubRec.set('creative_id', creativeId)
      pubRec.set('product_id', productId)
      pubRec.set('channel', channel)
      pubRec.set('channel_type', channelType)
      pubRec.set('publication_mode', 'manual_tracked')
      pubRec.set('status', 'published')
      pubRec.set('published_at', body.published_at || new Date().toISOString())
      pubRec.set('external_post_url', postUrl)
      pubRec.set('copy_used', copyUsed)
      pubRec.set('cta_used', ctaUsed)
      pubRec.set('creative_image_url', creativeImageUrl)
      pubRec.set('tracking_link_id', trackingLinkId)
      pubRec.set('tracking_full_url', trackingUrl)
      pubRec.set('price_at_publish', priceAtPublish)
      pubRec.set('checklist_snapshot', body.checklist_snapshot || {})
      $app.save(pubRec)

      // Update Campaign status to published
      if (campaignId) {
        try {
          const campRec = $app.findRecordById('campaigns', campaignId)
          campRec.set('status', 'published')
          $app.save(campRec)
        } catch (_) {}
      }

      // Audit Log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('user_id', userId)
        audit.set('entity_type', 'publication')
        audit.set('entity_id', pubRec.id)
        audit.set('action', 'manual_marked')
        audit.set('title', `Publicação manual registrada em ${channel}`)
        audit.set('details', { post_url: postUrl, channel: channel })
        $app.save(audit)
      } catch (_) {}

      return e.json(200, {
        success: true,
        publication_id: pubRec.id,
        message: 'Publicação manual registrada com rastreamento ativo!',
      })
    } catch (err) {
      console.log('Error marking manual publication:', err)
      return e.json(500, { error: 'Erro ao registrar publicação: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
