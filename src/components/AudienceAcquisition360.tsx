import type { ProductRecord } from '@/types/product'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  MapPin,
  Search,
  Video,
  MessageCircle,
  Target,
  Wallet,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
export function AudienceAcquisition360({ product }: { product: ProductRecord }) {
  const nav = useNavigate(),
    price = product.promo_price || product.price || 0
  const commission = product.commission_amount || price * ((product.commission_rate || 0) / 100)
  const demand = clamp((product.demand_score || 0) * 10),
    trend = clamp((product.trends_score || 0) * 10)
  const contentEase = clamp(45 + trend * 0.35 + Math.min((product.reviews_count || 0) / 20, 20))
  const organicReach = clamp(demand * 0.45 + trend * 0.35 + contentEase * 0.2),
    paidViability = clamp(Math.min(100, commission * 2.4) + demand * 0.25)
  const acquisition = clamp(organicReach * 0.55 + paidViability * 0.25 + contentEase * 0.2),
    category = (product.category || product.niche || 'produto').toLowerCase()
  const personas = [
    {
      name: 'Comprador com intenção',
      desc: 'Pessoa pesquisando ' + product.title + ' ou alternativas antes de decidir.',
      intent: 'Alta',
    },
    {
      name: 'Público com a dor',
      desc:
        'Pessoa que ainda não procura o produto, mas enfrenta o problema ligado a ' +
        category +
        '.',
      intent: 'Média',
    },
    {
      name: 'Caçador de oferta',
      desc: 'Consumidor sensível a preço, cupom, frete e prova social.',
      intent: 'Média/Alta',
    },
  ]
  const channels = [
    {
      icon: Search,
      name: 'Google / busca',
      why: 'Capturar quem já pesquisa problema, comparação, review ou preço.',
      score: clamp(demand * 0.7 + 18),
    },
    {
      icon: Video,
      name: 'Reels / TikTok / Shorts',
      why: 'Demonstrar problema → solução sem depender de uma base grande de seguidores.',
      score: organicReach,
    },
    {
      icon: MessageCircle,
      name: 'Comunidades',
      why: 'Mapear dúvidas e objeções reais; participar de forma útil, sem spam.',
      score: clamp(demand * 0.5 + trend * 0.3 + 9),
    },
    {
      icon: MapPin,
      name: 'Pinterest / evergreen',
      why: 'Criar descoberta contínua para produtos visuais e problemas pesquisáveis.',
      score: contentEase,
    },
  ]
  const maxCac = commission > 0 ? commission * 0.55 : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/25">
          <div className="flex justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                <Users className="w-4 h-4" />
                Público & Aquisição 360°
              </div>
              <h3 className="text-xl font-black mt-2">Potencial de Aquisição {acquisition}/100</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-xl">
                Estima quão acessível é encontrar compradores usando os sinais atuais. Não
                representa tamanho real de audiência até conectarmos fontes externas.
              </p>
            </div>
            <div className="text-3xl font-mono font-black text-emerald-400">{acquisition}</div>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-[#12141F] border border-[#232738]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Wallet className="w-4 h-4" />
            Limite financeiro inicial
          </div>
          <div className="text-xl font-mono font-black text-[#FFD600] mt-3">
            R$ {maxCac.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            CAC-teste máximo conservador (55% da comissão). Só liberar mídia paga após validar
            tracking e conversão.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {personas.map((p) => (
          <div key={p.name} className="p-4 rounded-xl bg-[#12141F] border border-[#232738]">
            <div className="flex justify-between gap-2">
              <b className="text-xs text-white">{p.name}</b>
              <Badge variant="outline" className="text-[9px]">
                {p.intent}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-[#12141F] border border-[#232738]">
        <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FF] uppercase">
          <Target className="w-4 h-4" />
          Onde encontrar esse público
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {channels
            .sort((a, b) => b.score - a.score)
            .map((c) => (
              <div key={c.name} className="bg-[#0A0B10] rounded-xl p-3 border border-[#202436]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold">
                    <c.icon className="w-4 h-4 text-[#00F2FF]" />
                    {c.name}
                  </span>
                  <span className="font-mono text-xs text-[#00E676]">{c.score}/100</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">{c.why}</p>
              </div>
            ))}
        </div>
      </div>
      <div className="p-4 rounded-xl bg-[#7000FF]/8 border border-[#7000FF]/25">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase">
          <Sparkles className="w-4 h-4" />
          Plano de validação sem seguidores
        </div>
        <ol className="text-xs text-gray-300 mt-3 space-y-2 list-decimal ml-4">
          <li>Mapear perguntas, desejos e objeções reais no Radar de Público.</li>
          <li>Criar 3 conteúdos: demonstração, comparação e solução de uma dor.</li>
          <li>Publicar organicamente e usar o link rastreável do Radar.</li>
          <li>Comparar cliques por ângulo/canal; só depois considerar mídia paga.</li>
          <li>Escalar apenas quando comissão e conversão suportarem o custo de aquisição.</li>
        </ol>
        <Button
          onClick={() =>
            nav(
              '/publico?productId=' +
                product.id +
                '&category=' +
                encodeURIComponent(product.category || ''),
            )
          }
          className="mt-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#07100d] font-bold text-xs"
        >
          Abrir Radar de Público <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
