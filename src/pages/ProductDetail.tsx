import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Compass,
  ArrowLeft,
  Flame,
  Star,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Edit,
  Trash2,
  Sparkles,
  Bot,
  Send,
  ShoppingBag,
  Store,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Target,
  Zap,
} from 'lucide-react'
import { getProductById, deleteProduct, askAiAnalyst } from '@/services/products'
import { Product } from '@/types/product'
import { formatCurrency, formatNumber, getOpportunityLevelInfo } from '@/lib/scoreUtils'
import { ScoreGauge } from '@/components/ScoreGauge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // AI Chat Consultant Box
  const [customQuestion, setCustomQuestion] = useState('')
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string }>>([])

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      try {
        setIsLoading(true)
        const p = await getProductById(id)
        setProduct(p)
      } catch (err) {
        console.error('Error loading product:', err)
        toast({
          title: 'Produto não encontrado',
          description: 'Não foi possível encontrar este produto no radar.',
          variant: 'destructive',
        })
        navigate('/radar')
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [id, navigate, toast])

  const handleAskAnalyst = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuestion.trim() || !product) return

    const question = customQuestion.trim()
    setCustomQuestion('')
    setIsAskingAi(true)

    try {
      const res = await askAiAnalyst(question, product.id)
      setAiAnswers((prev) => [...prev, { q: question, a: res.answer }])
    } catch (err) {
      toast({
        title: 'Erro ao consultar IA',
        description: 'Não foi possível obter a resposta do Analista no momento.',
        variant: 'destructive',
      })
    } finally {
      setIsAskingAi(false)
    }
  }

  if (isLoading || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400">Carregando inteligência do produto...</p>
      </div>
    )
  }

  const levelInfo = getOpportunityLevelInfo(product.opportunity_level, product.opportunity_score)

  // Sub-scores calculation for visual breakdown
  const marginScorePercent = Math.min(
    100,
    Math.round(((product.commission_amount || 0) / 40) * 100),
  )
  const demandScorePercent = Math.min(100, Math.round(((product.sales_count || 0) / 3000) * 100))
  const ratingScorePercent = Math.min(
    100,
    Math.round((((product.rating || 3.5) - 3.0) / 2.0) * 100),
  )
  const trendScorePercent = (product.trends_score || 7) * 10

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/radar">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Radar
            </Button>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {product.category || 'Geral'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {product.affiliate_url && (
            <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Link de Afiliado
              </Button>
            </a>
          )}
          <Link to={`/importar?edit=${product.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-8"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Product Overview Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Image & Platform Badges */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-square">
            <img
              src={product.image_url || 'https://img.usecurling.com/p/600/600?q=ecommerce+product'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge className="bg-slate-950/80 backdrop-blur-md text-slate-100 border-slate-800 text-xs font-medium px-2.5 py-1">
                <Store className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                {product.platform || 'E-commerce'}
              </Badge>
              {product.source && (
                <Badge
                  variant="outline"
                  className="bg-slate-950/60 backdrop-blur-md text-slate-300 border-slate-800 text-[10px] uppercase"
                >
                  Fonte: {product.source}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Links do Produto
            </span>
            <div className="space-y-1.5">
              {product.product_url && (
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-indigo-400 hover:text-indigo-300 p-1.5 rounded hover:bg-slate-800/60 transition-colors"
                >
                  <span className="truncate">Página do Anúncio Oficial</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-1" />
                </a>
              )}
              {product.affiliate_url && (
                <a
                  href={product.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-emerald-400 hover:text-emerald-300 p-1.5 rounded hover:bg-slate-800/60 transition-colors"
                >
                  <span className="truncate">Meu Link de Afiliado Rastreável</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-1" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Product Title, Pricing, and Score Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Title & Category */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {product.category || 'Geral'}
              </span>
              {product.niche && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">{product.niche}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
              {product.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
              <span>
                Vendedor:{' '}
                <strong className="text-slate-200">{product.seller || 'Loja Parceira'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <strong className="text-slate-100">
                  {product.rating ? product.rating.toFixed(1) : '-'}
                </strong>
                <span className="text-slate-400">
                  ({formatNumber(product.reviews_count)} avaliações)
                </span>
              </span>
              <span>•</span>
              <span>
                Vendas registradas:{' '}
                <strong className="text-slate-200">
                  {formatNumber(product.sales_count)} unid.
                </strong>
              </span>
            </div>
          </div>

          {/* Pricing & Net Commission Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg shadow-slate-950/40">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Preço de Venda
              </span>
              <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
                {formatCurrency(product.promo_price || product.price)}
              </div>
              {product.promo_price && product.promo_price < (product.price || 0) && (
                <span className="text-[10px] text-slate-400 line-through">
                  De: {formatCurrency(product.price)}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Taxa de Comissão
              </span>
              <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                {product.commission_rate ? `${product.commission_rate}%` : '-'}
              </div>
              <span className="text-[10px] text-slate-400">Percentual da plataforma</span>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-2.5">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">
                Comissão Líquida (R$)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {formatCurrency(product.commission_amount)}
              </div>
              <span className="text-[10px] text-emerald-300/80">Estimada por conversão</span>
            </div>
          </div>

          {/* OPPORTUNITY SCORE CARD (Full breakdown) */}
          <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" /> Score de Oportunidade do Afiliado
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Algoritmo ponderado de viabilidade de lucro, demanda e taxa de conversão
                </CardDescription>
              </div>
              <Badge className={`text-xs py-1 px-3 ${levelInfo.badgeBg}`}>
                {levelInfo.icon} {levelInfo.label}
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreGauge
                  score={product.opportunity_score}
                  level={product.opportunity_level}
                  size="lg"
                  showLevel={false}
                  showLabel={false}
                />

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Margem / Retorno em R$</span>
                    <span className="font-mono text-slate-400">{marginScorePercent}%</span>
                  </div>
                  <Progress value={marginScorePercent} className="h-1.5 bg-slate-800" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Validação de Vendas & Volume</span>
                    <span className="font-mono text-slate-400">{demandScorePercent}%</span>
                  </div>
                  <Progress value={demandScorePercent} className="h-1.5 bg-slate-800" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Avaliação & Confiança da Loja
                    </span>
                    <span className="font-mono text-slate-400">{ratingScorePercent}%</span>
                  </div>
                  <Progress value={ratingScorePercent} className="h-1.5 bg-slate-800" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Tendência & Procura</span>
                    <span className="font-mono text-slate-400">{trendScorePercent}%</span>
                  </div>
                  <Progress value={trendScorePercent} className="h-1.5 bg-slate-800" />
                </div>
              </div>

              {/* Score Explanation Box */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" /> Diagnóstico do Algoritmo:
                </p>
                <p className="text-slate-400 text-xs">
                  {levelInfo.description}. O cálculo não foca apenas na porcentagem nominal, mas sim
                  na lucratividade líquida e no índice de devolução/insatisfação.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI IN-DEPTH ANALYSIS CARD (As specified: 5 questions covered) */}
      <Card className="bg-slate-900/90 border-indigo-500/30 shadow-2xl shadow-indigo-950/30 overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  Análise Completa da IA (Analista do Radar)
                </CardTitle>
                <CardDescription className="text-xs text-indigo-200/70">
                  Gerada pelo agente nativo de consultoria de afiliados para tomada de decisão
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-xs bg-indigo-500/10 text-indigo-300 border-indigo-400/30"
            >
              Agente Nativo Ativo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Main Analysis Text */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 space-y-4 whitespace-pre-line leading-relaxed font-sans">
            {product.ai_analysis ||
              product.ai_summary ||
              'Análise da IA sendo processada para este produto.'}
          </div>

          {/* Interactive AI Consultant Q&A Box */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-indigo-400" /> Pergunte ao Analista IA sobre este
                produto
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tire dúvidas sobre roteiros para TikTok/Reels, público de nicho ou estratégias de
                tráfego pago.
              </p>
            </div>

            {/* Q&A History */}
            {aiAnswers.map((item, idx) => (
              <div key={idx} className="space-y-2 text-xs">
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-3 text-indigo-200">
                  <strong>Você:</strong> {item.q}
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-slate-200 whitespace-pre-line">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
                    <Sparkles className="h-3.5 w-3.5" /> Analista IA:
                  </div>
                  {item.a}
                </div>
              </div>
            ))}

            {/* Question Input Form */}
            <form onSubmit={handleAskAnalyst} className="flex gap-2">
              <Input
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ex: Como criar um anúncio para o público gamer deste produto?"
                className="bg-slate-950/80 border-slate-800 text-xs h-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-indigo-500 rounded-lg"
              />
              <Button
                type="submit"
                disabled={isAskingAi || !customQuestion.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 shrink-0"
              >
                {isAskingAi ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Consultando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Perguntar
                  </span>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
