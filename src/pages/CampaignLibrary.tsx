import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Plus,
  Search,
  FlaskConical,
  Sparkles,
  ExternalLink,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BarChart3,
  Calendar,
  DollarSign,
  Tag,
  Link2,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/ScoreRing'
import { campaignService } from '@/services/campaigns'
import type { CampaignRecord, CampaignStatus } from '@/types/campaign'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function CampaignLibraryPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const navigate = useNavigate()

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      let filter = ''
      if (selectedStatus !== 'all') {
        filter = `status = "${selectedStatus}"`
      }
      const res = await campaignService.getCampaigns(filter)
      setCampaigns(res.items)
    } catch (err) {
      console.error('Error loading campaigns:', err)
      toast.error('Erro ao carregar campanhas salvas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [selectedStatus])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja excluir a campanha "${name}"?`)) return

    try {
      await campaignService.deleteCampaign(id)
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
      toast.success('Campanha excluída com sucesso')
    } catch (err) {
      toast.error('Erro ao excluir campanha')
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    const matchQuery =
      c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.selected_angle_title &&
        c.selected_angle_title.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchQuery
  })

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'approved':
        return { label: 'Aprovada', classes: 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30' }
      case 'needs_revision':
        return { label: 'Revisar', classes: 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30' }
      case 'in_review':
        return {
          label: 'Em análise',
          classes: 'bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/30',
        }
      case 'published':
        return {
          label: 'Publicada',
          classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        }
      case 'winner':
        return {
          label: '🏆 Vencedora',
          classes: 'bg-[#FFD600]/20 text-[#FFE600] border-[#FFD600]/50',
        }
      case 'archived':
        return { label: 'Arquivada', classes: 'bg-gray-800 text-gray-400 border-gray-700' }
      case 'draft':
      default:
        return { label: 'Rascunho', classes: 'bg-[#7000FF]/15 text-[#C084FC] border-[#7000FF]/30' }
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121420] border border-[#232738] shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
              BIBLIOTECA DE CAMPANHAS
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Fase 3 • Estratégia Pronta para Teste
            </span>
          </div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00F2FF]" />
            Minhas Campanhas ({campaigns.length})
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/laboratorio">
            <Button
              size="sm"
              className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Campanha
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#141624] border border-[#232738]">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por produto, campanha ou ângulo..."
            className="w-full h-9 pl-9 bg-[#0A0B10] border-[#252A3D] text-xs text-white placeholder-gray-500 rounded-xl"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'draft', label: 'Rascunhos' },
            { id: 'approved', label: 'Aprovadas' },
            { id: 'needs_revision', label: 'Revisar' },
            { id: 'archived', label: 'Arquivadas' },
          ].map((st) => (
            <Button
              key={st.id}
              size="sm"
              variant="outline"
              onClick={() => setSelectedStatus(st.id)}
              className={cn(
                'h-8 px-3 text-xs rounded-xl border-[#252A3D]',
                selectedStatus === st.id
                  ? 'bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/50 font-bold'
                  : 'bg-[#0A0B10] text-gray-400 hover:text-white',
              )}
            >
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Campaign Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-[#141624] animate-pulse border border-[#232738]"
            />
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-[#121420] border border-[#232738] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1D2E] text-[#00F2FF] flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">Nenhuma campanha encontrada</h3>
            <p className="text-xs text-gray-400">
              Você pode criar campanhas a partir do <strong>Radar de Produtos</strong>,{' '}
              <strong>Caçador</strong> ou diretamente no <strong>Laboratório de Campanhas</strong>.
            </p>
          </div>
          <Link to="/laboratorio">
            <Button className="h-9 px-4 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs gap-1.5">
              <FlaskConical className="w-4 h-4" /> Ir para o Laboratório
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const statusConfig = getStatusBadge(camp.status)

            return (
              <div
                key={camp.id}
                className="group p-5 rounded-2xl bg-[#141624] border border-[#232738] hover:border-[#00F2FF]/50 hover:shadow-[0_0_25px_rgba(0,242,255,0.1)] transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header with thumbnail & status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={camp.product_image || 'https://img.usecurling.com/p/120/120?q=product'}
                        alt={camp.product_title}
                        className="w-14 h-14 rounded-xl object-cover bg-[#0A0B10] border border-[#232738] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span
                          className={cn(
                            'text-[9px] font-mono font-bold px-2 py-0.5 rounded border inline-block mb-1',
                            statusConfig.classes,
                          )}
                        >
                          {statusConfig.label}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-[#00F2FF] transition-colors">
                          {camp.campaign_name}
                        </h3>
                      </div>
                    </div>

                    <ScoreRing score={camp.estimated_score || 85} size="sm" />
                  </div>

                  {/* Product Title */}
                  <div className="text-[11px] text-gray-400 line-clamp-1 font-sans">
                    <strong className="text-gray-300">Produto: </strong>
                    {camp.product_title}
                  </div>

                  {/* Badges Info */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#0E1018] border border-[#1E2336] text-[10px] font-mono">
                    <div>
                      <span className="text-gray-500 block">Ângulo de Venda:</span>
                      <span className="text-white font-bold truncate block">
                        {camp.selected_angle_title || 'Problema & Solução'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Canal Principal:</span>
                      <span className="text-[#00F2FF] font-bold truncate block">
                        {camp.primary_channel || 'TikTok / Reels'}
                      </span>
                    </div>
                  </div>

                  {/* Affiliate Status Banner */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                    <span className="text-gray-500">Link de Afiliado:</span>
                    {camp.affiliate_url ? (
                      <span className="text-[#00E676] flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Configurado
                      </span>
                    ) : (
                      <span className="text-[#FFD600] flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-[#232738] flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(camp.created).toLocaleDateString('pt-BR')}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/laboratorio?campaignId=${camp.id}`)}
                      className="h-8 text-xs border-[#2A2F45] bg-[#10121C] hover:bg-[#1C2034] text-gray-200 hover:text-[#00F2FF] gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar no Lab
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(camp.id, camp.campaign_name)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Excluir campanha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
