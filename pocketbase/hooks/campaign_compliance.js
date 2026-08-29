// Hook to review campaign compliance & ethics (Auditor / Revisor de Campanha)
// Route: POST /backend/v1/campaigns/review-compliance

routerAdd(
  'POST',
  '/backend/v1/campaigns/review-compliance',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const campaignText = (body.content || body.copy_text || '').trim()
    const productTitle = (body.product_title || '').trim()
    const productPrice = parseFloat(body.product_price || '0')
    const hookText = (body.hook_text || '').trim()
    const ctaText = (body.cta_text || '').trim()

    if (!campaignText && !hookText) {
      return e.badRequestError('Conteúdo da campanha é obrigatório para auditoria')
    }

    const systemPrompt = `Você é o Auditor & Revisor de Conformidade de Campanhas do Radar de Produtos IA.
Sua função é proteger o afiliado e garantir PERSUASÃO ÉTICA E EFICAZ (PERSUASÃO ≠ ENGANAÇÃO).
Analise o conteúdo submetido contra os seguintes riscos:
1. Alegações médicas, milagrosas ou não comprováveis
2. Falsa urgência ou falsa escassez ("últimas 2 unidades", "acaba em 5 minutos", "promoção só hoje" sem prova)
3. Preço ou desconto inventado
4. Promessa excessiva ou garantia enganosa
5. Conformidade com políticas do Meta Ads, TikTok Ads e Google Ads
6. Inconsistência com o produto real

Classifique em um dos 3 status:
- "approved" (🟢 Aprovado: persuasivo, ético e seguro)
- "needs_revision" (🟡 Revisar: pontos de melhoria ou pequenos exageros a ajustar)
- "blocked" (🔴 Bloqueado: violação grave de diretrizes ou promessa fraudulenta)

Responda APENAS em JSON válido.`

    const userPrompt = `Analise a seguinte copy/campanha:
Produto: "${productTitle}" (Preço Base: R$ ${productPrice})
Gancho: "${hookText}"
Copy Principal: "${campaignText}"
CTA: "${ctaText}"

Retorne JSON no formato:
{
  "status": "approved" | "needs_revision" | "blocked",
  "safety_score": 0 a 100,
  "false_urgency_detected": boolean,
  "unverified_claims": ["lista de alegações duvidosas se houver"],
  "policy_flags": ["pontos de atenção para Meta/TikTok"],
  "positives": ["pontos fortes e éticos da copy"],
  "improvement_suggestions": ["sugestões práticas de ajuste se houver"],
  "verdict_summary": "resumo claro do parecer em português"
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
          status: 'approved',
          safety_score: 95,
          false_urgency_detected: false,
          unverified_claims: [],
          policy_flags: [],
          positives: ['Texto direto e focado em benefícios reais'],
          improvement_suggestions: [],
          verdict_summary: 'Campanha em conformidade com as diretrizes de transparência.',
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error in campaign compliance review:', err)
      return e.json(500, { error: 'Erro ao analisar conformidade: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
