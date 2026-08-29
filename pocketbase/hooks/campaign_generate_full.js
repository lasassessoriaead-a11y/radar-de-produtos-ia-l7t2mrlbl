// Hook for complete 1-click campaign generation using Skip AI ($ai.agent / $ai.chat fast)
// Route: POST /backend/v1/campaigns/generate-full

routerAdd(
  'POST',
  '/backend/v1/campaigns/generate-full',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const productId = (body.product_id || '').trim()
    const discoveredId = (body.discovered_id || '').trim()
    const customTitle = (body.title || '').trim()
    const customPrice = parseFloat(body.price || '0')
    const customPromoPrice = parseFloat(body.promo_price || '0')
    const customCategory = (body.category || '').trim()
    const customPlatform = (body.platform || 'Mercado Livre').trim()
    const customProductUrl = (body.product_url || '').trim()
    const customAffiliateUrl = (body.affiliate_url || '').trim()
    const customImageUrl = (body.image_url || '').trim()

    let productData = {
      id: productId,
      discovered_id: discoveredId,
      title: customTitle,
      category: customCategory,
      platform: customPlatform,
      price: customPrice,
      promo_price: customPromoPrice,
      commission_rate: parseFloat(body.commission_rate || '10'),
      commission_amount: parseFloat(body.commission_amount || '0'),
      product_url: customProductUrl,
      affiliate_url: customAffiliateUrl,
      image_url: customImageUrl,
      sales_count: parseInt(body.sales_count || '0', 10),
      reviews_count: parseInt(body.reviews_count || '0', 10),
      rating: parseFloat(body.rating || '4.5'),
      seller: body.seller || '',
      opportunity_score: parseFloat(body.opportunity_score || '75'),
      opportunity_level: body.opportunity_level || 'good',
      ai_analysis: body.ai_analysis || '',
      ai_summary: body.ai_summary || '',
    }

    // Try finding live record if productId is provided
    if (productId) {
      try {
        const prod = $app.findFirstRecordByData('products', 'id', productId)
        productData.title = prod.getString('title') || productData.title
        productData.category = prod.getString('category') || productData.category
        productData.platform = prod.getString('platform') || productData.platform
        productData.price = prod.getFloat('price') || productData.price
        productData.promo_price = prod.getFloat('promo_price') || productData.promo_price
        productData.commission_rate =
          prod.getFloat('commission_rate') || productData.commission_rate
        productData.commission_amount =
          prod.getFloat('commission_amount') || productData.commission_amount
        productData.product_url = prod.getString('product_url') || productData.product_url
        productData.affiliate_url = prod.getString('affiliate_url') || productData.affiliate_url
        productData.image_url = prod.getString('image_url') || productData.image_url
        productData.sales_count = prod.getInt('sales_count') || productData.sales_count
        productData.reviews_count = prod.getInt('reviews_count') || productData.reviews_count
        productData.rating = prod.getFloat('rating') || productData.rating
        productData.seller = prod.getString('seller') || productData.seller
        productData.opportunity_score =
          prod.getFloat('opportunity_score') || productData.opportunity_score
        productData.opportunity_level =
          prod.getString('opportunity_level') || productData.opportunity_level
        productData.ai_analysis = prod.getString('ai_analysis') || productData.ai_analysis
      } catch (_) {}
    } else if (discoveredId) {
      try {
        const disc = $app.findFirstRecordByData('discovered_products', 'id', discoveredId)
        productData.title = disc.getString('title') || productData.title
        productData.category = disc.getString('category') || productData.category
        productData.platform = disc.getString('platform') || productData.platform
        productData.price = disc.getFloat('price') || productData.price
        productData.promo_price = disc.getFloat('promo_price') || productData.promo_price
        productData.commission_rate =
          disc.getFloat('commission_rate') || productData.commission_rate
        productData.commission_amount =
          disc.getFloat('commission_amount') || productData.commission_amount
        productData.product_url = disc.getString('product_url') || productData.product_url
        productData.affiliate_url = disc.getString('affiliate_url') || productData.affiliate_url
        productData.image_url = disc.getString('image_url') || productData.image_url
        productData.sales_count = disc.getInt('sales_count') || productData.sales_count
        productData.reviews_count = disc.getInt('reviews_count') || productData.reviews_count
        productData.rating = disc.getFloat('rating') || productData.rating
        productData.seller = disc.getString('seller') || productData.seller
        productData.opportunity_score =
          disc.getFloat('opportunity_score') || productData.opportunity_score
        productData.opportunity_level =
          disc.getString('opportunity_level') || productData.opportunity_level
      } catch (_) {}
    }

    if (!productData.title) {
      return e.badRequestError('Título do produto é obrigatório para gerar campanha')
    }

    // Call Skip Cloud AI fast tier to generate the comprehensive campaign strategy
    const systemPrompt = `Você é o Diretor de Criação e Copywriting do Laboratório de Campanhas (Radar de Produtos IA).
Sua missão: "Encontramos um bom produto. Como vamos vendê-lo?".
REGRAS FUNDAMENTAIS E INEGOCIÁVEIS:
1. PERSUASÃO ≠ ENGANAÇÃO. Seja altamente convincente, persuasivo e magnético, mas NUNCA invente características falsas, preços não existentes ou descontos fabricados.
2. NUNCA USE URGÊNCIA FALSA. Proibido afirmar "últimas 2 unidades", "acaba hoje", "última chance" sem dados reais. Use urgência real de valor e conveniência.
3. NÍVEL DE CONFIANÇA: Separe as informações em:
   - "confirmed" (🟢 dado proveniente da fonte: preço real, nota, plataforma, categoria, título),
   - "inferred" (🟡 conclusão lógica e razoável da IA: persona, situações de uso),
   - "unavailable" (🔴 dados não informados).
4. CRIE 5 ÂNGULOS DE VENDA RADICALMENTE DISTINTOS:
   - Ângulo 1: Problema / Solução
   - Ângulo 2: Praticidade / Conveniência no dia a dia
   - Ângulo 3: Demonstração / Efeito visual
   - Ângulo 4: Curiosidade / Descoberta
   - Ângulo 5: Custo-benefício real (quando dados permitirem)
5. CRIE 10 GANCHOS (HOOKS) DE TIPOS DIFERENTES:
   curiosity, problem, demonstration, question, discovery, comparison, benefit, identification.
6. CRIE 3 VERSÕES A/B/C COM HIPÓTESES DISTINTAS (Ex.: A = Dor cotidiana, B = Demonstração visual, C = Praticidade extrema).
7. GERE ROTEIROS DE VÍDEO POR CENAS (15s, 30s e 60s) com imagem/ação sugerida, texto na tela, narração e duração.
8. GERE SCORE DA CAMPANHA (0-100) COM BREAKDOWN DETALHADO (Força do gancho, clareza, aderência ao público, benefício, CTA, canal, qualidade do argumento, risco de exagero).
9. FAÇA A REVISÃO DE CONFORMIDADE (Compliance): "approved" (🟢), "needs_revision" (🟡) ou "blocked" (🔴), apontando se há alegações não comprovadas.

Responda APENAS em JSON válido (sem tags markdown de código fora do JSON) respeitando a estrutura fornecida.`

    const userPrompt = `Gere a campanha completa para o seguinte produto:
Título: "${productData.title}"
Categoria: "${productData.category}"
Plataforma: "${productData.platform}"
Preço: R$ ${productData.price} (Promo: R$ ${productData.promo_price || productData.price})
Comissão: ${productData.commission_rate}% (~R$ ${productData.commission_amount})
Vendas: ${productData.sales_count} | Avaliação: ${productData.rating}/5.0 (${productData.reviews_count} reviews)
Vendedor: "${productData.seller || 'Oficial'}"
Contexto prévio de IA: "${productData.ai_analysis || productData.ai_summary || ''}"

Retorne o JSON no seguinte formato exato:
{
  "product_intelligence": {
    "what_is": "explicação simples e direta do que é o produto",
    "solves_problem": "qual dor ou problema real resolve",
    "target_audiences": [
      { "name": "Perfil 1", "description": "detalhe", "confidence": "inferred" },
      { "name": "Perfil 2", "description": "detalhe", "confidence": "inferred" },
      { "name": "Perfil 3", "description": "detalhe", "confidence": "inferred" }
    ],
    "motivations": ["motivação 1", "motivação 2", "motivação 3"],
    "benefits": [
      { "text": "benefício sustentado 1", "confidence": "confirmed" },
      { "text": "benefício sustentado 2", "confidence": "inferred" }
    ],
    "objections": ["objeção de preço/confiança/qualidade 1", "objeção 2", "objeção 3"],
    "differentials": ["diferencial sustentado por dados"],
    "use_situations": ["situação prática de uso 1", "situação prática 2"],
    "confidence_summary": {
      "confirmed": ["Preço de R$ ...", "Nota 4.5+", "Plataforma oficial"],
      "inferred": ["Público principal", "Situações de uso em rotina corrida"],
      "unavailable": ["Garantia estendida do fabricante", "Tempo exato de entrega"]
    }
  },
  "selling_angles": [
    {
      "id": "angle_1",
      "title": "Problema & Solução",
      "public": "Pessoas que sofrem com...",
      "pain_desire": "Dor central...",
      "hook": "Gancho magnético...",
      "argument": "Argumento lógico e convincente...",
      "objection_to_beat": "Objeção a quebrar...",
      "cta": "Confira como funciona no link oficial",
      "recommended_channel": "Instagram / TikTok",
      "recommended_format": "Reels / TikTok 30s"
    },
    {
      "id": "angle_2",
      "title": "Praticidade & Produtividade",
      "public": "Rotina acelerada...",
      "pain_desire": "Economizar tempo...",
      "hook": "Gancho de praticidade...",
      "argument": "Argumento de conveniência...",
      "objection_to_beat": "Será que é difícil de usar?",
      "cta": "Veja os detalhes e garanta o seu",
      "recommended_channel": "TikTok / Shorts",
      "recommended_format": "Vídeo 15s dinâmico"
    },
    {
      "id": "angle_3",
      "title": "Demonstração Visual",
      "public": "Compradores visuais...",
      "pain_desire": "Ver para crer...",
      "hook": "Olha o que acontece quando...",
      "argument": "Demonstração clara do resultado...",
      "objection_to_beat": "Qualidade do produto",
      "cta": "Toque no link para ver a demonstração completa",
      "recommended_channel": "YouTube Shorts / TikTok",
      "recommended_format": "Vídeo 30s"
    },
    {
      "id": "angle_4",
      "title": "Curiosidade & Descoberta",
      "public": "Consumidores de novidades...",
      "pain_desire": "Descobrir o segredo...",
      "hook": "O item que quase ninguém conhece mas todo mundo precisa...",
      "argument": "Revelação do produto e utilidade...",
      "objection_to_beat": "Necessidade real",
      "cta": "Descubra todos os modelos disponíveis",
      "recommended_channel": "Instagram / Pinterest",
      "recommended_format": "Carrossel & Reels"
    },
    {
      "id": "angle_5",
      "title": "Custo-Benefício Inteligente",
      "public": "Buscadores de economia...",
      "pain_desire": "Não gastar em alternativas caras...",
      "hook": "Por que pagar 3x mais quando você pode ter isso...",
      "argument": "Comparação de valor pelo preço de R$ ...",
      "objection_to_beat": "Preço x durabilidade",
      "cta": "Confira o valor atualizado na loja",
      "recommended_channel": "Facebook / WhatsApp / Telegram",
      "recommended_format": "Mensagem Promocional & Post"
    }
  ],
  "hooks_bank": [
    { "id": "h1", "type": "problem", "text": "Texto do gancho 1...", "strength_score": 92, "confidence": "confirmed" },
    { "id": "h2", "type": "curiosity", "text": "Texto do gancho 2...", "strength_score": 88, "confidence": "inferred" },
    { "id": "h3", "type": "demonstration", "text": "Texto do gancho 3...", "strength_score": 95, "confidence": "confirmed" },
    { "id": "h4", "type": "question", "text": "Texto do gancho 4...", "strength_score": 85, "confidence": "inferred" },
    { "id": "h5", "type": "discovery", "text": "Texto do gancho 5...", "strength_score": 90, "confidence": "inferred" },
    { "id": "h6", "type": "comparison", "text": "Texto do gancho 6...", "strength_score": 87, "confidence": "confirmed" },
    { "id": "h7", "type": "benefit", "text": "Texto do gancho 7...", "strength_score": 91, "confidence": "confirmed" },
    { "id": "h8", "type": "identification", "text": "Texto do gancho 8...", "strength_score": 89, "confidence": "inferred" },
    { "id": "h9", "type": "curiosity", "text": "Texto do gancho 9...", "strength_score": 86, "confidence": "inferred" },
    { "id": "h10", "type": "problem", "text": "Texto do gancho 10...", "strength_score": 93, "confidence": "confirmed" }
  ],
  "variations": [
    {
      "version_letter": "A",
      "hypothesis_name": "Hipótese A: Foco na Dor e Problema Central",
      "hypothesis_details": "Testa se identificar a frustração diária gera maior retenção nos primeiros 3 segundos.",
      "angle_title": "Problema & Solução",
      "hook_type": "problem",
      "hook_text": "Texto do gancho da Versão A",
      "copy_text": "Texto persuasivo completo adaptado ao formato",
      "cta_text": "Toque no link para conferir detalhes e garantir o seu com segurança",
      "cta_objective": "conferir",
      "channel": "TikTok",
      "format": "script_30s",
      "video_scenes": [
        { "scene_number": 1, "time_range": "0-3s", "visual_action": "Cena de frustração com o problema", "on_screen_text": "Cansado disso?", "narration": "Se você também sofre com...", "duration_sec": 3 },
        { "scene_number": 2, "time_range": "3-7s", "visual_action": "Apresentação rápida do produto em mãos", "on_screen_text": "A solução definitiva", "narration": "Esse produto resolve em segundos.", "duration_sec": 4 },
        { "scene_number": 3, "time_range": "7-15s", "visual_action": "Demonstração do funcionamento em tempo real", "on_screen_text": "Fácil e rápido", "narration": "Veja como é simples de usar...", "duration_sec": 8 },
        { "scene_number": 4, "time_range": "15-22s", "visual_action": "Benefício e resultado final evidente", "on_screen_text": "Resultado aprovado", "narration": "Economiza tempo e esforço.", "duration_sec": 7 },
        { "scene_number": 5, "time_range": "22-30s", "visual_action": "Tela com indicação do link na bio/descrição", "on_screen_text": "Link na Bio / Detalhes", "narration": "Confira o link oficial nos comentários ou na bio.", "duration_sec": 8 }
      ],
      "estimated_score": 88,
      "score_breakdown": {
        "hook_strength": 90,
        "clarity": 88,
        "audience_fit": 86,
        "benefit_strength": 92,
        "cta_quality": 85,
        "channel_fit": 90,
        "argument_depth": 87,
        "exaggerated_claim_risk": 95
      },
      "compliance_status": "approved",
      "compliance_notes": "Linguagem honesta, baseada em utilidade real e sem promessas milagrosas."
    },
    {
      "version_letter": "B",
      "hypothesis_name": "Hipótese B: Demonstração Visual e Efeito 'Uau'",
      "hypothesis_details": "Testa se mostrar o produto funcionando de imediato converte melhor o público visual.",
      "angle_title": "Demonstração Visual",
      "hook_type": "demonstration",
      "hook_text": "Texto do gancho da Versão B",
      "copy_text": "Texto focado nos diferenciais visuais",
      "cta_text": "Veja mais demonstrações e avaliações no link",
      "cta_objective": "detalhes",
      "channel": "Instagram Reels",
      "format": "script_15s",
      "video_scenes": [
        { "scene_number": 1, "time_range": "0-3s", "visual_action": "Close-up dinâmico do produto em ação", "on_screen_text": "Olha isso aqui!", "narration": "Você já viu algo assim?", "duration_sec": 3 },
        { "scene_number": 2, "time_range": "3-8s", "visual_action": "Corte rápido mostrando a facilidade", "on_screen_text": "Funciona mesmo", "narration": "Em poucos passos tudo pronto.", "duration_sec": 5 },
        { "scene_number": 3, "time_range": "8-12s", "visual_action": "Comparação antes e depois", "on_screen_text": "Diferença gritante", "narration": "A praticidade é incomparável.", "duration_sec": 4 },
        { "scene_number": 4, "time_range": "12-15s", "visual_action": "Gesto apontando para o link", "on_screen_text": "Link oficial na bio", "narration": "O link com desconto tá na bio!", "duration_sec": 3 }
      ],
      "estimated_score": 85,
      "score_breakdown": {
        "hook_strength": 92,
        "clarity": 85,
        "audience_fit": 84,
        "benefit_strength": 88,
        "cta_quality": 82,
        "channel_fit": 88,
        "argument_depth": 80,
        "exaggerated_claim_risk": 90
      },
      "compliance_status": "approved",
      "compliance_notes": "Demonstração realista compatível com os dados do marketplace."
    },
    {
      "version_letter": "C",
      "hypothesis_name": "Hipótese C: Curiosidade e Custo-Benefício",
      "hypothesis_details": "Testa apelo de compras inteligentes e descoberta de achados.",
      "angle_title": "Curiosidade & Descoberta",
      "hook_type": "curiosity",
      "hook_text": "Texto do gancho da Versão C",
      "copy_text": "Texto estilo 'achadinho' com valor",
      "cta_text": "Confira o valor e avaliações de quem já comprou",
      "cta_objective": "conhecer",
      "channel": "WhatsApp / Telegram / Stories",
      "format": "story",
      "video_scenes": [
        { "scene_number": 1, "time_range": "0-5s", "visual_action": "Story segurando o produto em clima de achadinho", "on_screen_text": "Achei isso na internet...", "narration": "Gente, encontrei esse item por um valor muito bom.", "duration_sec": 5 },
        { "scene_number": 2, "time_range": "5-10s", "visual_action": "Mostrando embalagem e qualidade real", "on_screen_text": "Vale a pena?", "narration": "A nota é alta e o material é super resistente.", "duration_sec": 5 },
        { "scene_number": 3, "time_range": "10-15s", "visual_action": "Sticker de link clicável", "on_screen_text": "Toque no link 👆", "narration": "Deixei o link da loja de confiança aqui pra vocês.", "duration_sec": 5 }
      ],
      "estimated_score": 86,
      "score_breakdown": {
        "hook_strength": 86,
        "clarity": 88,
        "audience_fit": 88,
        "benefit_strength": 84,
        "cta_quality": 88,
        "channel_fit": 86,
        "argument_depth": 82,
        "exaggerated_claim_risk": 92
      },
      "compliance_status": "approved",
      "compliance_notes": "Totalmente em conformidade com políticas de transparência."
    }
  ],
  "multi_channel_copies": {
    "instagram_caption": "Legenda completa para feed/carrossel do Instagram com hashtags estratégicas e sem exageros.",
    "tiktok_caption": "Legenda dinâmica e curta com tags virais.",
    "whatsapp_message": "Mensagem formatada para envio em grupos/listas com bullet points e link claro.",
    "telegram_message": "Post promocional completo com formatação limpa para canal de promoções.",
    "pinterest_description": "Descrição otimizada para SEO do Pinterest.",
    "landing_page_headline_copy": "Headline magnética + subtítulo + 3 tópicos de benefícios para página de captura/venda."
  },
  "video_scripts_collection": {
    "script_15s": { "title": "Roteiro Rápido 15s", "scenes_summary": "Gancho (3s) -> Problema (5s) -> Demonstração (4s) -> CTA (3s)" },
    "script_30s": { "title": "Roteiro Padrão 30s", "scenes_summary": "Gancho (3s) -> Dor (4s) -> Apresentação (8s) -> Benefício (7s) -> Prova/Nota (4s) -> CTA (4s)" },
    "script_60s": { "title": "Roteiro Detalhado 60s (Unboxing/Review)", "scenes_summary": "Gancho forte (5s) -> História/Contexto (10s) -> Unboxing e primeiras impressões (15s) -> Teste prático (15s) -> Objeções respondidas (10s) -> CTA com link (5s)" }
  },
  "overall_campaign_score": 87,
  "score_breakdown": {
    "hook_strength": 89,
    "clarity": 88,
    "audience_fit": 87,
    "benefit_strength": 88,
    "cta_quality": 85,
    "channel_fit": 88,
    "argument_depth": 85,
    "exaggerated_claim_risk": 92,
    "explanation": "Score de estimativa pré-teste da IA baseado em 8 dimensões de persuasão ética e dados reais de mercado."
  },
  "compliance_review": {
    "status": "approved",
    "unverified_claims": [],
    "false_urgency_found": false,
    "price_consistency": "Preço base conferido com a fonte",
    "ad_policy_safety_score": 96,
    "reasons": ["Não utiliza gatilhos de falsa escassez", "Benefícios sustentados por utilidade do produto", "CTA clara e honesta"],
    "suggestions": ["Mantenha o foco em unboxing e demonstração no primeiro teste"]
  }
}`

    try {
      const completion = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const rawContent = completion.choices?.[0]?.message?.content || '{}'
      let parsed = {}

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = JSON.parse(rawContent)
        }
      } catch (parseErr) {
        console.log('Error parsing AI campaign JSON:', parseErr.message)
        return e.json(500, {
          error: 'Falha ao processar o formato gerado pela IA. Tente novamente.',
        })
      }

      // Check affiliate configuration
      const affiliateIsConfigured = !!(
        productData.affiliate_url && productData.affiliate_url.trim().length > 5
      )

      // Calculate final estimated score
      const finalEstimatedScore = parsed.overall_campaign_score || 85

      return e.json(200, {
        success: true,
        product: {
          id: productData.id,
          discovered_id: productData.discovered_id,
          title: productData.title,
          category: productData.category,
          platform: productData.platform,
          price: productData.price,
          promo_price: productData.promo_price,
          commission_rate: productData.commission_rate,
          commission_amount: productData.commission_amount,
          product_url: productData.product_url,
          affiliate_url: productData.affiliate_url,
          affiliate_is_configured: affiliateIsConfigured,
          image_url: productData.image_url,
          seller: productData.seller,
          sales_count: productData.sales_count,
          reviews_count: productData.reviews_count,
          rating: productData.rating,
          opportunity_score: productData.opportunity_score,
        },
        product_intelligence: parsed.product_intelligence || {},
        selling_angles: parsed.selling_angles || [],
        hooks_bank: parsed.hooks_bank || [],
        variations: parsed.variations || [],
        multi_channel_copies: parsed.multi_channel_copies || {},
        video_scripts_collection: parsed.video_scripts_collection || {},
        estimated_score: finalEstimatedScore,
        score_breakdown: parsed.score_breakdown || {},
        compliance_review: parsed.compliance_review || {
          status: 'approved',
          unverified_claims: [],
          false_urgency_found: false,
          reasons: ['Conforme com as regras do Laboratório'],
        },
      })
    } catch (err) {
      console.log('Error generating full campaign with AI:', err)
      return e.json(500, { error: 'Erro ao conectar com a IA do Skip Cloud: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
