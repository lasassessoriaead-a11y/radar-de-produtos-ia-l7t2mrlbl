// Hook to generate visual concept before image generation
// Route: POST /backend/v1/creatives/generate-concept

routerAdd(
  'POST',
  '/backend/v1/creatives/generate-concept',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const productTitle = (body.product_title || '').trim()
    const productCategory = (body.product_category || '').trim()
    const targetAudience = (body.target_audience || '').trim()
    const angleTitle = (body.angle_title || '').trim()
    const hookText = (body.hook_text || '').trim()
    const copyText = (body.copy_text || '').trim()
    const ctaText = (body.cta_text || '').trim()
    const variationLetter = (body.variation_letter || 'A').toUpperCase()
    const hypothesisType = (body.hypothesis_type || 'A_PROBLEMA').trim()
    const format = (body.format || 'feed_1_1').trim()
    const brandStyle = (body.brand_style || 'modern_bold').trim()

    if (!productTitle) {
      return e.badRequestError('Título do produto é obrigatório')
    }

    const systemPrompt = `Você é o Diretor de Criação Visual do Radar de Produtos IA.
Sua missão: Antes de gerar qualquer imagem ou arte, você define o CONCEITO VISUAL ESTRATÉGICO fundamentado em:
PRODUTO → PÚBLICO → ÂNGULO → GANCHO → HIPÓTESE → CRIATIVO.

Regra dos Criativos A/B/C (Hipóteses verdadeiramente distintas):
- HIPÓTESE A (PROBLEMA/DOR): Foco na dor cotidiana, incômodo antes de conhecer a solução, frustração real, atmosfera de identificação imediata.
- HIPÓTESE B (DEMONSTRAÇÃO/PRODUTO EM USO): Foco no produto em ação, clareza funcional de funcionamento, close no diferencial, prova visual de qualidade.
- HIPÓTESE C (BENEFÍCIO/RESULTADO): Foco na transformação positiva, alívio, alegria, resultado estético ou de economia, lifestyle aspiracional mas realista.

Regra de Fidelidade do Produto:
Se for produto físico, NUNCA inventar funções místicas, acessórios inexistentes ou resultados milagrosos.

Retorne APENAS um objeto JSON válido.`

    const userPrompt = `Gere o Conceito Criativo Visual com os seguintes parâmetros:
Produto: "${productTitle}" (Categoria: ${productCategory})
Público-Alvo: "${targetAudience}"
Ângulo de Venda: "${angleTitle}"
Gancho Selecionado: "${hookText}"
Copy Base: "${copyText}"
CTA: "${ctaText}"
Variação/Hipótese: Versão ${variationLetter} (${hypothesisType})
Formato Desejado: ${format}
Estilo da Marca: ${brandStyle}

Formato da resposta JSON:
{
  "concept_name": "Nome curto e marcante do conceito",
  "hypothesis_summary": "Explicação da hipótese testada (Dor vs Demonstração vs Benefício)",
  "visual_hook": "Descrição clara do gancho visual que para o scroll nos primeiros 0.5s",
  "rationale": "Por que este conceito combina perfeitamente com o público e o ângulo escolhido",
  "scene_composition": "Descrição da composição da cena, enquadramento e ponto focal",
  "lighting_and_mood": "Iluminação, paleta de cores e clima da imagem",
  "text_hierarchy": {
    "headline": "Gancho em destaque (curto e impactante)",
    "subheadline": "Complemento persuasivo ou dor rápida",
    "benefit_pill": "Benefício principal comprovado",
    "cta_button": "Chamada para ação clara e direta",
    "badge_tag": "Selo de credibilidade ou novidade"
  },
  "suggested_image_prompt": "Prompt em inglês pronto para gerador de imagens IA (OpenAI DALL-E / gpt-image-1) focando em fotorrealismo publicitário comercial sem inventar características falsas",
  "fidelity_notes": "Orientações sobre fidelidade ao produto real e se requer aviso de representação conceitual"
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
          concept_name: `Conceito Estratégico ${variationLetter}: ${angleTitle || 'Impacto Direto'}`,
          hypothesis_summary: `Teste de hipótese focada em ${hypothesisType}`,
          visual_hook: hookText || 'Destaque visual de alta clareza',
          rationale: 'Conceito alinhado com o público e benefícios confirmados do produto.',
          scene_composition: 'Plano central limpo com produto em evidência.',
          lighting_and_mood: 'Iluminação comercial limpa e moderna.',
          text_hierarchy: {
            headline: hookText || 'Descubra a Solução Prática',
            subheadline: 'Testado e recomendado para o seu dia a dia',
            benefit_pill: 'Alta Durabilidade & Praticidade',
            cta_button: ctaText || 'Ver Detalhes do Produto',
            badge_tag: 'Destaque no Radar',
          },
          suggested_image_prompt: `Clean professional commercial product photograph of ${productTitle}, crisp studio lighting, ultra sharp focus, advertising aesthetics, neutral modern background, 4k.`,
          fidelity_notes: 'Manter características originais do produto.',
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error generating visual concept:', err)
      return e.json(500, { error: 'Erro ao gerar conceito visual: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
