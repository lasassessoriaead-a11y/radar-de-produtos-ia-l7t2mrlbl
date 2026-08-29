import React, { useState, useEffect } from 'react'
import {
  Bookmark,
  TrendingUp,
  Flame,
  ArrowRight,
  TrendingDown,
  HelpCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  History,
  ShieldCheck,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScoreRing } from '@/components/ScoreRing'
import { watchlistService } from '@/services/hunter'
import type { WatchlistItemRecord, ProductSnapshotRecord, TrendSignal } from '@/types/product'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface WatchlistTabProps {
  onApproveToRadar?: (item: WatchlistItemRecord) => void
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({ onApproveToRadar }) => {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItemSnapshots, setSelectedItemSnapshots] = useState<ProductSnapshotRecord[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  const [activeExternalId, setActiveExternalId] = useState<string | null>(null)

  const loadWatchlist = async () => {
    setLoading(true)
    try {
      const data = await watchlistService.getWatchlist()
      setItems(data)
    } catch (err) {
      console.error('Error loading watchlist:', err)
      toast.error('Erro ao carregar itens da Watchlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
  }, [])

  const handleRemove = async (item: WatchlistItemRecord) => {
    try {
      await watchlistService.toggleWatchlist({
        external_id: item.external_id,
        title: item.title,
      })
      setItems((prev) => prev.filter((w) => w.id !== item.id))
      toast.success('Produto removido da Watchlist')
      if (activeExternalId === item.external_id) {
        setActiveExternalId(null)
        setSelectedItemSnapshots([])
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err)
      toast.error('Erro ao remover produto')
    }
  }

  const handleInspectSnapshots = async (item: WatchlistItemRecord) => {
    if (activeExternalId === item.external_id) {
      setActiveExternalId(null)
      setSelectedItemSnapshots([])
      return
    }

    setActiveExternalId(item.external_id)
    setLoadingSnapshots(true)
    try {
      const snaps = await watchlistService.getSnapshots(item.external_id)
      setSelectedItemSnapshots(snaps)
    } catch (err) {
      console.error('Error loading snapshots:', err)
      toast.error('Erro ao carregar histórico de snapshots')
    } finally {
      setLoadingSnapshots(false)
    }
  }

  const getSignalBadge = (signal: TrendSignal) => {
    switch (signal) {
      case 'trending_hot':
        return {
          icon: Flame,
          label: '🔥 EM ALTA',
          classes: 'bg-[#FF3D00]/15 text-[#FF3D00] border-[#FF3D00]/30 animate-pulse',
        }
      case 'rising':
        return {
          icon: TrendingUp,
          label: '📈 SUBINDO',
          classes: 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30',
        }
      case 'stable':
        return {
          icon: ArrowRight,
          label: '➡️ ESTÁVEL',
          classes: 'bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/30',
        }
      case 'falling':
        return {
          icon: TrendingDown,
          label: '📉 CAINDO',
          classes: 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30',
        }
      case 'insufficient_data':
      default:
        return {
          icon: HelpCircle,
          label: 'Dados insuficientes',
          classes: 'bg-gray-800/40 text-gray-400 border-gray-700',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141622] border border-[#232738]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#00F2FF]" />
            Watchlist de Acompanhamento
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitore a evolução de preço, score de oportunidade, vendas e sinais de tendência em
            tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadWatchlist}
            className="h-8 border-[#2A2F45] bg-[#10121C] text-xs text-gray-300 gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Atualizar Watchlist
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[#141622] animate-pulse border border-[#232738]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141622] border border-[#232738] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1A1D2D] text-gray-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-sm font-bold text-white">Nenhum produto na Watchlist ainda</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Ao buscar no Caçador de Oportunidades, clique no botão <strong>"Monitorar"</strong> para
            salvar produtos aqui e acompanhar o histórico de preços e tendências.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const signalConfig = getSignalBadge(item.trend_signal)
            const SignalIcon = signalConfig.icon
            const isExpanded = activeExternalId === item.external_id

            // Price change calculation
            const priceDiff = item.current_price - item.initial_price
            const scoreDiff = item.current_score - item.initial_score
            const salesDiff = (item.current_sales_count || 0) - (item.initial_sales_count || 0)

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#141622] border border-[#232738] hover:border-[#00F2FF]/40 transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Image & Title */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img
                      src={item.image_url || 'https://img.usecurling.com/p/150/150?q=product'}
                      alt={item.title}
                      className="w-14 h-14 rounded-xl object-cover bg-[#0A0B10] flex-shrink-0 border border-[#232738]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1',
                            signalConfig.classes,
                          )}
                        >
                          <SignalIcon className="w-3 h-3" />
                          {signalConfig.label}
                        </span>

                        <span className="text-[10px] font-mono text-gray-400 bg-[#0E1018] px-2 py-0.5 rounded border border-[#212538]">
                          {item.platform || 'Mercado Livre'}
                        </span>

                        {item.category && (
                          <span className="text-[10px] text-gray-400 bg-[#0E1018] px-2 py-0.5 rounded border border-[#212538]">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>

                      {item.alert_reason && (
                        <div className="text-[11px] text-[#00F2FF] font-mono mt-0.5">
                          {item.alert_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Metrics comparison */}
                  <div className="grid grid-cols-3 gap-3 md:gap-6 bg-[#0E1018] p-2.5 rounded-xl border border-[#1F2336] w-full md:w-auto text-center font-mono">
                    {/* Price */}
                    <div>
                      <div className="text-[10px] text-gray-400">Preço Atual</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        R$ {item.current_price?.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {priceDiff < 0 ? (
                          <span className="text-[#00E676] font-bold">
                            R$ {priceDiff.toFixed(2)}
                          </span>
                        ) : priceDiff > 0 ? (
                          <span className="text-[#FF3D00]">+R$ {priceDiff.toFixed(2)}</span>
                        ) : (
                          'Inalterado'
                        )}
                      </div>
                    </div>

                    {/* Sales */}
                    <div>
                      <div className="text-[10px] text-gray-400">Vendas</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {item.current_sales_count || 0}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {salesDiff > 0 ? (
                          <span className="text-[#00E676] font-bold">+{salesDiff}</span>
                        ) : (
                          '0 variação'
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div>
                      <div className="text-[10px] text-gray-400">Score</div>
                      <div className="text-xs font-bold text-[#00F2FF] mt-0.5">
                        {item.current_score} pts
                      </div>
                      <div className="text-[10px]">
                        {scoreDiff > 0 ? (
                          <span className="text-[#00E676] font-bold">+{scoreDiff} pts</span>
                        ) : scoreDiff < 0 ? (
                          <span className="text-[#FF3D00]">{scoreDiff} pts</span>
                        ) : (
                          <span className="text-gray-500">Estável</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInspectSnapshots(item)}
                      className={cn(
                        'h-8 text-xs font-semibold border-[#2A2F45] gap-1',
                        isExpanded && 'bg-[#1C2034] text-[#00F2FF] border-[#00F2FF]/40',
                      )}
                    >
                      <History className="w-3.5 h-3.5" />
                      {isExpanded ? 'Ocultar Histórico' : 'Histórico (Snapshots)'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/laboratorio?discoveredId=${item.id}`)}
                      className="h-8 px-2.5 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1 shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                      title="Criar Campanha no Laboratório"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Campanha</span>
                    </Button>

                    {item.product_url && (
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg border border-[#2A2F45] bg-[#0E1018] hover:bg-[#1C2034] text-gray-300 hover:text-white"
                        title="Ver produto no marketplace"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Remover da Watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Snapshots Panel */}
                {isExpanded && (
                  <div className="p-3.5 rounded-xl bg-[#0B0D14] border border-[#1E2235] space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-300 font-mono pb-2 border-b border-[#1E2235]">
                      <span className="flex items-center gap-1.5 text-[#00F2FF]">
                        <History className="w-3.5 h-3.5" />
                        Histórico de Snapshots ({selectedItemSnapshots.length})
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Coletado a cada busca / sincronização
                      </span>
                    </div>

                    {loadingSnapshots ? (
                      <div className="py-4 text-center text-xs text-gray-400 font-mono">
                        Carregando snapshots...
                      </div>
                    ) : selectedItemSnapshots.length === 0 ? (
                      <div className="py-3 text-center text-xs text-gray-500 font-mono">
                        Nenhum snapshot anterior registrado para este item.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedItemSnapshots.map((snap, idx) => (
                          <div
                            key={snap.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#121420] border border-[#1A1E2E] text-xs font-mono"
                          >
                            <span className="text-gray-400">
                              {new Date(snap.created || snap.snapshot_date).toLocaleDateString(
                                'pt-BR',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>

                            <div className="flex items-center gap-4 text-gray-300">
                              <span>
                                Preço: <strong>R$ {snap.price?.toFixed(2)}</strong>
                              </span>
                              <span>
                                Vendas: <strong>{snap.sales_count}</strong>
                              </span>
                              <span className="text-[#00F2FF]">
                                Score: <strong>{snap.opportunity_score}</strong>
                              </span>
                              {snap.ranking_position > 0 && (
                                <span className="text-gray-500">
                                  #{snap.ranking_position} na busca
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
