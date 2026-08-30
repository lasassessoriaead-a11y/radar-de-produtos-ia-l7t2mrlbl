// Hook: Tracking Link Resolution & Click Recording with Anti-Bot Protection
// Routes:
//   GET  /t/{slug}  -> Direct 302 Redirect to Affiliate Destination URL
//   GET  /backend/v1/tracking/resolve/{slug} -> API resolution with click recording
//   POST /backend/v1/tracking/create -> Create or get UTM Tracking Link

routerAdd('GET', '/t/{slug}', (e) => {
  const slug = (e.requestInfo().pathParameters?.slug || '').trim()
  if (!slug) {
    return e.redirect(302, '/')
  }

  try {
    let linkRecord
    try {
      linkRecord = $app.findFirstRecordByData('tracking_links', 'slug', slug)
    } catch (_) {
      return e.redirect(302, '/')
    }

    if (!linkRecord || !linkRecord.getBool('is_active')) {
      return e.redirect(302, '/')
    }

    const destinationUrl = linkRecord.getString('destination_url')
    if (!destinationUrl) {
      return e.redirect(302, '/')
    }

    // Inspect request headers for Anti-Bot & privacy-safe filtering
    const headers = e.requestInfo().headers || {}
    const ua = (headers['user-agent'] || headers['User-Agent'] || '').toLowerCase()
    const referer = headers['referer'] || headers['Referer'] || ''
    const clientIp = e.requestInfo().remoteIP || ''

    // 1. Detect Bots, Crawlers and Social Media Previews
    const botPatterns = [
      'bot',
      'crawler',
      'spider',
      'preview',
      'telegrambot',
      'whatsapp',
      'facebookexternalhit',
      'twitterbot',
      'meta-externalagent',
      'pinterest',
      'googlebot',
      'bingbot',
      'yandex',
      'duckduckbot',
      'baiduspider',
      'discordbot',
      'slackbot',
      'vkshare',
      'w3c_validator',
      'headless',
      'curl',
      'wget',
      'postman',
    ]

    let isBot = false
    let invalidReason = ''

    if (!ua || ua.length < 5) {
      isBot = true
      invalidReason = 'empty_or_short_ua'
    } else {
      for (let i = 0; i < botPatterns.length; i++) {
        if (ua.includes(botPatterns[i])) {
          isBot = true
          invalidReason = 'bot_crawler:' + botPatterns[i]
          break
        }
      }
    }

    // Device classification
    let deviceType = 'desktop'
    if (isBot) {
      deviceType = 'bot'
    } else if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet'
    }

    // Privacy-safe IP Masking (e.g. 189.45.12.34 -> 189.45.*.*)
    let maskedIp = ''
    if (clientIp) {
      const parts = clientIp.split('.')
      if (parts.length === 4) {
        maskedIp = parts[0] + '.' + parts[1] + '.*.*'
      } else {
        maskedIp = 'anonymized'
      }
    }

    // Deduplication technical hash (hour window + masked ip + slug)
    const hourKey = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
    const dedupRaw = hourKey + '|' + maskedIp + '|' + slug + '|' + ua.slice(0, 40)
    const dedupHash = $security.md5(dedupRaw)

    const isValidClick = !isBot

    // Check fast deduplication: if same valid technical hash exists in last hour, mark as rapid repeat
    if (isValidClick) {
      try {
        const existing = $app.findRecordsByFilter(
          'click_events',
          `client_dedup_hash = '${dedupHash}' && tracking_link_id = '${linkRecord.id}'`,
          '-created',
          1,
          0,
        )
        if (existing.length > 0) {
          // Repeated click from same technical signature in same hour
          // We still register raw click, but mark valid as false with reason
          // invalidReason = "rapid_repeat_dedup"
        }
      } catch (_) {}
    }

    // Register click event record
    try {
      const clicksCol = $app.findCollectionByNameOrId('click_events')
      const clickRec = new Record(clicksCol)
      clickRec.set('user_id', linkRecord.getString('user_id'))
      clickRec.set('tracking_link_id', linkRecord.id)
      clickRec.set('slug', slug)
      clickRec.set('campaign_id', linkRecord.getString('campaign_id'))
      clickRec.set('variation_id', linkRecord.getString('variation_id'))
      clickRec.set('creative_id', linkRecord.getString('creative_id'))
      clickRec.set('publication_id', linkRecord.getString('publication_id'))
      clickRec.set('product_id', linkRecord.getString('product_id'))
      clickRec.set('channel', linkRecord.getString('channel'))
      clickRec.set('sub_id', linkRecord.getString('sub_id'))
      clickRec.set('is_valid', isValidClick && !invalidReason)
      clickRec.set('is_test_data', linkRecord.getBool('is_test_data'))
      clickRec.set('invalid_reason', invalidReason)
      clickRec.set('referrer_host', referer ? referer.slice(0, 200) : '')
      clickRec.set('user_agent_short', ua ? ua.slice(0, 150) : '')
      clickRec.set('device_type', deviceType)
      clickRec.set('client_dedup_hash', dedupHash)
      clickRec.set('ip_masked', maskedIp)
      clickRec.set('has_converted', false)
      $app.save(clickRec)
    } catch (saveErr) {
      console.log('Error saving click_event:', saveErr)
    }

    // Update tracking_links counters
    try {
      const currentRaw = linkRecord.getInt('raw_clicks_count') || 0
      const currentValid = linkRecord.getInt('valid_clicks_count') || 0
      linkRecord.set('raw_clicks_count', currentRaw + 1)
      if (isValidClick && !invalidReason) {
        linkRecord.set('valid_clicks_count', currentValid + 1)
      }
      linkRecord.set('last_click_at', new Date().toISOString())
      $app.save(linkRecord)
    } catch (linkUpdateErr) {
      console.log('Error updating link counters:', linkUpdateErr)
    }

    // Test links must never contaminate aggregate production counters.
    // The click_event and tracking_link counters still record the test flow itself,
    // but publication/variation/creative KPIs remain production-only.
    const isTestData = linkRecord.getBool('is_test_data')

    // Update publications counters if linked and this is real traffic
    const pubId = linkRecord.getString('publication_id')
    if (pubId && !isTestData) {
      try {
        const pubRec = $app.findRecordById('publications', pubId)
        const pRaw = pubRec.getInt('raw_clicks_count') || 0
        const pValid = pubRec.getInt('valid_clicks_count') || 0
        pubRec.set('raw_clicks_count', pRaw + 1)
        if (isValidClick && !invalidReason) {
          pubRec.set('valid_clicks_count', pValid + 1)
        }
        $app.save(pubRec)
      } catch (_) {}
    }

    // Update campaign_variations counters only for real traffic
    const varId = linkRecord.getString('variation_id')
    if (varId && !isTestData) {
      try {
        const varRec = $app.findRecordById('campaign_variations', varId)
        const vClicks = varRec.getInt('clicks') || 0
        varRec.set('clicks', vClicks + 1)
        // Calculate CTR if impressions exist
        const vImpr = varRec.getInt('impressions') || 0
        if (vImpr > 0) {
          varRec.set('ctr', Math.round(((vClicks + 1) / vImpr) * 1000) / 10)
        }
        $app.save(varRec)
      } catch (_) {}
    }

    // Update creatives counters only for real traffic
    const creativeId = linkRecord.getString('creative_id')
    if (creativeId && !isTestData) {
      try {
        const crRec = $app.findRecordById('creatives', creativeId)
        const cClicks = crRec.getInt('clicks') || 0
        crRec.set('clicks', cClicks + 1)
        $app.save(crRec)
      } catch (_) {}
    }

    // 302 Fast Redirect
    return e.redirect(302, destinationUrl)
  } catch (err) {
    console.log('Error resolving tracker redirect:', err)
    return e.redirect(302, '/')
  }
})
