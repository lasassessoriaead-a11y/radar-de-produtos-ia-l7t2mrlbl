import React,{useEffect,useMemo,useState}from'react'
import{ExternalLink,ClipboardPaste,Copy,CheckCircle2,Calculator,Info}from'lucide-react'
import{toast}from'sonner'
import pb from '@/lib/pocketbase/client'
import type{DiscoveredProductRecord}from'@/types/product'
import{Button}from'@/components/ui/button'
import{Input}from'@/components/ui/input'
import{Label}from'@/components/ui/label'
import{Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle}from'@/components/ui/dialog'

const AFFILIATE_HELP='https://www.mercadolivre.com.br/l/afiliados-portal-do-afiliado'

type Props={product:DiscoveredProductRecord;open:boolean;onOpenChange:(open:boolean)=>void}

function parseRate(text:string){
 const m=String(text||'').replace(',','.').match(/(?:^|\s)(\d{1,2}(?:\.\d{1,2})?)\s*%?/)
 if(!m)return null
 const n=Number(m[1])
 return Number.isFinite(n)&&n>0&&n<=100?n:null
}

function extractMlUrl(text:string){
 const matches=String(text||'').match(/https:\/\/[^\s]+/g)||[]
 return matches.find(value=>{
  try{const h=new URL(value).hostname.toLowerCase();return h==='meli.la'||h.endsWith('.meli.la')||h==='mercadolivre.com.br'||h.endsWith('.mercadolivre.com.br')||h==='mercadolivre.com'||h.endsWith('.mercadolivre.com')||h==='mercadolibre.com'||h.endsWith('.mercadolibre.com')}catch{return false}
 })||''
}

export function MercadoLivreAffiliateAssistant({product,open,onOpenChange}:Props){
 const raw:any=product.raw_data||{},reason:any=raw.reason||{},proactiveId=String(raw.proactive_id||'')
 const [rate,setRate]=useState(product.commission_rate>0?String(product.commission_rate).replace('.',','):'')
 const [link,setLink]=useState(product.affiliate_url||'')
 const [saving,setSaving]=useState(false)
 const price=Number(product.promo_price&&product.promo_price>0?product.promo_price:product.price||0)
 const rateNumber=Number(String(rate).replace(',','.'))
 const earning=useMemo(()=>price>0&&Number.isFinite(rateNumber)&&rateNumber>0?price*rateNumber/100:0,[price,rateNumber])

 useEffect(()=>{if(open){setRate(product.commission_rate>0?String(product.commission_rate).replace('.',','):'');setLink(product.affiliate_url||'')}},[open,product.commission_rate,product.affiliate_url])

 const openProduct=async()=>{
  if(!product.product_url)return toast.error('Este produto ainda não tem URL comercial confirmada.')
  try{await navigator.clipboard.writeText(product.product_url);toast.success('URL do produto copiada. Na página do produto, use Compartilhar pela Barra de Afiliados ou cole a URL no Gerador de Links do Portal.')}catch{toast.info('Abra o produto e use Compartilhar pela Barra de Afiliados.')}
  window.open(product.product_url,'_blank','noopener,noreferrer')
 }

 const openPortalHelp=()=>window.open(AFFILIATE_HELP,'_blank','noopener,noreferrer')

 const captureClipboard=async()=>{
  try{
   const text=await navigator.clipboard.readText()
   if(!text)return toast.error('A área de transferência está vazia.')
   const foundUrl=extractMlUrl(text),foundRate=parseRate(text)
   if(foundUrl)setLink(foundUrl)
   if(foundRate)setRate(String(foundRate).replace('.',','))
   if(foundUrl&&foundRate)return toast.success('Link e comissão capturados da área de transferência.')
   if(foundUrl)return toast.success('Link de afiliada capturado. Informe também a comissão mostrada no Portal.')
   if(foundRate)return toast.success('Comissão capturada. Copie também o link oficial de afiliada.')
   toast.error('Não encontrei link do Mercado Livre nem porcentagem válida no conteúdo copiado.')
  }catch{toast.error('O navegador não liberou leitura da área de transferência. Cole os dados nos campos abaixo.')}
 }

 const save=async()=>{
  const rateValue=Number(String(rate).replace(',','.'))
  if(!proactiveId)return toast.error('Esta oportunidade ainda não possui ID do Hunter.')
  if(!Number.isFinite(rateValue)||rateValue<=0||rateValue>100)return toast.error('Informe a comissão exata mostrada no Portal do Afiliado.')
  if(!extractMlUrl(link))return toast.error('Cole um link oficial válido do Mercado Livre/Afiliados.')
  setSaving(true)
  try{
   const res=await fetch('/api/hunter/proactive',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${pb.authStore.token}`},body:JSON.stringify({id:proactiveId,operation:'affiliate_confirm',commission_rate:rateValue,affiliate_url:link.trim()})})
   const data=await res.json().catch(()=>({}))
   if(!res.ok||!data?.success)throw new Error(data?.error||'Falha ao salvar dados de afiliado.')
   toast.success(`Afiliado confirmado. Ganho estimado: R$ ${Number(data?.item?.commission_amount||earning).toFixed(2)} por venda.`)
   onOpenChange(false)
   window.setTimeout(()=>window.location.reload(),450)
  }catch(e:any){toast.error(e?.message||'Falha ao salvar dados de afiliado.')}finally{setSaving(false)}
 }

 return <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="bg-[#10121A] border-[#FFD600]/30 text-white sm:max-w-xl">
   <DialogHeader>
    <DialogTitle className="text-[#FFD600]">Assistente de Afiliados • Mercado Livre</DialogTitle>
    <DialogDescription className="text-gray-400">O Radar abre o produto correto e copia a URL. O Mercado Livre não fornece um endereço público estável que leve direto ao seu painel autenticado; no computador, o acesso oficial é pelo menu do seu nome → Afiliados.</DialogDescription>
   </DialogHeader>
   <div className="space-y-4">
    <div className="rounded-xl border border-[#2A2F42] bg-[#0B0D14] p-3 space-y-2">
     <div className="text-xs text-gray-300 font-semibold">1. Abrir o produto certo</div>
     <div className="text-[11px] text-gray-500">O botão copia a URL deste produto e abre o anúncio. Se sua Barra de Afiliados estiver ativa, use Compartilhar para gerar o link. Se não estiver, entre no Portal pelo menu do seu nome e use Gerador de Links.</div>
     <Button type="button" onClick={openProduct} disabled={!product.product_url} className="w-full bg-[#FFE600] text-black hover:bg-[#FFE600]/90"><ExternalLink className="w-4 h-4 mr-2"/>Copiar URL + abrir este produto</Button>
     <Button type="button" variant="outline" onClick={openPortalHelp} className="w-full border-[#00F2FF]/30 text-[#00F2FF]"><Info className="w-4 h-4 mr-2"/>Como acessar o Portal do Afiliado</Button>
    </div>
    <div className="rounded-xl border border-[#2A2F42] bg-[#0B0D14] p-3 space-y-3">
     <div className="flex items-center justify-between gap-2"><div><div className="text-xs text-gray-300 font-semibold">2. Voltar ao Radar</div><div className="text-[11px] text-gray-500">Copie o link gerado no Mercado Livre. O Radar tenta capturar o link e a porcentagem automaticamente.</div></div><Button type="button" variant="outline" onClick={captureClipboard} className="border-[#00F2FF]/35 text-[#00F2FF]"><ClipboardPaste className="w-4 h-4 mr-1"/>Capturar copiado</Button></div>
     <div className="grid sm:grid-cols-[140px_1fr] gap-3">
      <div className="space-y-1"><Label htmlFor="ml-commission" className="text-xs text-gray-300">Comissão exata (%)</Label><Input id="ml-commission" inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)} placeholder="Ex.: 12,5" className="bg-[#111521] border-[#30364B]"/></div>
      <div className="space-y-1"><Label htmlFor="ml-aff-link" className="text-xs text-gray-300">Seu link oficial de afiliada</Label><div className="flex gap-2"><Input id="ml-aff-link" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://meli.la/..." className="bg-[#111521] border-[#30364B]"/><Button type="button" size="icon" variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(link);toast.success('Link copiado.')}catch{}}} disabled={!link}><Copy className="w-4 h-4"/></Button></div></div>
     </div>
    </div>
    <div className="rounded-xl border border-[#00E676]/25 bg-[#07140d] p-3 flex items-center justify-between gap-3"><div><div className="text-[10px] uppercase text-[#00E676] font-black">Ganho estimado por venda</div><div className="text-[11px] text-gray-400">Preço atual: {price>0?`R$ ${price.toFixed(2)}`:'não informado'}</div></div><div className="text-xl font-black text-[#00E676] flex items-center gap-1"><Calculator className="w-4 h-4"/>{earning>0?`R$ ${earning.toFixed(2)}`:'—'}</div></div>
    {reason.affiliate_eligibility&&<div className="text-[10px] text-gray-500">Elegibilidade atual: {String(reason.affiliate_eligibility)}</div>}
   </div>
   <DialogFooter>
    <Button type="button" variant="outline" onClick={()=>onOpenChange(false)} disabled={saving}>Cancelar</Button>
    <Button type="button" onClick={save} disabled={saving||!rate||!link} className="bg-[#00E676] text-black hover:bg-[#00E676]/90"><CheckCircle2 className="w-4 h-4 mr-2"/>{saving?'Salvando...':'Confirmar e calcular ganho'}</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>
}
