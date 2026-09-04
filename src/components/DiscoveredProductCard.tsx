import React from 'react'
import {
  ExternalLink,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FlaskConical,
  Info,
  ShieldCheck,
  Calculator,
  Cpu,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ScoreRing } from './ScoreRing'
import { OpportunityBadge } from './OpportunityBadge'
import { Button } from '@/components/ui/button'
import type { DiscoveredProductRecord } from '@/types/product'
import { cn } from '@/lib/utils'
interface DiscoveredProductCardProps {
  product: DiscoveredProductRecord
  onApprove: (product: DiscoveredProductRecord) => void
  onDiscard: (product: DiscoveredProductRecord) => void
  onWhyPicked: (product: DiscoveredProductRecord) => void
  onToggleWatchlist: (product: DiscoveredProductRecord) => void
  isWatchlisted?: boolean
  isApproving?: boolean
  isDiscarding?: boolean
  rank?: number
}

export const DiscoveredProductCard: React.FC<DiscoveredProductCardProps> = ({
  product,
  onApprove,
  onDiscard,
  onWhyPicked,
  onToggleWatchlist,
  isWatchlisted = false,
  isApproving = false,
  isDiscarding = false,
  rank,
}) => {
  const navigate = useNavigate()
  const price = product.promo_price && product.promo_price > 0 ? product.promo_price : product.price
  const hasPromo = product.promo_price && product.promo_price < product.price && product.promo_price > 0
  const isHot = product.opportunity_level === 'hot'
  const isGood = product.opportunity_level === 'good'
  const offersTotal = Number((product.raw_data as any)?.offers_total || 0)
  const relevanceScore = Number((product.raw_data as any)?.relevance_score || 0)
  const freeShipping = Boolean((product.raw_data as any)?.free_shipping)
  const condition = String((product.raw_data as any)?.condition || '')
  const hasRealPrice = Number(price) > 0
  const hasRealSales = Number(product.sales_count || 0) > 0
  const hasRealRating = Number(product.rating || 0) > 0
  const isShopee = product.platform === 'Shopee' || product.source === 'shopee_affiliate_api'
  const sourceShort = isShopee ? 'Shopee' : 'ML'
  const marketplaceName = isShopee ? 'Shopee' : 'Mercado Livre'
  const marketplaceLinkLabel = isShopee ? 'Ver na Shopee' : 'Ver no Mercado Livre'

  const potentialLabel =
    product.opportunity_score >= 80
      ? 'Alto Potencial'
      : product.opportunity_score >= 60
        ? 'Médio-Alto Potencial'
        : product.opportunity_score >= 40
          ? 'Potencial de Teste'
          : 'Baixo Potencial'

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-[#141622] border transition-all duration-300 hover:-translate-y-1 overflow-hidden',
        isHot
          ? 'border-[#FF3D00]/50 shadow-[0_0_20px_rgba(255,61,0,0.15)] hover:border-[#FF3D00]'
          : isGood
            ? 'border-[#00E676]/35 shadow-[0_0_15px_rgba(0,230,118,0.12)] hover:border-[#00E676]'
            : 'border-[#232738] hover:border-[#00F2FF]/60 hover:shadow-[0_0_20px_rgba(0,242,255,0.12)]',
      )}
    >
      <div className="relative w-full aspect-[4/3] bg-[#0A0B10] overflow-hidden">
        <img
          src={product.image_url || 'https://img.usecurling.com/p/400/300?q=product'}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141622] via-transparent to-black/70" />
        {rank !== undefined && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FF3D00] to-[#FF8500] text-[#0A0B10] font-mono font-black text-xs shadow-lg">
            <span>#{rank}</span>
          </div>
        )}
        <div className={cn('absolute top-3 flex items-center gap-1.5 flex-wrap max-w-[75%]', rank !== undefined ? 'left-14' : 'left-3')}>
          <OpportunityBadge level={product.opportunity_level} size="sm" />
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[#FFE600] border border-[#FFE600]/30">
            {product.platform || 'Mercado Livre'}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 bg-[#0A0B10]/85 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
          <ScoreRing score={product.opportunity_score} size="sm" />
        </div>
        <div className="absolute bottom-2.5 left-3">
          <span className="text-[11px] font-medium text-gray-300 bg-[#141622]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#2A2E42]">
            {product.category || 'Geral'}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#00F2FF] transition-colors mb-1.5">{product.title}</h3>
          <div className="text-[11px] text-gray-400 flex items-center justify-between font-mono">
            <span>Vendedor: <strong className="text-gray-300">{product.seller || marketplaceName}</strong></span>
            {product.external_id && <span className="text-[10px] text-gray-500">ID: {product.external_id}</span>}
          </div>
        </div>

        <div className="space-y-1.5 py-2 px-2.5 rounded-xl bg-[#0D0F18] border border-[#202538] text-[10px] font-mono">
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-[#00F2FF]" />Transparência das Métricas
          </div>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Preço:</span>
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border', hasRealPrice ? 'text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30' : 'text-gray-400 bg-gray-800/50 border-gray-700')}>
                <ShieldCheck className="w-2.5 h-2.5" />{hasRealPrice ? `Dado Real (${sourceShort})` : 'Preço não informado'}
              </span>
            </div>
            <div className="flex items-center justify-between"><span className="text-gray-400">Vendas:</span><span className="text-gray-300">{hasRealSales ? `${product.sales_count} informadas pela API` : 'Não informado neste endpoint'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400">Avaliação:</span><span className="text-gray-300">{hasRealRating ? product.rating.toFixed(1) : 'Não informada neste endpoint'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400">Ofertas / Concorrentes:</span><span className="text-[#FFD600]">{offersTotal > 0 ? offersTotal : 'Não informado'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400">Relevância da Busca:</span><span className="text-[#00F2FF]">{relevanceScore > 0 ? `${relevanceScore}/100` : '—'}</span></div>
            {!isShopee && (
              <div className="flex items-center justify-between"><span className="text-gray-400">Frete:</span><span className={freeShipping ? 'text-[#00E676]' : 'text-gray-400'}>{freeShipping ? 'Grátis' : 'Não informado como grátis'}</span></div>
            )}
          </div>
          <div className="flex items-center justify-between"><span className="text-gray-400">Score de Oportunidade:</span><span className="inline-flex items-center gap-1 text-[#00F2FF] bg-[#00F2FF]/10 px-1.5 py-0.5 rounded border border-[#00F2FF]/30"><Calculator className="w-2.5 h-2.5" />Calculado ({product.opportunity_score}/100)</span></div>
          <div className="flex items-center justify-between"><span className="text-gray-400">Potencial de Conversão:</span><span className="inline-flex items-center gap-1 text-[#C084FC] bg-[#7000FF]/15 px-1.5 py-0.5 rounded border border-[#7000FF]/40"><Cpu className="w-2.5 h-2.5" />{potentialLabel}</span></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Comissão de Afiliado:</span>
            {product.commission_rate > 0 ? (
              <span className="inline-flex items-center gap-1 text-[#FFD600] bg-[#FFD600]/10 px-1.5 py-0.5 rounded border border-[#FFD600]/30">
                {isShopee ? `${product.commission_rate.toFixed(2)}% (API Shopee)` : product.commission_is_estimated ? `~${product.commission_rate}% (Estimativa)` : `${product.commission_rate}% (API)`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700">
                <AlertCircle className="w-2.5 h-2.5 text-gray-400" />{isShopee ? 'Não informada para esta oferta' : 'Não fornecida pela API de catálogo'}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-[#232738]">
          <div className="grid grid-cols-2 gap-2 bg-[#10121A] p-2.5 rounded-xl border border-[#1E2130]">
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">Preço</span>
              <div className="font-mono font-bold text-white text-sm">R$ {price.toFixed(2)}</div>
              {hasPromo && <span className="text-[10px] text-gray-500 line-through">R$ {product.price.toFixed(2)}</span>}
            </div>
            <div className="border-l border-[#1E2130] pl-2.5">
              <span className="text-[10px] text-gray-400 font-medium block">Mercado</span>
              <div className="flex flex-col gap-0.5 text-[11px] font-mono mt-0.5">
                {!isShopee && <span className="text-[#FFD600]">{offersTotal > 0 ? `${offersTotal} ofertas` : 'Ofertas não informadas'}</span>}
                <span className="text-gray-400">{hasRealSales ? `${product.sales_count} vendas` : 'Vendas não informadas'}</span>
                {condition && <span className="text-gray-500">{condition === 'new' ? 'Novo' : condition}</span>}
              </div>
            </div>
          </div>

          {product.product_url && (
            <a href={product.product_url} target="_blank" rel="noreferrer" className="w-full h-8 inline-flex items-center justify-center rounded-md border border-[#00F2FF]/35 bg-[#00F2FF]/5 text-[#00F2FF] hover:bg-[#00F2FF]/10 text-xs font-semibold gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />{marketplaceLinkLabel}
            </a>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => onWhyPicked(product)} className="w-full h-8 text-xs font-semibold bg-[#121422] border-[#7000FF]/40 hover:bg-[#7000FF]/20 text-[#C084FC] hover:text-white gap-1.5 shadow-[0_0_12px_rgba(112,0,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />Por que a IA escolheu este produto?
          </Button>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <Button variant="outline" size="sm" disabled={isDiscarding || isApproving} onClick={() => onDiscard(product)} className="h-8 px-2 text-xs font-semibold border-[#2A2F45] hover:border-red-500/50 hover:bg-red-500/10 text-gray-300 hover:text-red-400 gap-1" title="Descartar produto da lista"><XCircle className="w-3.5 h-3.5" /><span className="truncate">Descartar</span></Button>
            <Button variant="outline" size="sm" onClick={() => onToggleWatchlist(product)} className={cn('h-8 px-2 text-xs font-semibold border-[#2A2F45] gap-1 transition-colors', isWatchlisted ? 'border-[#00F2FF]/60 bg-[#00F2FF]/15 text-[#00F2FF]' : 'hover:border-[#00F2FF]/50 hover:bg-[#00F2FF]/10 text-gray-300 hover:text-[#00F2FF]')} title={isWatchlisted ? 'Remover da Watchlist' : 'Acompanhar na Watchlist'}>
              {isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5 text-[#00F2FF]" /> : <Bookmark className="w-3.5 h-3.5" />}<span className="truncate">{isWatchlisted ? 'Salvo' : 'Monitorar'}</span>
            </Button>
            <Button size="sm" onClick={() => navigate(`/laboratorio?discoveredId=${product.id}`)} className="h-8 px-2 text-xs font-bold bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] gap-1 shadow-[0_0_10px_rgba(0,242,255,0.2)]" title="Criar Campanha no Laboratório de Criação"><FlaskConical className="w-3.5 h-3.5" /><span className="truncate">Campanha</span></Button>
            <Button size="sm" disabled={isApproving || isDiscarding} onClick={() => onApprove(product)} className="h-8 px-2 text-xs font-bold bg-gradient-to-r from-[#00E676] to-[#00C853] hover:opacity-90 text-[#0A0B10] gap-1 shadow-[0_0_12px_rgba(0,230,118,0.25)]" title="Aprovar e salvar no Radar de Produtos"><CheckCircle2 className="w-3.5 h-3.5" /><span className="truncate">Aprovar</span></Button>
          </div>
        </div>
      </div>
    </div>
  )
}
