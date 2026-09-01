import type { ProductRecord } from '@/types/product'
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  DollarSign,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const band = (s: number) =>
  s >= 80
    ? { label: 'Excelente', cls: 'text-[#00E676]' }
    : s >= 65
      ? { label: 'Bom', cls: 'text-[#00F2FF]' }
      : s >= 45
        ? { label: 'Atenção', cls: 'text-[#FFD600]' }
        : { label: 'Risco alto', cls: 'text-[#FF5C5C]' }

export function ProductAnalysis360({ product }: { product: ProductRecord }) {
  const price = product.promo_price || product.price || 0
  const commission = product.commission_amount || price * ((product.commission_rate || 0) / 100)
  const demand = clamp((product.demand_score || 0) * 10),
    trend = clamp((product.trends_score || 0) * 10)
  const reputation = clamp(((product.rating || 0) / 5) * 100),
    competition = clamp(100 - (product.competition_level || 5) * 10)
  const margin = clamp((commission / Math.max(price, 1)) * 500),
    validation = clamp(Math.log10(Math.max(product.sales_count || 0, 1)) * 24)
  const overall = clamp(
      demand * 0.22 +
        trend * 0.16 +
        reputation * 0.12 +
        competition * 0.14 +
        margin * 0.18 +
        validation * 0.18,
    ),
    verdict = band(overall)
  const metrics: [string, number, string][] = [
    ['Demanda', demand, 'Força atual de procura e intenção de compra.'],
    ['Tendência', trend, 'Velocidade e direção do interesse pelo produto.'],
    ['Concorrência', competition, 'Quanto maior, mais favorável é o espaço competitivo.'],
    ['Margem afiliado', margin, 'Atratividade da comissão em relação ao ticket.'],
    ['Validação', validation, 'Sinal baseado no volume de vendas já observado.'],
    ['Reputação', reputation, 'Confiança derivada da avaliação do anúncio/loja.'],
  ]
  const keywords = Array.from(
    new Set(
      [
        product.category,
        product.niche,
        ...product.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4),
      ]
        .filter(Boolean)
        .map((v) =>
          String(v)
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .trim(),
        ),
    ),
  ).slice(0, 8)
  const strengths = metrics
      .filter(([, s]) => s >= 65)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
    risks = metrics
      .filter(([, s]) => s < 55)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[#7000FF]/15 to-[#00F2FF]/10 border border-[#00F2FF]/25">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#00F2FF] text-xs font-bold uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4" />
                Análise 360° do Produto
              </div>
              <h3 className="text-xl font-extrabold text-white mt-2">
                Score Estratégico {overall}/100
              </h3>
              <p className={'text-sm font-bold mt-1 ' + verdict.cls}>{verdict.label}</p>
            </div>
            <div className="w-20 h-20 rounded-full border-4 border-[#00F2FF]/50 flex items-center justify-center bg-[#0A0B10]">
              <span className="font-mono text-2xl font-black text-white">{overall}</span>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed mt-4">
            Diagnóstico combina demanda, tendência, competição, comissão, validação por vendas e
            reputação. Use como apoio à decisão; dados incompletos reduzem a confiança.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-[#12141F] border border-[#232738]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <DollarSign className="w-4 h-4 text-[#00E676]" />
            Economia do afiliado
          </div>
          <div className="mt-3 text-2xl font-mono font-black text-[#00E676]">
            R$ {commission.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400">comissão estimada por venda</div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="bg-[#0A0B10] rounded-lg p-2">
              <span className="text-gray-500 block">Ticket</span>
              <b>R$ {price.toFixed(2)}</b>
            </div>
            <div className="bg-[#0A0B10] rounded-lg p-2">
              <span className="text-gray-500 block">Taxa</span>
              <b>{product.commission_rate || 0}%</b>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {metrics.map(([name, score, desc]) => {
          const b = band(score)
          return (
            <div key={name} className="p-4 rounded-xl bg-[#12141F] border border-[#232738]">
              <div className="flex justify-between text-xs mb-2">
                <b className="text-gray-200">{name}</b>
                <span className={'font-mono font-bold ' + b.cls}>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-[#090A0F] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7000FF] to-[#00F2FF]"
                  style={{ width: score + '%' }}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2">{desc}</p>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#00E676]/5 border border-[#00E676]/20">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00E676] uppercase">
            <ShieldCheck className="w-4 h-4" />
            Pontos fortes
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-300">
            {strengths.length ? (
              strengths.map(([n, s]) => (
                <div key={n}>
                  • {n}: <b>{s}/100</b>
                </div>
              ))
            ) : (
              <div>• Ainda faltam sinais fortes suficientes.</div>
            )}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#FF5C5C]/5 border border-[#FF5C5C]/20">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF7777] uppercase">
            <AlertTriangle className="w-4 h-4" />
            Riscos / atenção
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-300">
            {risks.length ? (
              risks.map(([n, s]) => (
                <div key={n}>
                  • {n}: <b>{s}/100</b> — validar antes de escalar.
                </div>
              ))
            ) : (
              <div>• Nenhum risco crítico pelos dados atuais.</div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FF] uppercase">
            <Search className="w-4 h-4" />
            Palavras-chave & intenção
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {keywords.map((k) => (
              <span
                key={k}
                className="px-2.5 py-1 rounded-full bg-[#00F2FF]/8 border border-[#00F2FF]/20 text-[11px] text-gray-200"
              >
                {k}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Base inicial do cadastro. A próxima etapa conectará volume, ranking e concorrência real
            por termo.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FFD600] uppercase">
            <Target className="w-4 h-4" />
            Próxima ação recomendada
          </div>
          <p className="text-xs text-gray-300 mt-3 leading-relaxed">
            {overall >= 70
              ? 'Priorizar teste de campanha e criativos. Validar 2–3 ângulos antes de escalar o vencedor.'
              : overall >= 50
                ? 'Testar de forma controlada e comparar oferta, criativo e concorrência antes de escalar.'
                : 'Não escalar agora. Buscar alternativa com melhor demanda, comissão ou espaço competitivo.'}
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <BarChart3 className="w-3.5 h-3.5" />O score evoluirá com snapshots e conversões reais.
          </div>
        </div>
      </div>
    </div>
  )
}
