// Hook for Tracking Link Generator & UTM Builder
// Route: POST /backend/v1/tracking/create-or-get

routerAdd(
  'POST',
  '/backend/v1/tracking/create-or-get',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignId = (body.campaign_id || '').trim()
    const variationId = (body.variation_id || '').trim()
    const creativeId = (body.creative_id || '').trim()
    const productId = (body.product_id || '').trim()
    const publicationId = (body.publication_id || '').trim()
    const channel = (body.channel || 'Instagram').trim()
    const originalDestination = (body.destination_url || '').trim()

    if (!originalDestination) {
      return e.badRequestError('URL de destino é obrigatória')
    }

    try {
      // Deterministic sub_id or tracking tag
      // Format: c_{campIdShort}_v_{varLetter}_cr_{crIdShort}
      const cShort = campaignId ? campaignId.slice(-6) : 'cmp'
      const vLetter = (body.version_letter || 'A').toUpperCase()
      const crShort = creativeId ? creativeId.slice(-6) : 'crt'
      const chClean = channel.toLowerCase().replace(/[^a-z0-9]/g, '')
      const subId = `rdr_${cShort}_${vLetter}_${crShort}_${chClean}`

      // Build destination URL with UTMs and subId parameter preserving existing parameters
      // e.g. Amazon tag / Shopee universal / Mercado Livre subid / Hotmart / etc.
      let finalDestUrl = originalDestination

      const utmSource = body.utm_source || chClean || 'radar_ia'
      const utmMedium = body.utm_medium || 'affiliate'
      const utmCampaign = body.utm_campaign || `camp_${cShort}`
      const utmContent = body.utm_content || `var_${vLetter}_${crShort}`
      const utmTerm = body.utm_term || ''

      // Append UTMs safely without breaking original query params
      const separator = finalDestUrl.includes('?') ? '&' : '?'
      const utmParams = []
      if (!finalDestUrl.includes('utm_source='))
        utmParams.push(`utm_source=${encodeURIComponent(utmSource)}`)
      if (!finalDestUrl.includes('utm_medium='))
        utmParams.push(`utm_medium=${encodeURIComponent(utmMedium)}`)
      if (!finalDestUrl.includes('utm_campaign='))
        utmParams.push(`utm_campaign=${encodeURIComponent(utmCampaign)}`)
      if (!finalDestUrl.includes('utm_content='))
        utmParams.push(`utm_content=${encodeURIComponent(utmContent)}`)
      if (utmTerm && !finalDestUrl.includes('utm_term='))
        utmParams.push(`utm_term=${encodeURIComponent(utmTerm)}`)

      // Also add platform tracking param (e.g., subid / tracking_id) if not present
      if (
        !finalDestUrl.includes('subid=') &&
        !finalDestUrl.includes('sub_id=') &&
        !finalDestUrl.includes('tag=')
      ) {
        utmParams.push(`subid=${encodeURIComponent(subId)}`)
      }

      if (utmParams.length > 0) {
        finalDestUrl = finalDestUrl + separator + utmParams.join('&')
      }

      // Check if a tracking link record already exists with this sub_id and user_id
      const trackCol = $app.findCollectionByNameOrId('tracking_links')
      let linkRec = null

      try {
        const matches = $app.findRecordsByFilter(
          'tracking_links',
          `user_id = '${userId}' && sub_id = '${subId}'`,
          '-created',
          1,
          0,
        )
        if (matches.length > 0) {
          linkRec = matches[0]
        }
      } catch (_) {}

      if (!linkRec) {
        // Generate short random unique slug: 6-8 chars
        let slug = $security.randomString(7).toLowerCase()
        linkRec = new Record(trackCol)
        linkRec.set('user_id', userId)
        linkRec.set('slug', slug)
        linkRec.set('title', body.title || `Link ${channel} - ${vLetter}`)
        linkRec.set('campaign_id', campaignId)
        linkRec.set('variation_id', variationId)
        linkRec.set('creative_id', creativeId)
        linkRec.set('product_id', productId)
        linkRec.set('publication_id', publicationId)
        linkRec.set('channel', channel)
        linkRec.set('sub_id', subId)
        linkRec.set('destination_url', finalDestUrl)
        linkRec.set('utm_source', utmSource)
        linkRec.set('utm_medium', utmMedium)
        linkRec.set('utm_campaign', utmCampaign)
        linkRec.set('utm_content', utmContent)
        linkRec.set('utm_term', utmTerm)
        linkRec.set('is_active', true)
        linkRec.set('raw_clicks_count', 0)
        linkRec.set('valid_clicks_count', 0)
        linkRec.set('conversions_count', 0)
        linkRec.set('commission_earned', 0)
        linkRec.set('metadata', {
          original_affiliate_url: originalDestination,
          version_letter: vLetter,
        })
        $app.save(linkRec)
      } else {
        // Update destination in case user changed it
        linkRec.set('destination_url', finalDestUrl)
        if (publicationId && !linkRec.getString('publication_id')) {
          linkRec.set('publication_id', publicationId)
        }
        $app.save(linkRec)
      }

      const slug = linkRec.getString('slug')
      const instanceUrl = $os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || ''
      const shortUrl = `${instanceUrl}/t/${slug}`

      return e.json(200, {
        success: true,
        tracking_link_id: linkRec.id,
        slug: slug,
        short_url: shortUrl,
        sub_id: subId,
        destination_url: finalDestUrl,
        raw_clicks: linkRec.getInt('raw_clicks_count') || 0,
        valid_clicks: linkRec.getInt('valid_clicks_count') || 0,
      })
    } catch (err) {
      console.log('Error creating tracking link:', err)
      return e.json(500, { error: 'Erro ao gerar link de tracking: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
