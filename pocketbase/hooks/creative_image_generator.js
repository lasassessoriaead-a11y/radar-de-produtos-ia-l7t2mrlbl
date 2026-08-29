// Real OpenAI Image Generation Hook with Provider Adapter architecture
// Route: POST /backend/v1/creatives/generate-image
// Route: GET  /backend/v1/creatives/provider-status

routerAdd(
  'GET',
  '/backend/v1/creatives/provider-status',
  (e) => {
    const openaiKey = $os.getenv('OPENAI_API_KEY') || ''
    const hasOpenAI = Boolean(openaiKey && openaiKey.trim().length > 10)

    return e.json(200, {
      active_provider: hasOpenAI ? 'openai' : 'none',
      openai_configured: hasOpenAI,
      supported_providers: [
        {
          id: 'openai',
          name: 'OpenAI (DALL-E 3 / gpt-image-1)',
          configured: hasOpenAI,
          description: 'Geração real de imagens e cenários publicitários em alta resolução.',
        },
      ],
      video_generation: {
        configured: false,
        provider: 'none',
        message:
          'Geração automática de vídeo ainda não configurada. O storyboard e roteiro visual completo estão disponíveis.',
      },
      narration_generation: {
        configured: false,
        provider: 'none',
        message:
          'Geração automática de voz por IA não configurada. O texto e sincronia das cenas estão disponíveis.',
      },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/creatives/generate-image',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const openaiKey = ($os.getenv('OPENAI_API_KEY') || '').trim()

    // STRICT USER DECISION RULE: NEVER SIMULATE IMAGE IF KEY IS NOT CONFIGURED
    if (!openaiKey) {
      return e.json(400, {
        error:
          'Chave da API da OpenAI não configurada (OPENAI_API_KEY). A integração real de geração de imagens por IA está inativa.',
        code: 'OPENAI_KEY_MISSING',
        integration_status: 'inactive',
        provider: 'openai',
      })
    }

    const body = e.requestInfo().body || {}
    const prompt = (body.prompt || '').trim()
    const size = body.size || '1024x1024' // 1024x1024, 1024x1792, 1792x1024
    const quality = body.quality || 'standard' // standard or hd
    const style = body.style || 'natural' // natural or vivid
    const generationType = body.generation_type || 'ad_image' // 'ad_image' | 'context_background' | 'lifestyle' | 'conceptual_demo' | 'story_visual' | 'thumbnail'

    if (!prompt) {
      return e.badRequestError('Prompt para geração de imagem é obrigatório')
    }

    // Call OpenAI Real Image API via $http.send
    try {
      const openAiUrl = 'https://api.openai.com/v1/images/generations'
      const payload = {
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        style: style,
        response_format: 'url',
      }

      const res = $http.send({
        url: openAiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + openaiKey,
        },
        body: JSON.stringify(payload),
        timeout: 60,
      })

      if (res.statusCode !== 200) {
        let errMessage = 'Falha na API da OpenAI'
        try {
          const errBody = res.json
          if (errBody?.error?.message) {
            errMessage = errBody.error.message
          }
        } catch (_) {}
        return e.json(res.statusCode, {
          error: 'Erro na geração de imagem com OpenAI: ' + errMessage,
          code: 'OPENAI_API_ERROR',
        })
      }

      const resData = res.json
      const generatedImageUrl = resData?.data?.[0]?.url || ''
      const revisedPrompt = resData?.data?.[0]?.revised_prompt || prompt

      if (!generatedImageUrl) {
        return e.json(500, { error: 'Nenhuma URL de imagem retornada pela OpenAI' })
      }

      return e.json(200, {
        success: true,
        image_url: generatedImageUrl,
        revised_prompt: revisedPrompt,
        provider: 'openai',
        model: 'dall-e-3',
        size: size,
        is_ai_generated: true,
        fidelity_disclaimer_required: true,
        created_at: new Date().toISOString(),
      })
    } catch (apiErr) {
      console.log('Error calling OpenAI images API:', apiErr)
      return e.json(500, {
        error: 'Exceção ao comunicar com a OpenAI: ' + (apiErr.message || 'Erro de rede'),
        code: 'OPENAI_NETWORK_ERROR',
      })
    }
  },
  $apis.requireAuth(),
)
