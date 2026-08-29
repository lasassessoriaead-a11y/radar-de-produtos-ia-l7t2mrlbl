// Hook to generate structured variations and hooks bank on demand
// Route: POST /backend/v1/campaigns/generate-hooks

routerAdd(
  'POST',
  '/backend/v1/campaigns/generate-hooks',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const productTitle = (body.product_title || '').trim()
    const productPrice = parseFloat(body.product_price || '0')
    const category = (body.category || 'Geral').trim()
    const targetAudience = (body.target_audience || '').trim()

    if (!productTitle) {
      return e.badRequestError('Título do produto é obrigatório')
    }

    const systemPrompt = `Você é o Especialista em Ganchos Magnéticos (Hook Master) do Laboratório de Campanhas.
Gere 10 ganchos criativos RADICALMENTE DIFERENTES para o produto informado.
Categorias obrigatórias:
- curiosity (Curiosidade)
- problem (Dor / Problema cotidiano)
- demonstration (Demonstração visual)
- question (Pergunta provocativa)
- discovery (Descoberta / Achadinho)
- comparison (Comparação de valor)
- benefit (Benefício direto)
- identification (Identificação com a persona)

NUNCA crie variações óbvias da mesma frase. Cada gancho deve explorar uma psicologia de atenção diferente.
Responda APENAS em JSON.`

    const userPrompt = `Produto: "${productTitle}" (R$ ${productPrice}) | Categoria: ${category} | Público: ${targetAudience || 'Geral'}

Retorne JSON no formato:
{
  "hooks": [
    { "id": "h1", "type": "curiosity", "type_label": "Curiosidade", "text": "...", "strength_score": 92, "target": "...", "confidence": "inferred" },
    { "id": "h2", "type": "problem", "type_label": "Problema", "text": "...", "strength_score": 95, "target": "...", "confidence": "confirmed" },
    { "id": "h3", "type": "demonstration", "type_label": "Demonstração", "text": "...", "strength_score": 94, "target": "...", "confidence": "confirmed" },
    { "id": "h4", "type": "question", "type_label": "Pergunta", "text": "...", "strength_score": 88, "target": "...", "confidence": "inferred" },
    { "id": "h5", "type": "discovery", "type_label": "Descoberta", "text": "...", "strength_score": 90, "target": "...", "confidence": "inferred" },
    { "id": "h6", "type": "comparison", "type_label": "Comparação", "text": "...", "strength_score": 89, "target": "...", "confidence": "confirmed" },
    { "id": "h7", "type": "benefit", "type_label": "Benefício", "text": "...", "strength_score": 91, "target": "...", "confidence": "confirmed" },
    { "id": "h8", "type": "identification", "type_label": "Identificação", "text": "...", "strength_score": 87, "target": "...", "confidence": "inferred" },
    { "id": "h9", "type": "problem", "type_label": "Problema", "text": "...", "strength_score": 93, "target": "...", "confidence": "confirmed" },
    { "id": "h10", "type": "curiosity", "type_label": "Curiosidade", "text": "...", "strength_score": 86, "target": "...", "confidence": "inferred" }
  ]
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
        parsed = { hooks: [] }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error in generate-hooks:', err)
      return e.json(500, { error: 'Erro ao gerar banco de ganchos: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
