// Hook to generate single format/channel copies or additional hooks on-demand
// Route: POST /backend/v1/campaigns/generate-format

routerAdd(
  'POST',
  '/backend/v1/campaigns/generate-format',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const productTitle = (body.product_title || '').trim()
    const productPrice = parseFloat(body.product_price || '0')
    const category = (body.category || 'Geral').trim()
    const angleTitle = (body.angle_title || 'Problema & Solução').trim()
    const targetAudience = (body.target_audience || 'Consumidores em geral').trim()
    const channel = (body.channel || 'Instagram').trim() // Instagram, TikTok, YouTube Shorts, WhatsApp, Telegram, Pinterest, Landing Page
    const format = (body.format || 'caption').trim() // short_ad, caption, script_15s, script_30s, script_60s, story, carousel, product_description, promo_message, demo_script
    const customInstruction = (body.custom_instruction || '').trim()

    if (!productTitle) {
      return e.badRequestError('Título do produto é obrigatório')
    }

    const systemPrompt = `Você é o Redator Especialista em Conversão do Laboratório de Campanhas.
Você adapta formatos publicitários de alta conversão de acordo com o canal e formato solicitado.
REGRAS:
- Adapte a linguagem ao canal e formato solicitado (ex: TikTok = dinâmico, rápido; WhatsApp = direto, escaneável com emojis; Landing Page = headline forte + bullets de valor; Roteiro = cenas detalhadas com ação, texto na tela e narração).
- Persuasão ética: foque em utilidade, demonstração e dor real, sem promessas falsas nem urgência fictícia.
- Inclua CTA contextualizada.
Responda em JSON válido.`

    const userPrompt = `Gere o formato solicitado:
Produto: "${productTitle}" (R$ ${productPrice}) | Categoria: ${category}
Ângulo Escolhido: "${angleTitle}"
Público-Alvo: "${targetAudience}"
Canal Destino: "${channel}"
Formato Solicitado: "${format}"
Instrução Específica: "${customInstruction || 'Máxima conversão e clareza'}"

Retorne JSON no formato:
{
  "channel": "${channel}",
  "format": "${format}",
  "headline": "headline ou título do criativo",
  "hook": "gancho de abertura adaptado",
  "body": "texto principal ou descrição",
  "cta": "chamada para ação adaptada",
  "video_scenes": [
    { "scene_number": 1, "time_range": "0-3s", "visual_action": "...", "on_screen_text": "...", "narration": "...", "duration_sec": 3 }
  ],
  "estimated_score": 88,
  "tips": "dica prática para este canal"
}`

    try {
      const completion = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const raw = completion.choices?.[0]?.message?.content || '{}'
      let parsed = {}
      try {
        const match = raw.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : JSON.parse(raw)
      } catch (parseErr) {
        parsed = {
          channel: channel,
          format: format,
          headline: 'Oferta Especial: ' + productTitle,
          hook: 'Você já conhecia essa solução?',
          body: 'Praticidade e qualidade comprovada para o seu dia a dia.',
          cta: 'Confira os detalhes no link oficial.',
          video_scenes: [],
          estimated_score: 85,
          tips: 'Grave vídeos com boa iluminação e áudio claro.',
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error in generate-format:', err)
      return e.json(500, { error: 'Erro ao gerar formato: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
