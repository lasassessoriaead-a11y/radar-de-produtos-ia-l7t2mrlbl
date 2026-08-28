import React from 'react'
import {
  Zap,
  TrendingUp,
  DollarSign,
  Star,
  Award,
  ShieldAlert,
  Video,
  Target,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductRecord } from '@/types/product'

interface FactorsBreakdownProps {
  product: ProductRecord
  className?: string
}

export const FactorsBreakdown: React.FC<FactorsBreakdownProps> = ({ product, className }) => {
  const price = product.promo_price || product.price
  const commAmount = product.commission_amount || price * (product.commission_rate / 100)

  // 9 Factors dynamic evaluation
  const factors = [
    {
      id: 'commission',
      name: 'Comissão Real (R$)',
      icon: DollarSign,
      score: Math.min(100, Math.round((commAmount / 45) * 100)),
      valueFormatted: `R$ ${commAmount.toFixed(2)} (${product.commission_rate}%)`,
      desc:
        commAmount >= 30
          ? 'Margem excelente para tráfego pago ou orgânico'
          : commAmount >= 10
            ? 'Margem equilibrada para escala'
            : 'Margem reduzida, exige alto volume',
      color:
        commAmount >= 30
          ? 'text-[#00E676]'
          : commAmount >= 10
            ? 'text-[#00F2FF]'
            : 'text-[#FFD600]',
    },
    {
      id: 'price',
      name: 'Preço & Ticket',
      icon: ShoppingBag,
      score: price <= 100 ? 95 : price <= 250 ? 80 : 65,
      valueFormatted: `R$ ${price.toFixed(2)}`,
      desc:
        price < 100
          ? 'Ticket de impulso ideal para compra rápida'
          : 'Preço competitivo na categoria',
      color: 'text-[#00F2FF]',
    },
    {
      id: 'sales',
      name: 'Volume de Vendas',
      icon: Award,
      score: Math.min(100, Math.round((product.sales_count / 5000) * 100)),
      valueFormatted: `${product.sales_count?.toLocaleString('pt-BR')} unid.`,
      desc:
        product.sales_count > 1000
          ? 'Produto validado pelo mercado'
          : 'Em fase de tração de vendas',
      color: product.sales_count > 1000 ? 'text-[#00E676]' : 'text-gray-300',
    },
    {
      id: 'rating',
      name: 'Avaliação & Reputação',
      icon: Star,
      score: Math.round((product.rating / 5) * 100),
      valueFormatted: `${product.rating?.toFixed(1)} / 5.0 (${product.reviews_count} reviews)`,
      desc:
        product.rating >= 4.5
          ? 'Excelente satisfação e poucas devoluções'
          : product.rating >= 4.0
            ? 'Boa reputação do vendedor'
            : 'Atenção: nota abaixo da média pode gerar devoluções',
      color:
        product.rating >= 4.5
          ? 'text-[#00E676]'
          : product.rating >= 4.0
            ? 'text-[#FFD600]'
            : 'text-[#FF3D00]',
    },
    {
      id: 'demand',
      name: 'Procura & Buscas',
      icon: Zap,
      score: (product.demand_score || 5) * 10,
      valueFormatted: `${product.demand_score || 7}/10`,
      desc:
        (product.demand_score || 5) >= 8
          ? 'Nicho em pico de procura ativa'
          : 'Busca estável no mercado',
      color: 'text-[#00F2FF]',
    },
    {
      id: 'trends',
      name: 'Tendência & Crescimento',
      icon: TrendingUp,
      score: (product.trends_score || 5) * 10,
      valueFormatted: `${product.trends_score || 6}/10`,
      desc:
        (product.trends_score || 5) >= 8
          ? 'Curva ascendente no Google & TikTok'
          : 'Interesse contínuo',
      color: 'text-[#7000FF]',
    },
    {
      id: 'competition',
      name: 'Concorrência de Afiliados',
      icon: ShieldAlert,
      // Lower competition is better for opportunity
      score: Math.max(10, 100 - (product.competition_level || 5) * 10),
      valueFormatted: `Nível ${product.competition_level || 5}/10 (${(product.competition_level || 5) > 7 ? 'Saturado' : (product.competition_level || 5) > 4 ? 'Moderado' : 'Baixa Concorrência'})`,
      desc:
        (product.competition_level || 5) <= 5
          ? 'Oportunidade de oceano azul com pouca concorrência'
          : 'Alta disputa por palavras-chave',
      color: (product.competition_level || 5) <= 5 ? 'text-[#00E676]' : 'text-[#FFD600]',
    },
    {
      id: 'content',
      name: 'Potencial de Vídeo / Conteúdo',
      icon: Video,
      score: (product.trends_score || 5) >= 7 ? 90 : 70,
      valueFormatted: (product.trends_score || 5) >= 7 ? 'Alto Apelo Visual' : 'Moderado',
      desc: 'Formato ideal para reels, unboxing, testes e achadinhos',
      color: 'text-[#FF3D00]',
    },
    {
      id: 'conversion',
      name: 'Probabilidade de Conversão',
      icon: Target,
      score: product.opportunity_score,
      valueFormatted: `${product.opportunity_score}/100`,
      desc: 'Probabilidade combinada de gerar lucro real',
      color: 'text-[#00F2FF]',
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Breakdown dos 9 Fatores do Score
          </h4>
          <p className="text-xs text-gray-400">
            Análise multidimensional balanceando margem real, demanda e conversão
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30">
          9 Fatores Ativos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {factors.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.id}
              className="p-3.5 rounded-xl bg-[#12141C] border border-[#232738] hover:border-[#00F2FF]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#1D202F] text-gray-300">
                      <Icon className="w-4 h-4 text-[#00F2FF]" />
                    </div>
                    <span className="text-xs font-semibold text-gray-200">{f.name}</span>
                  </div>
                  <span className={cn('text-xs font-mono font-bold', f.color)}>
                    {f.valueFormatted}
                  </span>
                </div>

                <div className="w-full bg-[#1A1D2B] h-1.5 rounded-full overflow-hidden my-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#7000FF] to-[#00F2FF] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(8, f.score))}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-tight mt-1 line-clamp-2">{f.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
