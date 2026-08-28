import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScoreRing } from './ScoreRing'
import { OpportunityBadge } from './OpportunityBadge'
import { FactorsBreakdown } from './FactorsBreakdown'
import {
  ExternalLink,
  Sparkles,
  TrendingUp,
  Target,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  Send,
  Bot,
  User,
  ShoppingBag,
  Store,
} from 'lucide-react'
import type { ProductRecord } from '@/types/product'
import { aiService } from '@/services/products'

interface ProductDetailModalProps {
  product: ProductRecord | null
  isOpen: boolean
  onClose: () => void
  onAskChatNavigate?: (product: ProductRecord) => void
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAskChatNavigate,
}) => {
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'ai' | 'chat'>('overview')

  // Inline mini-chat with agent for this specific product
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Olá! Sou o Analista do Radar IA. Como posso ajudar você a vender este produto com o máximo de lucro?',
    },
  ])

  if (!product) return null

  const price = product.promo_price || product.price
  const commAmount = product.commission_amount || price * (product.commission_rate / 100)

  const handleCopyAffiliate = () => {
    const url = product.affiliate_url || product.product_url || ''
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userText = chatInput
    setChatInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setChatLoading(true)

    try {
      const res = await aiService.askAnalyst(userText, product.id)
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer }])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao responder'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Desculpe, ocorreu um erro ao consultar o analista: ${errorMessage}`,
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Structured AI points extraction
  const rawAi = product.ai_analysis || ''
  const points = {
    why: 'Alta demanda comprovada com excelente comissão.',
    audience: 'Público interessado em praticidade, novidades e ofertas virais.',
    benefit: 'Solução rápida e visual com preço competitivo.',
    difficulty: 'Exige diferenciar criativos para não competir apenas por preço.',
    conversion: 'Altíssimo com vídeos curtos de unboxing e demonstração prática.',
  }

  if (rawAi) {
    const lines = rawAi.split('\n')
    lines.forEach((l) => {
      const lower = l.toLowerCase()
      if (lower.includes('1)') || lower.includes('vale a pena'))
        points.why = l.replace(/^.*?:\s*/, '').trim()
      if (lower.includes('2)') || lower.includes('compraria') || lower.includes('público'))
        points.audience = l.replace(/^.*?:\s*/, '').trim()
      if (lower.includes('3)') || lower.includes('benefício'))
        points.benefit = l.replace(/^.*?:\s*/, '').trim()
      if (lower.includes('4)') || lower.includes('dificuldade') || lower.includes('objeção'))
        points.difficulty = l.replace(/^.*?:\s*/, '').trim()
      if (lower.includes('5)') || lower.includes('conversão') || lower.includes('conteúdo'))
        points.conversion = l.replace(/^.*?:\s*/, '').trim()
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#11131C] border-[#24283B] text-white p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-[#232738] bg-[#161824]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <OpportunityBadge level={product.opportunity_level} size="md" />
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0A0B10] text-[#00F2FF] border border-[#00F2FF]/30">
                Plataforma: {product.platform || 'Geral'}
              </span>
              <span className="text-xs text-gray-400 bg-[#1D202F] px-2.5 py-1 rounded">
                {product.category || 'Geral'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {product.affiliate_url && (
                <Button
                  onClick={handleCopyAffiliate}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#2A2F45] hover:border-[#00F2FF] hover:bg-[#00F2FF]/10 text-gray-200"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-[#00E676]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copiedLink ? 'Link Copiado!' : 'Copiar Link Afiliado'}
                </Button>
              )}

              {product.product_url && (
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-[#1F2335] hover:bg-[#282D45] text-white border border-[#2E3552]"
                >
                  Ver na Loja
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </a>
              )}
            </div>
          </div>

          <DialogTitle className="text-lg md:text-xl font-bold text-white mt-2 leading-snug">
            {product.title}
          </DialogTitle>
        </DialogHeader>

        {/* Modal Body with Tabs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 bg-[#0A0B10] p-1 border border-[#232738] rounded-xl mb-6">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00F2FF] text-xs font-semibold"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="factors"
                className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00F2FF] text-xs font-semibold"
              >
                9 Fatores do Score
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#7000FF] text-xs font-semibold"
              >
                ✨ Análise IA
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00F2FF] text-xs font-semibold"
              >
                💬 Perguntar ao Analista
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Product Image & Quick Info */}
                <div className="md:col-span-5 space-y-4">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0A0B10] border border-[#232738] shadow-inner">
                    <img
                      src={product.image_url || 'https://img.usecurling.com/p/600/600?q=product'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-[#0A0B10]/85 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                      <ScoreRing score={product.opportunity_score} size="md" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#161824] border border-[#232738] space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Vendedor / Loja:</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-[#00F2FF]" />
                        {product.seller || 'Oficial'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Nicho Específico:</span>
                      <span className="font-semibold text-gray-200">
                        {product.niche || product.category || 'Geral'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Fonte do Registro:</span>
                      <span className="font-mono text-gray-300 uppercase text-[10px] bg-[#10121A] px-2 py-0.5 rounded">
                        {product.source || 'manual'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Metrics & AI Summary */}
                <div className="md:col-span-7 space-y-4">
                  {/* Big Numbers Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#161824] border border-[#232738]">
                      <span className="text-xs text-gray-400 block mb-1">Preço Promocional</span>
                      <div className="font-mono font-extrabold text-2xl text-white">
                        R$ {price.toFixed(2)}
                      </div>
                      {product.promo_price && product.promo_price < product.price && (
                        <span className="text-xs text-gray-500 line-through">
                          De R$ {product.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30">
                      <span className="text-xs text-[#00E676] font-semibold block mb-1">
                        Sua Comissão ({product.commission_rate}%)
                      </span>
                      <div className="font-mono font-extrabold text-2xl text-[#00E676]">
                        R$ {commAmount.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-[#00E676]/80">por venda confirmada</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#161824] border border-[#232738]">
                      <span className="text-xs text-gray-400 block mb-1">Validação de Mercado</span>
                      <div className="font-mono font-bold text-lg text-white">
                        {product.sales_count?.toLocaleString('pt-BR') || 0} vendas
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {product.reviews_count || 0} avaliações (
                        {product.rating?.toFixed(1) || '4.5'} ★)
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#161824] border border-[#232738]">
                      <span className="text-xs text-gray-400 block mb-1">
                        Score de Oportunidade
                      </span>
                      <div className="font-mono font-bold text-lg text-[#00F2FF]">
                        {product.opportunity_score}/100
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Nível: <strong className="uppercase">{product.opportunity_level}</strong>
                      </span>
                    </div>
                  </div>

                  {/* AI Quick Take */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#7000FF]/15 to-[#00F2FF]/10 border border-[#7000FF]/30 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#00F2FF]">
                      <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                      Parecer do Analista IA
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">
                      {product.ai_summary ||
                        product.ai_analysis ||
                        'Produto em avaliação com alto potencial de retorno na categoria.'}
                    </p>
                  </div>

                  {/* CTA Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    {product.affiliate_url && (
                      <a
                        href={product.affiliate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center rounded-xl text-sm font-bold h-11 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] text-[#0A0B10] hover:opacity-90 transition-opacity font-mono shadow-[0_0_20px_rgba(0,242,255,0.25)]"
                      >
                        Abrir Link de Afiliado
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    )}
                    <Button
                      onClick={() => setActiveTab('chat')}
                      className="h-11 px-4 rounded-xl bg-[#7000FF] hover:bg-[#8519FF] text-white font-semibold gap-2"
                    >
                      <Bot className="w-4 h-4 text-[#00F2FF]" />
                      Estratégia de Venda
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: 9 FACTORS */}
            <TabsContent value="factors" className="space-y-4 m-0">
              <FactorsBreakdown product={product} />
            </TabsContent>

            {/* TAB 3: AI DEEP DIVE */}
            <TabsContent value="ai" className="space-y-4 m-0">
              <div className="p-4 rounded-xl bg-[#161824] border border-[#232738] mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#7000FF]" />
                    <h4 className="text-base font-bold text-white">
                      Relatório Estratégico do Analista IA
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-[#00F2FF]">
                    Modelo: Skip Analista-Radar
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Por que vale a pena */}
                <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00E676] uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    1. Por que Vale a Pena Vender
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{points.why}</p>
                </div>

                {/* 2. Quem compraria */}
                <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FF] uppercase tracking-wider">
                    <Target className="w-4 h-4" />
                    2. Público-Alvo Ideal
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{points.audience}</p>
                </div>

                {/* 3. Principal benefício */}
                <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    3. Principal Benefício & Gancho
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{points.benefit}</p>
                </div>

                {/* 4. Dificuldade */}
                <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FF3D00] uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    4. Possível Objeção / Dificuldade
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{points.difficulty}</p>
                </div>
              </div>

              {/* 5. Potencial de conversão */}
              <div className="p-4 rounded-xl bg-[#12141F] border border-[#7000FF]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#7000FF] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  5. Potencial de Conversão & Recomendação de Conteúdo
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">{points.conversion}</p>
              </div>
            </TabsContent>

            {/* TAB 4: CHAT WITH ANALYST */}
            <TabsContent value="chat" className="space-y-4 m-0">
              <div className="h-64 overflow-y-auto p-4 rounded-xl bg-[#0A0B10] border border-[#232738] space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#7000FF] flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#00F2FF] text-[#0A0B10] font-medium font-sans'
                          : 'bg-[#161824] text-gray-200 border border-[#232738]'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-[#00F2FF]/20 border border-[#00F2FF] flex items-center justify-center flex-shrink-0 text-[#00F2FF]">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Bot className="w-4 h-4 text-[#00F2FF] animate-spin" />
                    <span>Analista pensando...</span>
                  </div>
                )}
              </div>

              {/* Suggested Questions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setChatInput(
                      'Qual o melhor script de vídeo para vender este produto no TikTok?',
                    )
                  }
                  className="px-2.5 py-1 rounded-full bg-[#161824] hover:bg-[#202436] text-gray-300 border border-[#2A2E42] whitespace-nowrap text-[11px]"
                >
                  💡 Script para TikTok
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setChatInput('Vale mais a pena anunciar no tráfego pago ou orgânico?')
                  }
                  className="px-2.5 py-1 rounded-full bg-[#161824] hover:bg-[#202436] text-gray-300 border border-[#2A2E42] whitespace-nowrap text-[11px]"
                >
                  🎯 Tráfego Pago vs Orgânico
                </button>
                <button
                  type="button"
                  onClick={() => setChatInput('Quais os principais concorrentes deste produto?')}
                  className="px-2.5 py-1 rounded-full bg-[#161824] hover:bg-[#202436] text-gray-300 border border-[#2A2E42] whitespace-nowrap text-[11px]"
                >
                  🔍 Concorrentes
                </button>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ex: Como montar uma oferta irresistível para este produto?"
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#0A0B10] border border-[#2A2E42] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF]"
                />
                <Button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-10 px-4 rounded-xl bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10] font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
