import React from 'react'
import {
  ExternalLink,
  Sparkles,
  TrendingUp,
  DollarSign,
  Star,
  ShoppingCart,
  Tag,
  Eye,
} from 'lucide-react'
import { ScoreRing } from './ScoreRing'
import { OpportunityBadge } from './OpportunityBadge'
import { Button } from '@/components/ui/button'
import type { ProductRecord } from '@/types/product'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: ProductRecord
  onOpenDetails: (product: ProductRecord) => void
  onAskAi?: (product: ProductRecord) => void
  viewMode?: 'grid' | 'list'
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetails,
  onAskAi,
  viewMode = 'grid',
}) => {
  const price = product.promo_price || product.price
  const hasPromo = product.promo_price && product.promo_price < product.price
  const commAmount = product.commission_amount || price * (product.commission_rate / 100)

  const isHot = product.opportunity_level === 'hot'
  const isGood = product.opportunity_level === 'good'

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group relative flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#161821] border transition-all hover:bg-[#1A1D2B]',
          isHot
            ? 'border-[#FF3D00]/40 shadow-[0_0_15px_rgba(255,61,0,0.15)]'
            : isGood
              ? 'border-[#00E676]/30'
              : 'border-[#232738] hover:border-[#00F2FF]/40',
        )}
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#0A0B10] flex-shrink-0 border border-[#232738]">
            <img
              src={product.image_url || 'https://img.usecurling.com/p/200/200?q=product'}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <span className="absolute bottom-0 left-0 right-0 text-[9px] font-mono text-center bg-black/80 py-0.5 text-gray-300">
              {product.platform || 'Geral'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <OpportunityBadge level={product.opportunity_level} size="sm" />
              <span className="text-[11px] text-gray-400 font-mono bg-[#11131A] px-2 py-0.5 rounded border border-[#232738]">
                {product.category || 'Geral'}
              </span>
            </div>
            <h3
              onClick={() => onOpenDetails(product)}
              className="text-sm font-bold text-white line-clamp-1 cursor-pointer hover:text-[#00F2FF] transition-colors"
            >
              {product.title}
            </h3>
            {product.ai_summary && (
              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.ai_summary}</p>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#232738]">
          <div className="text-left md:text-right">
            <div className="text-xs text-gray-400">Preço</div>
            <div className="font-mono font-bold text-white text-sm">
              R$ {price.toFixed(2)}
              {hasPromo && (
                <span className="text-[10px] text-gray-500 line-through ml-1.5 font-normal">
                  R$ {product.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-[#00E676] font-semibold flex items-center gap-1 md:justify-end">
              <DollarSign className="w-3 h-3" />
              Comissão ({product.commission_rate}%)
            </div>
            <div className="font-mono font-bold text-[#00E676] text-sm">
              +R$ {commAmount.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ScoreRing score={product.opportunity_score} size="sm" />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDetails(product)}
              className="h-8 border-[#2E3349] hover:border-[#00F2FF] hover:bg-[#00F2FF]/10 text-xs gap-1"
            >
              <Eye className="w-3.5 h-3.5 text-[#00F2FF]" />
              Ver Raio-X
            </Button>
            {onAskAi && (
              <Button
                size="sm"
                onClick={() => onAskAi(product)}
                className="h-8 bg-[#7000FF] hover:bg-[#8519FF] text-white text-xs gap-1 shadow-[0_0_12px_rgba(112,0,255,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />
                IA
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid Card View
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-[#161821] border transition-all duration-300 hover:-translate-y-1 overflow-hidden',
        isHot
          ? 'border-[#FF3D00]/50 shadow-[0_0_20px_rgba(255,61,0,0.2)] hover:border-[#FF3D00]'
          : isGood
            ? 'border-[#00E676]/30 shadow-[0_0_15px_rgba(0,230,118,0.15)] hover:border-[#00E676]'
            : 'border-[#232738] hover:border-[#00F2FF]/60 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)]',
      )}
    >
      {/* Top Banner with Platform & Level */}
      <div className="relative w-full aspect-[4/3] bg-[#0A0B10] overflow-hidden">
        <img
          src={product.image_url || 'https://img.usecurling.com/p/400/300?q=tech+product'}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161821] via-transparent to-black/60" />

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[85%]">
          <OpportunityBadge level={product.opportunity_level} size="sm" />
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-gray-200 border border-white/10">
            {product.platform || 'Shopee'}
          </span>
        </div>

        {/* Score Ring floating in image top-right */}
        <div className="absolute top-2.5 right-2.5 bg-[#0A0B10]/80 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
          <ScoreRing score={product.opportunity_score} size="sm" />
        </div>

        {/* Category Pill bottom-left */}
        <div className="absolute bottom-2.5 left-3">
          <span className="text-[11px] font-medium text-gray-300 bg-[#161821]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#2A2E42]">
            {product.category || 'Geral'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onOpenDetails(product)}
            className="text-sm font-bold text-white leading-snug line-clamp-2 cursor-pointer group-hover:text-[#00F2FF] transition-colors mb-2"
          >
            {product.title}
          </h3>

          {/* AI Quick Hook */}
          {product.ai_summary && (
            <div className="mb-3 p-2 rounded-lg bg-[#11131C] border border-[#232738] text-[11px] text-gray-300 leading-relaxed line-clamp-2">
              <span className="text-[#00F2FF] font-semibold">IA: </span>
              {product.ai_summary}
            </div>
          )}
        </div>

        {/* Pricing & Commission Grid */}
        <div className="space-y-3 pt-2 border-t border-[#232738]">
          <div className="grid grid-cols-2 gap-2 bg-[#10121A] p-2.5 rounded-xl border border-[#1E2130]">
            <div>
              <span className="text-[10px] text-gray-400 block font-medium">Preço Atual</span>
              <div className="font-mono font-bold text-white text-sm">R$ {price.toFixed(2)}</div>
              {hasPromo && (
                <span className="text-[10px] text-gray-500 line-through">
                  R$ {product.price.toFixed(2)}
                </span>
              )}
            </div>

            <div className="border-l border-[#1E2130] pl-2.5">
              <span className="text-[10px] text-[#00E676] font-medium flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                Comissão {product.commission_rate}%
              </span>
              <div className="font-mono font-extrabold text-[#00E676] text-sm">
                +R$ {commAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono px-1">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#FFD600] fill-[#FFD600]" />
              <span className="text-white font-bold">
                {product.rating ? product.rating.toFixed(1) : '4.5'}
              </span>
              <span className="text-gray-500">({product.reviews_count || 0})</span>
            </div>

            <div className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3 text-gray-400" />
              <span>{product.sales_count?.toLocaleString('pt-BR') || 0} vendas</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetails(product)}
              className="w-full h-8 text-xs font-semibold bg-[#12141F] border-[#2A2E42] hover:border-[#00F2FF] hover:bg-[#00F2FF]/10 text-gray-200 hover:text-[#00F2FF]"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Ver Raio-X
            </Button>

            {product.affiliate_url ? (
              <a
                href={product.affiliate_url}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] text-[#0A0B10] hover:opacity-90 transition-opacity font-mono"
              >
                Divulgar
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            ) : (
              <Button
                size="sm"
                onClick={() => onOpenDetails(product)}
                className="w-full h-8 text-xs font-semibold bg-[#7000FF] hover:bg-[#8519FF] text-white font-mono"
              >
                Analisar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
