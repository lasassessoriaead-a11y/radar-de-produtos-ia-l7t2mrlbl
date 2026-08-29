// Hook to save and load full campaign packages into the database
// Handles /backend/v1/campaigns/save and /backend/v1/campaigns/get-by-product

routerAdd(
  'POST',
  '/backend/v1/campaigns/save',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignId = (body.id || '').trim()
    const productTitle = (body.product_title || '').trim()

    if (!productTitle) {
      return e.badRequestError('Título do produto é obrigatório')
    }

    try {
      const campaignsCol = $app.findCollectionByNameOrId('campaigns')
      let campRecord

      if (campaignId) {
        try {
          campRecord = $app.findRecordById('campaigns', campaignId)
        } catch (_) {
          campRecord = new Record(campaignsCol)
        }
      } else {
        campRecord = new Record(campaignsCol)
      }

      campRecord.set('user_id', userId)
      campRecord.set('product_id', body.product_id || '')
      campRecord.set('discovered_id', body.discovered_id || '')
      campRecord.set('product_title', productTitle)
      campRecord.set('product_image', body.product_image || '')
      campRecord.set('product_category', body.product_category || 'Geral')
      campRecord.set('platform', body.platform || 'Mercado Livre')
      campRecord.set('product_url', body.product_url || '')
      campRecord.set('affiliate_url', body.affiliate_url || '')
      campRecord.set(
        'affiliate_is_configured',
        !!(body.affiliate_url && body.affiliate_url.length > 5),
      )
      campRecord.set('price_at_creation', parseFloat(body.price_at_creation || '0'))
      campRecord.set('promo_price_at_creation', parseFloat(body.promo_price_at_creation || '0'))
      campRecord.set(
        'commission_rate_at_creation',
        parseFloat(body.commission_rate_at_creation || '0'),
      )
      campRecord.set(
        'commission_amount_at_creation',
        parseFloat(body.commission_amount_at_creation || '0'),
      )
      campRecord.set('campaign_name', body.campaign_name || `Campanha - ${productTitle}`)
      campRecord.set('selected_angle_id', body.selected_angle_id || 'angle_1')
      campRecord.set('selected_angle_title', body.selected_angle_title || 'Problema & Solução')
      campRecord.set('target_audience', body.target_audience || 'Geral')
      campRecord.set('recommended_channels', body.recommended_channels || ['TikTok', 'Instagram'])
      campRecord.set('primary_channel', body.primary_channel || 'Instagram')
      campRecord.set('primary_format', body.primary_format || 'script_30s')
      campRecord.set('status', body.status || 'draft')
      campRecord.set('product_intelligence', body.product_intelligence || {})
      campRecord.set('selling_angles', body.selling_angles || [])
      campRecord.set('hooks_bank', body.hooks_bank || [])
      campRecord.set('generated_copies', body.generated_copies || {})
      campRecord.set('video_scripts', body.video_scripts || {})
      campRecord.set('estimated_score', parseFloat(body.estimated_score || '85'))
      campRecord.set('score_breakdown', body.score_breakdown || {})
      campRecord.set('compliance_status', body.compliance_status || 'approved')
      campRecord.set('compliance_report', body.compliance_report || {})
      campRecord.set('conversation_id', body.conversation_id || '')
      campRecord.set('metadata', body.metadata || {})

      $app.save(campRecord)
      const savedCampId = campRecord.id

      // Save or update variations if provided
      if (Array.isArray(body.variations) && body.variations.length > 0) {
        const varCol = $app.findCollectionByNameOrId('campaign_variations')
        body.variations.forEach((v) => {
          let varRec
          if (v.id) {
            try {
              varRec = $app.findRecordById('campaign_variations', v.id)
            } catch (_) {
              varRec = new Record(varCol)
            }
          } else {
            varRec = new Record(varCol)
          }

          varRec.set('campaign_id', savedCampId)
          varRec.set('version_letter', v.version_letter || 'A')
          varRec.set('hypothesis_name', v.hypothesis_name || `Hipótese ${v.version_letter}`)
          varRec.set('hypothesis_details', v.hypothesis_details || '')
          varRec.set('angle_title', v.angle_title || '')
          varRec.set('hook_text', v.hook_text || '')
          varRec.set('hook_type', v.hook_type || 'problem')
          varRec.set('copy_text', v.copy_text || '')
          varRec.set('cta_text', v.cta_text || 'Confira no link')
          varRec.set('cta_objective', v.cta_objective || 'conferir')
          varRec.set('channel', v.channel || 'TikTok')
          varRec.set('format', v.format || 'script_30s')
          varRec.set('video_scenes', v.video_scenes || [])
          varRec.set('estimated_score', parseFloat(v.estimated_score || '85'))
          varRec.set('score_breakdown', v.score_breakdown || {})
          varRec.set('compliance_status', v.compliance_status || 'approved')
          varRec.set('compliance_notes', v.compliance_notes || '')
          $app.save(varRec)
        })
      }

      return e.json(200, {
        success: true,
        campaign_id: savedCampId,
        message: 'Campanha salva com sucesso!',
      })
    } catch (err) {
      console.log('Error saving campaign:', err)
      return e.json(500, { error: 'Erro ao salvar campanha: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/campaigns/stats-by-product',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const productId = (e.requestInfo().query?.product_id || '').trim()
    const discoveredId = (e.requestInfo().query?.discovered_id || '').trim()

    let count = 0
    let bestScore = 0

    try {
      let filter = ''
      if (productId) {
        filter = `product_id = '${productId}'`
      } else if (discoveredId) {
        filter = `discovered_id = '${discoveredId}'`
      }

      if (filter) {
        const records = $app.findRecordsByFilter('campaigns', filter, '-estimated_score', 50, 0)
        count = records.length
        if (records.length > 0) {
          bestScore = Math.round(records[0].getFloat('estimated_score') || 0)
        }
      }

      return e.json(200, {
        count: count,
        best_score: bestScore,
      })
    } catch (err) {
      return e.json(200, { count: 0, best_score: 0 })
    }
  },
  $apis.requireAuth(),
)
