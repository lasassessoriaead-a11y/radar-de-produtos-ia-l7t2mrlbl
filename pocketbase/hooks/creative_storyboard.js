// Hook to generate structured video storyboard and synchronized captions
// Route: POST /backend/v1/creatives/generate-storyboard

routerAdd(
  'POST',
  '/backend/v1/creatives/generate-storyboard',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const productTitle = (body.product_title || '').trim()
    const productCategory = (body.product_category || '').trim()
    const targetAudience = (body.target_audience || '').trim()
    const angleTitle = (body.angle_title || '').trim()
    const hookText = (body.hook_text || '').trim()
    const ctaText = (body.cta_text || '').trim()
    const duration = parseInt(body.duration || '30', 10) // 15, 30, 60s
    const channel = (body.channel || 'TikTok / Reels').trim()

    const systemPrompt = `Você é o Diretor Audiovisual de Vídeos Curtos (TikTok, Reels, Shorts) do Radar de Produtos IA.
Sua missão: Transformar o gancho e o ângulo de venda em um STORYBOARD VISUAL PROFISSIONAL de alta retenção.

Estrutura da Narrativa de Vídeo:
1. CENA 1 (0-3s): GANCHO VISUAL & PARADA DE SCROLL (Curiosidade, choque ou dor visível).
2. CENA 2 (3-10s): O PROBLEMA / QUEBRA DE EXPECTATIVA (Identificação com o público).
3. CENA 3 (10-20s): DEMONSTRAÇÃO DO PRODUTO EM USO (O diferencial funcional claro, sem promessas falsas).
4. CENA 4 (20-27s): BENEFÍCIO / TRANSFORMAÇÃO REAL (Sensação de alívio ou praticidade).
5. CENA 5 (27-30s): CTA TRANSPARENTE (Chamada clara para conferir na bio / link).

Regra de Vídeo:
Separar explicitamente: Roteiro, Cenas, Enquadramento, Imagem/Vídeo Necessário, Texto na Tela, Narração, Transição e Legenda.

Retorne APENAS JSON válido.`

    const userPrompt = `Gere o Storyboard Audiovisual completo para:
Produto: "${productTitle}" (Categoria: ${productCategory})
Público-Alvo: "${targetAudience}"
Ângulo: "${angleTitle}"
Gancho Principal: "${hookText}"
CTA: "${ctaText}"
Duração Estimada: ${duration} segundos
Canal de Destino: ${formatText(channel)}

Formato JSON esperado:
{
  "total_duration_sec": ${duration},
  "narrative_arc": "Resumo da dinâmica do vídeo",
  "scenes": [
    {
      "scene_number": 1,
      "time_range": "0-3s",
      "duration_sec": 3,
      "objective": "Parar o scroll nos 3 primeiros segundos",
      "camera_framing": "Close-up dinâmico / POV",
      "required_visual": "Descrição exata do take/imagem necessária",
      "on_screen_text": "Texto em caixa alta na tela com emojis",
      "narration_text": "Texto falado na narração",
      "subtitle_text": "Legenda sincronizada para deficientes auditivos ou usuários sem som",
      "transition_type": "Corte seco / Zoom in rápido",
      "sound_effect_cue": "Whoosh / Pop / Som de impacto"
    }
  ],
  "full_narration_script": "Texto corrido de toda a narração para gravação",
  "full_auto_subtitles": "Legenda completa formatada por blocos de tempo",
  "retention_tips": "Dicas práticas para manter mais de 60% de retenção no algoritmo"
}`

    function formatText(t) {
      return t || 'TikTok / Instagram Reels'
    }

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
          total_duration_sec: duration,
          narrative_arc: `Vídeo dinâmico de ${duration}s focado no gancho de dor e resolução prática`,
          scenes: [
            {
              scene_number: 1,
              time_range: '0-3s',
              duration_sec: 3,
              objective: 'Parada de scroll com gancho forte',
              camera_framing: 'Close-up rápido no problema cotidiano',
              required_visual: 'Gesto de frustração com o método antigo ou tomada do produto',
              on_screen_text: hookText || 'VOCÊ AINDA PASSA POR ISSO?',
              narration_text: hookText || 'Se você ainda sofre com isso, para tudo agora!',
              subtitle_text: hookText || 'Se você ainda sofre com isso...',
              transition_type: 'Zoom in rápido',
              sound_effect_cue: 'Whoosh rápido',
            },
            {
              scene_number: 2,
              time_range: '3-12s',
              duration_sec: 9,
              objective: 'Apresentar a solução em ação',
              camera_framing: 'Plano médio em 45 graus com boa luz',
              required_visual: `Demonstração do produto ${productTitle} em funcionamento`,
              on_screen_text: 'TESTEI ESSE ACHADO',
              narration_text: `Encontrei esse achado e resolvi testar na prática pra ver se funciona.`,
              subtitle_text: 'Encontrei esse achado e resolvi testar...',
              transition_type: 'Corte seco',
              sound_effect_cue: 'Efeito sonoro de clique',
            },
            {
              scene_number: 3,
              time_range: '12-25s',
              duration_sec: 13,
              objective: 'Mostrar o benefício real sem exageros',
              camera_framing: 'Plano detalhe do resultado prático',
              required_visual: 'Antes e depois ou demonstração limpa do acabamento',
              on_screen_text: 'RESULTADO EM SEGUNDOS',
              narration_text: `Olha a diferença. Prático, economiza tempo e cumpre exatamente o que promete.`,
              subtitle_text: 'Prático e economiza tempo de verdade...',
              transition_type: 'Deslize lateral',
              sound_effect_cue: 'Swoosh suave',
            },
            {
              scene_number: 4,
              time_range: '25-30s',
              duration_sec: 5,
              objective: 'CTA claro e direto ao ponto',
              camera_framing: 'Segurando o produto apontando para o link',
              required_visual: 'Visual do produto com selo de verificação',
              on_screen_text: ctaText || 'LINK DIRETO NA BIO',
              narration_text: ctaText || 'O link com desconto seguro tá na minha bio, confere lá!',
              subtitle_text: 'Link com desconto na bio!',
              transition_type: 'Fade to black',
              sound_effect_cue: 'Bell chime de notificação',
            },
          ],
          full_narration_script: `${hookText}. Encontrei esse achado e testei na prática. Prático, economiza tempo e funciona. ${ctaText || 'Link direto na bio!'}`,
          full_auto_subtitles: `[0-3s] ${hookText}\n[3-12s] Encontrei esse achado e testei na prática.\n[12-25s] Prático, economiza tempo e funciona.\n[25-30s] ${ctaText || 'Link direto na bio!'}`,
          retention_tips:
            'Mantenha cortes a cada 2.5 segundos e texto centralizado na safe zone do TikTok/Reels.',
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error generating storyboard:', err)
      return e.json(500, { error: 'Erro ao gerar storyboard de vídeo: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
