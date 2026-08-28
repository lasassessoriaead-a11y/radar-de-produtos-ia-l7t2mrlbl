import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShoppingBag,
  ExternalLink,
  Flame,
  Zap,
  RefreshCw,
  Info,
  CheckCircle2,
  HelpCircle,
  Clock,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScoreRing } from '@/components/ScoreRing'
import { OpportunityBadge } from '@/components/OpportunityBadge'
import { productsService } from '@/services/products'
import pb from '@/lib/pocketbase/client'
import type { ProductRecord } from '@/types/product'
import { streamAgentChat } from '@/lib/skipAi'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created: string
  productId?: string
  productData?: ProductRecord
}

export default function AnalystPage() {
  const [searchParams] = useSearchParams()
  const productIdParam = searchParams.get('product')

  const [products, setProducts] = useState<ProductRecord[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>(productIdParam || '')
  const [conversationId, setConversationId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou o Analista do Radar de Produtos IA. Estou conectado à sua base de produtos e inteligência de afiliados no Brasil.\n\nVocê pode me pedir para:\n• Identificar os 3 melhores produtos de um nicho específico\n• Criar ganchos e roteiros de vídeos para TikTok/Reels\n• Comparar a viabilidade de 2 ou mais produtos\n• Explicar os pontos fracos e objeções de qualquer oferta.',
      created: new Date().toISOString(),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load products list for context selection
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await productsService.getProducts('', '-opportunity_score', 1, 100)
        setProducts(res.items)
      } catch (err) {
        console.error('Error loading products for analyst:', err)
      }
    }
    loadProducts()
  }, [])

  // Update selected product if param changes
  useEffect(() => {
    if (productIdParam) {
      setSelectedProductId(productIdParam)
    }
  }, [productIdParam])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Send message using streaming endpoint or sync fallback
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isStreaming) return

    setInputMessage('')
    const userMsgId = 'user-' + Date.now()
    const assistantMsgId = 'asst-' + Date.now()

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: text,
        created: new Date().toISOString(),
        productId: selectedProductId || undefined,
        productData: selectedProduct || undefined,
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        created: new Date().toISOString(),
      },
    ])

    setIsStreaming(true)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/radar/ask-analyst-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({
            message: text,
            product_id: selectedProductId || undefined,
            conversation_id: conversationId,
          }),
        },
      )

      if (!res.ok) {
        // Fallback to sync endpoint if streaming error
        const syncRes = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/radar/ask-analyst`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({
              message: text,
              product_id: selectedProductId || undefined,
              conversation_id: conversationId,
            }),
          },
        )
        const data = await syncRes.json()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: data.content || data.answer } : m,
          ),
        )
        if (data.conversation_id) setConversationId(data.conversation_id)
        return
      }

      await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: full } : m)),
          )
        },
      })
    } catch (err: unknown) {
      console.error('Agent chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar resposta'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: 'Tivemos uma oscilação na resposta da IA. Por favor, tente novamente.',
              }
            : m,
        ),
      )
      toast.error('Erro na resposta do analista')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Conversa reiniciada. Como posso te orientar estrategicamente sobre seus produtos de afiliados?',
        created: new Date().toISOString(),
      },
    ])
    setConversationId(null)
    toast.info('Chat reiniciado')
  }

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4 max-w-7xl mx-auto pb-4 overflow-hidden">
      {/* Left Sidebar: Product Context Selector */}
      <div className="w-full md:w-80 flex flex-col justify-between p-4 rounded-2xl bg-[#141622] border border-[#232738] overflow-hidden flex-shrink-0">
        <div className="space-y-4 overflow-hidden flex flex-col flex-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-[#00F2FF] font-bold">
                Agente Nativo
              </span>
              <span className="text-[10px] font-mono text-[#00E676] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                analista-radar
              </span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#7000FF]" />
              Analista Radar IA
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Focado em viabilidade, ROI, conversão e ganchos de vídeo.
            </p>
          </div>

          {/* Product context dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Fixar Contexto de Produto:</span>
              {selectedProductId && (
                <button
                  type="button"
                  onClick={() => setSelectedProductId('')}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0D0F18] border border-[#292E44] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="">-- Nenhum (Visão Geral de Mercado) --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.platform}] {p.title.slice(0, 32)}... (Score: {p.opportunity_score})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Product Card Preview */}
          {selectedProduct && (
            <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#00F2FF]/30 space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={
                    selectedProduct.image_url || 'https://img.usecurling.com/p/100/100?q=product'
                  }
                  alt={selectedProduct.title}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {selectedProduct.title}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{selectedProduct.platform}</span>
                    <span className="text-[#00E676] font-mono">
                      +R${' '}
                      {(
                        selectedProduct.commission_amount ||
                        selectedProduct.price * (selectedProduct.commission_rate / 100)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                <ScoreRing score={selectedProduct.opportunity_score} size="sm" />
              </div>
            </div>
          )}

          {/* Suggested Quick Prompts */}
          <div className="space-y-2 pt-2 border-t border-[#232738] overflow-y-auto flex-1">
            <div className="text-[10px] font-mono uppercase text-gray-400 font-bold">
              Perguntas Rápidas
            </div>
            {[
              'Quais os 3 melhores produtos do radar para testar hoje?',
              'Qual nicho tem a melhor relação de comissão vs concorrência?',
              'Crie 3 ganchos para vídeo curto do produto selecionado',
              'Como contornar a principal objeção de compra deste produto?',
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isStreaming}
                className="w-full text-left p-2.5 rounded-xl bg-[#0D0F18] hover:bg-[#1C2032] border border-[#232738] text-[11px] text-gray-300 leading-snug transition-colors"
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Clear chat button */}
        <div className="pt-3 border-t border-[#232738]">
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-[#2A2F45] text-gray-400 hover:text-red-400 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Conversa
          </Button>
        </div>
      </div>

      {/* Right Area: Chat Stream View */}
      <div className="flex-1 flex flex-col justify-between p-4 md:p-6 rounded-2xl bg-[#141622] border border-[#232738] overflow-hidden">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={m.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#7000FF] flex items-center justify-center flex-shrink-0 text-white shadow-[0_0_12px_rgba(112,0,255,0.4)]">
                    <Bot className="w-4 h-4 text-[#00F2FF]" />
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                    isUser
                      ? 'bg-gradient-to-r from-[#00F2FF] to-[#00D4E6] text-[#0A0B10] font-medium shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                      : 'bg-[#0D0F18] text-gray-200 border border-[#232738] shadow-sm'
                  }`}
                >
                  {/* If user attached a product */}
                  {isUser && m.productData && (
                    <div className="mb-2 p-1.5 rounded-lg bg-black/10 border border-black/10 text-[10px] font-mono">
                      📎 Contexto: {m.productData.title.slice(0, 40)}... (R${' '}
                      {(m.productData.promo_price || m.productData.price).toFixed(2)})
                    </div>
                  )}

                  <div className="whitespace-pre-line font-sans">
                    {m.content || (
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-[#00F2FF] animate-ping" />
                        Analista pensando...
                      </span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#00F2FF]/20 border border-[#00F2FF] flex items-center justify-center flex-shrink-0 text-[#00F2FF]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="pt-4 border-t border-[#232738] flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isStreaming}
            placeholder={
              selectedProduct
                ? `Pergunte sobre "${selectedProduct.title.slice(0, 25)}..."`
                : 'Faça qualquer pergunta estratégica ao Analista IA...'
            }
            className="flex-1 h-12 px-4 rounded-xl bg-[#0D0F18] border border-[#292E44] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF] transition-all"
          />
          <Button
            type="submit"
            disabled={isStreaming || !inputMessage.trim()}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-95 text-[#0A0B10] font-bold text-xs gap-2 shadow-[0_0_20px_rgba(0,242,255,0.25)]"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
