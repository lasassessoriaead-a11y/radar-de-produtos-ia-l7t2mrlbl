// Hook to create, update, retrieve and version creative projects
// Route: POST /backend/v1/creatives/save
// Route: GET  /backend/v1/creatives/get
// Route: POST /backend/v1/creatives/create-version

routerAdd(
  'POST',
  '/backend/v1/creatives/save',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const creativeId = body.id || ''
    const campaignId = body.campaign_id || ''
    const productTitle = body.product_title || 'Novo Criativo'

    let record = null
    const col = $app.findCollectionByNameOrId('creatives')

    if (creativeId) {
      try {
        record = $app.findRecordById('creatives', creativeId)
      } catch (_) {}
    }

    if (!record) {
      record = new Record(col)
      record.set('user_id', userId)
      record.set('current_version', 1)
      record.set('version_count', 1)
    }

    // Assign Fields
    if (campaignId) record.set('campaign_id', campaignId)
    if (body.campaign_variation_id) record.set('campaign_variation_id', body.campaign_variation_id)
    if (body.product_id) record.set('product_id', body.product_id)
    if (body.discovered_id) record.set('discovered_id', body.discovered_id)
    if (productTitle) record.set('product_title', productTitle)
    if (body.product_image_url) record.set('product_image_url', body.product_image_url)
    if (body.version_letter) record.set('version_letter', body.version_letter)
    if (body.hypothesis_type) record.set('hypothesis_type', body.hypothesis_type)
    if (body.title) record.set('title', body.title)
    if (body.creative_type) record.set('creative_type', body.creative_type)
    if (body.width) record.set('width', body.width)
    if (body.height) record.set('height', body.height)
    if (body.aspect_ratio) record.set('aspect_ratio', body.aspect_ratio)
    if (body.status) record.set('status', body.status)
    if (body.visual_concept) record.set('visual_concept', body.visual_concept)
    if (body.image_provider) record.set('image_provider', body.image_provider)
    if (body.image_model) record.set('image_model', body.image_model)
    if (body.image_prompt) record.set('image_prompt', body.image_prompt)
    if (body.revised_prompt) record.set('revised_prompt', body.revised_prompt)
    if (body.image_url) record.set('image_url', body.image_url)
    if (body.is_ai_generated !== undefined)
      record.set('is_ai_generated', Boolean(body.is_ai_generated))
    if (body.fidelity_disclaimer_required !== undefined)
      record.set('fidelity_disclaimer_required', Boolean(body.fidelity_disclaimer_required))
    if (body.text_layers) record.set('text_layers', body.text_layers)
    if (body.visual_style_overrides)
      record.set('visual_style_overrides', body.visual_style_overrides)
    if (body.video_storyboard) record.set('video_storyboard', body.video_storyboard)
    if (body.narration_voice) record.set('narration_voice', body.narration_voice)
    if (body.narration_script) record.set('narration_script', body.narration_script)
    if (body.subtitles_text) record.set('subtitles_text', body.subtitles_text)
    if (body.creative_score !== undefined) record.set('creative_score', body.creative_score)
    if (body.score_breakdown) record.set('score_breakdown', body.score_breakdown)
    if (body.review_status) record.set('review_status', body.review_status)
    if (body.review_report) record.set('review_report', body.review_report)
    if (body.commercial_validation) record.set('commercial_validation', body.commercial_validation)
    if (body.metadata) record.set('metadata', body.metadata)

    $app.save(record)

    // Save Initial Version 1 if new
    if (!creativeId) {
      try {
        const vCol = $app.findCollectionByNameOrId('creative_versions')
        const vRecord = new Record(vCol)
        vRecord.set('creative_id', record.id)
        vRecord.set('version_number', 1)
        vRecord.set('version_tag', 'V1 - Versão Inicial')
        vRecord.set('image_url', body.image_url || body.product_image_url || '')
        vRecord.set('image_prompt', body.image_prompt || '')
        vRecord.set('text_layers', body.text_layers || {})
        vRecord.set('video_storyboard', body.video_storyboard || [])
        vRecord.set('visual_concept', body.visual_concept || {})
        vRecord.set('creative_score', body.creative_score || 85)
        vRecord.set('review_status', body.review_status || 'approved')
        vRecord.set('change_summary', 'Criação inicial do projeto criativo')
        $app.save(vRecord)
      } catch (verr) {
        console.log('Error creating initial version:', verr)
      }
    }

    return e.json(200, {
      success: true,
      creative_id: record.id,
      message: 'Criativo salvo com sucesso no banco de dados',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/creatives/create-version',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const creativeId = body.creative_id || ''
    const changeSummary = body.change_summary || 'Nova iteração do criativo'

    if (!creativeId) return e.badRequestError('ID do criativo é obrigatório')

    let creativeRecord = null
    try {
      creativeRecord = $app.findRecordById('creatives', creativeId)
    } catch (_) {
      return e.notFoundError('Criativo não encontrado')
    }

    const currentVNum = (creativeRecord.getInt('current_version') || 1) + 1
    creativeRecord.set('current_version', currentVNum)
    creativeRecord.set('version_count', currentVNum)

    if (body.image_url) creativeRecord.set('image_url', body.image_url)
    if (body.image_prompt) creativeRecord.set('image_prompt', body.image_prompt)
    if (body.text_layers) creativeRecord.set('text_layers', body.text_layers)
    if (body.creative_score !== undefined) creativeRecord.set('creative_score', body.creative_score)
    if (body.review_status) creativeRecord.set('review_status', body.review_status)
    $app.save(creativeRecord)

    // Create version record
    const vCol = $app.findCollectionByNameOrId('creative_versions')
    const vRecord = new Record(vCol)
    vRecord.set('creative_id', creativeId)
    vRecord.set('version_number', currentVNum)
    vRecord.set('version_tag', `V${currentVNum} - ${changeSummary}`)
    vRecord.set('image_url', body.image_url || creativeRecord.getString('image_url'))
    vRecord.set('image_prompt', body.image_prompt || creativeRecord.getString('image_prompt'))
    vRecord.set('text_layers', body.text_layers || creativeRecord.get('text_layers'))
    vRecord.set('video_storyboard', body.video_storyboard || creativeRecord.get('video_storyboard'))
    vRecord.set('visual_concept', body.visual_concept || creativeRecord.get('visual_concept'))
    vRecord.set(
      'creative_score',
      body.creative_score || creativeRecord.getInt('creative_score') || 85,
    )
    vRecord.set(
      'review_status',
      body.review_status || creativeRecord.getString('review_status') || 'approved',
    )
    vRecord.set('change_summary', changeSummary)
    $app.save(vRecord)

    return e.json(200, {
      success: true,
      version_number: currentVNum,
      version_id: vRecord.id,
      message: `Versão V${currentVNum} registrada no histórico`,
    })
  },
  $apis.requireAuth(),
)
