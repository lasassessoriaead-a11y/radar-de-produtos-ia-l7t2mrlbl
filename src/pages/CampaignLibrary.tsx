import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, FlaskConical, Sparkles, Trash2, Edit3, CheckCircle2, AlertTriangle, Calendar, DollarSign, ShoppingCart, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScoreRing } from '@/components/ScoreRing'
import { campaignService } from '@/services/campaigns'
import type { CampaignRecord, CampaignStatus } from '@/types/campaign'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type M = {
  conversions:number
  completed:number
  sales:number
  commission:number
  estimated_commission:number
  validated_commission:number
  validated_conversions:number
  attributed:number
}

type CampaignWithMetrics = CampaignRecord & { shopee_metrics?: M }

const money = (v:number) => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const AUTO_SYNC_MS = 6 * 60 * 60 * 1000
const LAST_SYNC_KEY = 'radar_shopee_last_sync_at'

export default function CampaignLibraryPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number>(() => Number(localStorage.getItem(LAST_SYNC_KEY) || 0))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const navigate = useNavigate()

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const r = await campaignService.getCampaigns(selectedStatus === 'all' ? '' : `status = "${selectedStatus}"`)
      setCampaigns(r.items as CampaignWithMetrics[])
    } catch {
      toast.error('Erro ao carregar campanhas salvas')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus])

  const syncShopee = useCallback(async (manual = false) => {
    if (syncing) return
    setSyncing(true)
    try {
      const token = (await import('@/lib/pocketbase/client')).default.authStore.token
      if (!token) throw new Error('Sessão expirada. Entre novamente no Radar.')
      const r = await fetch('/api/shopee/conversions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:'{}',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || 'Falha na sincronização')
      const now = Date.now()
      localStorage.setItem(LAST_SYNC_KEY, String(now))
      setLastSyncAt(now)
      if (manual) toast.success(`Shopee sincronizada: ${d.saved || 0} conversões processadas.`)
      else if ((d.saved || 0) > 0) toast.success(`Nova sincronização Shopee: ${d.saved} conversões processadas.`)
      await loadCampaigns()
    } catch (e:any) {
      if (manual) toast.error(e?.message || 'Erro ao sincronizar Shopee')
      else console.warn('Sincronização automática Shopee:', e?.message || e)
    } finally {
      setSyncing(false)
    }
  }, [loadCampaigns, syncing])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  useEffect(() => {
    const runIfDue = () => {
      const last = Number(localStorage.getItem(LAST_SYNC_KEY) || 0)
      if (!last || Date.now() - last >= AUTO_SYNC_MS) syncShopee(false)
    }
    const starter = window.setTimeout(runIfDue, 1200)
    const timer = window.setInterval(runIfDue, AUTO_SYNC_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') runIfDue() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(starter)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncShopee])

  const handleDelete = async (id:string, name:string) => {
    if (!confirm(`Deseja excluir a campanha "${name}"?`)) return
    try {
      await campaignService.deleteCampaign(id)
      setCampaigns(p => p.filter(c => c.id !== id))
      toast.success('Campanha excluída com sucesso')
    } catch {
      toast.error('Erro ao excluir campanha')
    }
  }

  const filteredCampaigns = campaigns.filter(c =>
    (c.campaign_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.product_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.selected_angle_title || '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusBadge = (s:CampaignStatus) =>
    s === 'approved' ? { label:'Aprovada', classes:'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30' } :
    s === 'published' ? { label:'Publicada', classes:'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' } :
    s === 'winner' ? { label:'🏆 Vencedora', classes:'bg-[#FFD600]/20 text-[#FFE600] border-[#FFD600]/50' } :
    s === 'needs_revision' ? { label:'Revisar', classes:'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30' } :
    { label:'Rascunho', classes:'bg-[#7000FF]/15 text-[#C084FC] border-[#7000FF]/30' }

  const total = campaigns.reduce((a,c) => ({
    sales:a.sales + (c.shopee_metrics?.sales || 0),
    estimated:a.estimated + (c.shopee_metrics?.estimated_commission || 0),
    validated:a.validated + (c.shopee_metrics?.validated_commission || 0),
    conversions:a.conversions + (c.shopee_metrics?.conversions || 0),
  }), { sales:0, estimated:0, validated:0, conversions:0 })

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })
    : 'aguardando primeira sincronização automática'

  return <div className="space-y-6 pb-16 max-w-7xl mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121420] border border-[#232738]">
      <div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">BIBLIOTECA DE CAMPANHAS</span>
        <h1 className="text-xl font-black text-white flex items-center gap-2 mt-2"><FileText className="w-5 h-5 text-[#00F2FF]"/>Minhas Campanhas ({campaigns.length})</h1>
        <div className="mt-1 text-[10px] text-gray-500 flex items-center gap-1.5">
          <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin text-[#00E676]')} />
          Sincronização automática a cada 6h enquanto o Radar estiver em uso • Última: {lastSyncLabel}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => syncShopee(true)} disabled={syncing} variant="outline" className="border-[#00E676]/40 text-[#00E676]">{syncing ? 'Sincronizando...' : 'Sincronizar agora'}</Button>
        <Link to="/laboratorio"><Button className="bg-[#00F2FF] text-[#0A0B10] font-black"><Plus className="w-4 h-4 mr-1"/>Criar Nova Campanha</Button></Link>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="Conversões Shopee" value={String(total.conversions)}/>
      <Metric label="Vendas atribuídas" value={money(total.sales)}/>
      <Metric label="Comissão estimada" value={money(total.estimated)}/>
      <Metric label="Comissão validada" value={money(total.validated)} green/>
    </div>

    <div className="text-[11px] text-gray-500 -mt-3">A comissão estimada vem do relatório de conversões. A validada representa valores finais já reconciliados pela Shopee.</div>

    <div className="flex gap-3 p-4 rounded-2xl bg-[#141624] border border-[#232738]">
      <div className="relative flex-1"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar campanha..." className="pl-9 bg-[#0A0B10] border-[#252A3D]"/></div>
      {['all','draft','approved'].map(s => <Button key={s} size="sm" variant="outline" onClick={() => setSelectedStatus(s)} className={selectedStatus === s ? 'text-[#00F2FF] border-[#00F2FF]/50' : ''}>{s === 'all' ? 'Todas' : s === 'draft' ? 'Rascunhos' : 'Aprovadas'}</Button>)}
    </div>

    {loading ? <div className="p-12 text-center text-gray-400">Carregando campanhas...</div> : filteredCampaigns.length === 0 ? <div className="p-16 text-center rounded-3xl bg-[#121420] border border-[#232738]"><FlaskConical className="w-10 h-10 mx-auto text-gray-500"/><h3 className="text-white font-bold mt-3">Nenhuma campanha encontrada</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{filteredCampaigns.map(c => { const st = getStatusBadge(c.status), m = c.shopee_metrics; return <div key={c.id} className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className={cn('text-[9px] font-mono font-bold px-2 py-0.5 rounded border',st.classes)}>{st.label}</span><h3 className="text-sm font-bold text-white truncate mt-2">{c.campaign_name}</h3><div className="text-[11px] text-gray-400 truncate">{c.product_title}</div></div><ScoreRing score={c.estimated_score || 85} size="sm"/></div>
      {String(c.platform).toLowerCase() === 'shopee' && <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#0E1018] border border-[#1E2336]"><Mini label="Conversões" value={String(m?.conversions || 0)} icon={<ShoppingCart className="w-3.5 h-3.5 text-[#00F2FF]"/>}/><Mini label="Vendas" value={money(m?.sales || 0)}/><Mini label="Comissão estimada" value={money(m?.estimated_commission || 0)}/><Mini label="Comissão validada" value={money(m?.validated_commission || 0)} green/></div>}
      <div className="flex items-center justify-between text-[10px]"><span className="text-gray-500">Link de Afiliado</span>{c.affiliate_url ? <span className="text-[#00E676] flex gap-1"><CheckCircle2 className="w-3 h-3"/>Configurado</span> : <span className="text-[#FFD600] flex gap-1"><AlertTriangle className="w-3 h-3"/>Pendente</span>}</div>
      <div className="pt-3 border-t border-[#232738] flex justify-between items-center"><span className="text-[10px] text-gray-500 flex gap-1"><Calendar className="w-3 h-3"/>{new Date((c as any).created || (c as any).created_at).toLocaleDateString('pt-BR')}</span><div className="flex gap-1"><Button size="sm" onClick={() => navigate(`/estudio?campaignId=${c.id}&variation=A`)} className="bg-[#00F2FF] text-[#0A0B10]"><Sparkles className="w-3 h-3"/></Button><Button size="sm" variant="outline" onClick={() => navigate(`/laboratorio?campaignId=${c.id}`)}><Edit3 className="w-3 h-3"/></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(c.id,c.campaign_name)} className="text-red-400"><Trash2 className="w-3 h-3"/></Button></div></div>
    </div>})}</div>}
  </div>
}

function Metric({label,value,green=false}:{label:string,value:string,green?:boolean}) {
  return <div className={cn('p-4 rounded-xl bg-[#141624] border',green ? 'border-[#00E676]/30' : 'border-[#232738]')}><div className="text-xs text-gray-500">{label}</div><div className={cn('text-2xl font-black',green ? 'text-[#00E676]' : 'text-white')}>{value}</div></div>
}

function Mini({label,value,green=false,icon}:{label:string,value:string,green?:boolean,icon?:React.ReactNode}) {
  return <div>{icon || <DollarSign className={cn('w-3.5 h-3.5',green ? 'text-[#00E676]' : 'text-white')}/>}<div className="text-[9px] text-gray-500 mt-1">{label}</div><div className={cn('text-xs font-bold',green ? 'text-[#00E676]' : 'text-white')}>{value}</div></div>
}
