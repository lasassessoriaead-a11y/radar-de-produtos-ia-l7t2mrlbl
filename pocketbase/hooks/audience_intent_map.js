// Backend Hook for Audience Intent Map & Search Terms Bank Generation
// Uses $ai.chat (Skip AI fast model) with fallback to deterministic heuristic generation

routerAdd(
  'POST',
  '/backend/v1/audience/generate-intent-map',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const productTitle = (body.product_title || '').trim()
    const category = (body.category || 'Geral').trim()
    const productId = (body.product_id || '').trim()
    const problem = (body.problem || '').trim()
    const desire = (body.desire || '').trim()
    const targetPublic = (body.target_public || '').trim()

    if (!productTitle && !category && !problem && !desire) {
      return e.badRequestError('Informe ao menos um produto, categoria, problema ou desejo.')
    }

    let intentMap = {
      high_intent: [],
      medium_intent: [],
      low_intent: [],
      terms_bank: [],
      recurring_questions: [],
      common_objections: [],
      common_desires: [],
      suggested_communities: [],
    }

    try {
      const prompt = `Você é o Diretor de Inteligência de Audiência e Demanda do Radar de Produtos IA.
Analise a demanda de mercado para o contexto abaixo:
- Produto / Foco: "${productTitle || 'Geral'}"
- Categoria: "${category}"
- Problema central: "${problem || 'Praticidade, resolução de dor do dia a dia'}"
- Desejo central: "${desire || 'Facilidade, economia de tempo/dinheiro, melhoria de vida'}"
- Público estimado: "${targetPublic || 'Consumidores gerais'}"

IMPORTANTE - PRINCÍPIO DE PRIVACIDADE E ÉTICA:
- NUNCA infira atributos sensíveis (raça, religião, orientação sexual, saúde íntima, partido político).
- Foque EXCLUSIVAMENTE em interesse de consumo, dúvidas funcionais, usabilidade, preço, comparações e contextos de uso reais.
- Mantenha termos compatíveis com buscas em fóruns públicos como Reddit (ex: r/brasil, r/carros, r/shopee, r/futurology, etc.).

Gere um JSON RIGOROSO com a seguinte estrutura:
{
  "high_intent": [
    { "term": "onde comprar aspirador para carro", "reason": "Busca direta por canal de aquisição com decisão de compra madura." },
    { "term": "qual melhor aspirador portátil para carro", "reason": "Comparativo transacional em momento final de escolha." }
  ],
  "medium_intent": [
    { "term": "como limpar o carro rápido", "reason": "Busca por processo e método de solução, ainda avaliando opções." },
    { "term": "como tirar pelos de cachorro do banco do carro", "reason": "Problema específico procurando solução prática." }
  ],
  "low_intent": [
    { "term": "dicas para manter o carro limpo", "reason": "Interesse amplo e informativo, fase inicial de conscientização." }
  ],
  "terms_bank": [
    { "term": "aspirador automotivo vale a pena", "type": "recommendation", "stage": "high", "reason": "Validação pré-compra" },
    { "term": "aspirador portátil potente", "type": "solution", "stage": "high", "reason": "Especificação técnica de compra" },
    { "term": "como tirar areia do carpete", "type": "problem", "stage": "medium", "reason": "Dor de limpeza profunda" },
    { "term": "aspirador pequeno sem fio", "type": "desire", "stage": "medium", "reason": "Desejo por portabilidade" },
    { "term": "aspirador xiaomi vs baseus", "type": "comparison", "stage": "high", "reason": "Decisão entre marcas" },
    { "term": "bateria do mini aspirador dura quanto tempo", "type": "objection", "stage": "high", "reason": "Objeção sobre autonomia" },
    { "term": "aspirador portátil é fraco", "type": "complaint", "stage": "medium", "reason": "Medo de baixa sucção" },
    { "term": "vassoura de borracha ou aspirador", "type": "alternative", "stage": "low", "reason": "Comparação de categorias distintas" },
    { "term": "onde usar aspirador 12v", "type": "usage_context", "stage": "medium", "reason": "Dúvida de usabilidade" }
  ],
  "recurring_questions": [
    { "question": "Vale a pena comprar aspirador portátil ou é muito fraco?", "signals_count": 38, "angle_suggested": "Demonstração de força de sucção puxando moedas e areia" },
    { "question": "Quanto tempo dura a bateria no uso real?", "signals_count": 29, "angle_suggested": "Teste de autonomia cronometrado limpando carro inteiro" },
    { "question": "Qual a melhor marca com preço acessível?", "signals_count": 22, "angle_suggested": "Comparativo Custo x Benefício com tabela clara" }
  ],
  "common_objections": [
    { "objection": "A bateria acaba antes de terminar de limpar", "frequency": "Alta", "counter_argument": "Mostrar que uma carga completa dura 25min, tempo de sobra para 2 limpezas rápidas." },
    { "objection": "É muito barulhento ou esquenta", "frequency": "Média", "counter_argument": "Focar em motores brushless modernos com baixo ruído." },
    { "objection": "Filtro difícil de lavar ou repor", "frequency": "Média", "counter_argument": "Destacar filtro HEPA lavável e durável que acompanha o kit." }
  ],
  "common_desires": [
    { "desire": "Quero manter o carro limpo sem gastar R$ 80 no lava-jato toda semana", "context": "Economia e independência" },
    { "desire": "Preciso de algo compacto que guarde no porta-luvas", "context": "Espaço e praticidade" },
    { "desire": "Quero limpar farelo de comida das crianças rápido", "context": "Rotina familiar" }
  ],
  "suggested_communities": [
    { "source": "Reddit", "community": "r/carros", "theme": "Manutenção, estética automotiva e acessórios", "relevance": 95, "recommended_content": "Review sincero e vídeo curto de demonstração no porta-malas" },
    { "source": "Reddit", "community": "r/brasil", "theme": "Dicas do dia a dia e compras custo-benefício", "relevance": 82, "recommended_content": "Guia de 'Achadinhos que realmente funcionam'" },
    { "source": "Reddit", "community": "r/shopee", "theme": "Reviews de produtos importados e cupons", "relevance": 90, "recommended_content": "Alerta de melhor link com frete grátis e avaliação 4.8+" }
  ]
}

Responda APENAS o JSON válido, sem texto antes ou depois.`

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      const content = aiRes.choices[0]?.message?.content || ''
      const cleanJson = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      intentMap = JSON.parse(cleanJson)
    } catch (err) {
      console.log('Fallback intent map generation: ' + err.message)
      // Heuristic generation fallback
      const baseName = productTitle || category || 'Produto'
      intentMap = {
        high_intent: [
          {
            term: `onde comprar ${baseName} com garantia`,
            reason: 'Busca direta por fornecedor e compra iminente.',
          },
          {
            term: `qual o melhor ${baseName} custo benefício`,
            reason: 'Comparação de opções no estágio final de compra.',
          },
          {
            term: `${baseName} vale a pena mesmo`,
            reason: 'Validação final de decisão pré-compra.',
          },
        ],
        medium_intent: [
          {
            term: `como resolver ${problem || 'problema no dia a dia'}`,
            reason: 'Procura por método ou produto capaz de solucionar a dor.',
          },
          {
            term: `como usar ${baseName} passo a passo`,
            reason: 'Investigação prática sobre usabilidade.',
          },
        ],
        low_intent: [
          {
            term: `dicas e novidades em ${category}`,
            reason: 'Interesse amplo e conscientização.',
          },
        ],
        terms_bank: [
          {
            term: `${baseName} barato`,
            type: 'buying_intent',
            stage: 'high',
            reason: 'Busca por melhor oferta',
          },
          {
            term: `melhor marca de ${baseName}`,
            type: 'recommendation',
            stage: 'high',
            reason: 'Avaliação de autoridade',
          },
          {
            term: `${baseName} é bom`,
            type: 'doubt',
            stage: 'high',
            reason: 'Confirmação de qualidade',
          },
          {
            term: `como funciona ${baseName}`,
            type: 'solution',
            stage: 'medium',
            reason: 'Entendimento do mecanismo',
          },
          {
            term: `defeitos do ${baseName}`,
            type: 'objection',
            stage: 'high',
            reason: 'Prevenção de frustração',
          },
          {
            term: `alternativa para ${baseName}`,
            type: 'alternative',
            stage: 'medium',
            reason: 'Busca por opções secundárias',
          },
        ],
        recurring_questions: [
          {
            question: `${baseName} funciona de verdade ou estraga fácil?`,
            signals_count: 24,
            angle_suggested: 'Demonstração prática de resistência e teste de estresse',
          },
          {
            question: `Qual a diferença entre os modelos mais caros e mais baratos?`,
            signals_count: 18,
            angle_suggested: 'Comparativo honesto de especificações',
          },
        ],
        common_objections: [
          {
            objection: 'Preço parece muito alto ou muito baixo para ser bom',
            frequency: 'Alta',
            counter_argument: 'Explicar a composição de custo e durabilidade real.',
          },
          {
            objection: 'Dificuldade de instalar ou configurar',
            frequency: 'Média',
            counter_argument: 'Mostrar unboxing e uso em menos de 60 segundos.',
          },
        ],
        common_desires: [
          { desire: 'Resolver o problema sem perder tempo', context: 'Praticidade diária' },
          { desire: 'Não me arrepender da compra', context: 'Segurança financeira' },
        ],
        suggested_communities: [
          {
            source: 'Reddit',
            community: 'r/brasil',
            theme: 'Discussão geral de utilidades e dicas',
            relevance: 85,
            recommended_content: 'Post educativo com link verificado',
          },
          {
            source: 'Reddit',
            community: 'r/compras',
            theme: 'Achados e promoções',
            relevance: 90,
            recommended_content: 'Análise de custo-benefício',
          },
        ],
      }
    }

    // Opcional: Persistir termos no banco de termos se produto informado
    try {
      const termsCol = $app.findCollectionByNameOrId('audience_terms_bank')
      const allTerms = intentMap.terms_bank || []
      for (let i = 0; i < allTerms.length; i++) {
        const t = allTerms[i]
        try {
          // Checar se termo já existe
          const existing = $app.findRecordsByFilter(
            'audience_terms_bank',
            `term = "${t.term.replace(/"/g, '\\"')}" && category = "${category.replace(/"/g, '\\"')}"`,
            '-created',
            1,
            0,
          )
          if (!existing || existing.length === 0) {
            const rec = new Record(termsCol)
            rec.set('user_id', userId)
            rec.set('product_id', productId)
            rec.set('product_title', productTitle)
            rec.set('category', category)
            rec.set('term', t.term)
            rec.set('term_type', t.type || 'solution')
            rec.set('intent_stage', t.stage || 'medium')
            rec.set('stage_reason', t.reason || '')
            rec.set('signal_count', 1)
            rec.set('trend_status', 'stable')
            rec.set('is_active', true)
            rec.set('last_queried_at', new Date().toISOString())
            $app.save(rec)
          }
        } catch (_) {}
      }
    } catch (saveErr) {
      console.log('Error saving terms bank: ' + saveErr)
    }

    return e.json(200, {
      success: true,
      data: intentMap,
    })
  },
  $apis.requireAuth(),
)
