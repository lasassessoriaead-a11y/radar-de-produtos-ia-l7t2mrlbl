import pb from '@/lib/pocketbase/client'
import type { CampaignRecord, CampaignVariation, GenerateFullCampaignResponse, ComplianceReviewReport, CampaignHookItem } from '@/types/campaign'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`
const bearer = () => ({ Authorization: `Bearer ${pb.authStore.token}` })
const sleep = (ms:number) => new Promise((resolve)=>setTimeout(resolve,ms))
const normalizeCampaign = (c:any) => ({...c,created:c?.created||c?.created_at||'',updated:c?.updated||c?.updated_at||''}) as CampaignRecord

export const campaignService = {
  async generateFullCampaign(productData: any): Promise<GenerateFullCampaignResponse> {
    const genericTitle=!productData.title?.trim()||/^produto\s+(shopee|mercado livre|amazon)?$/i.test(productData.title.trim())
    if(genericTitle||!productData.image_url?.trim()||!((productData.price||0)>0||(productData.promo_price||0)>0)||!(productData.affiliate_url||productData.product_url)) throw new Error('Produto não validado: confirme título, foto, preço e link antes de gerar campanha.')
    const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-generate`,{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(productData)})
    const payload=await res.json();if(!res.ok)throw new Error(payload?.error||'Erro ao gerar campanha completa');return payload
  },
  async reviewCompliance(data:any):Promise<ComplianceReviewReport>{const res=await fetch(`${BASE_URL}/backend/v1/campaigns/review-compliance`,{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(data)});const p=await res.json();if(!res.ok)throw new Error(p?.error||'Erro ao auditar conformidade da campanha');return p},
  async generateFormatCopy(data:any):Promise<any>{const res=await fetch(`${BASE_URL}/backend/v1/campaigns/generate-format`,{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(data)});const p=await res.json();if(!res.ok)throw new Error(p?.error||'Erro ao gerar copy do formato');return p},
  async generateHooksBank(data:any):Promise<CampaignHookItem[]>{const res=await fetch(`${BASE_URL}/backend/v1/campaigns/generate-hooks`,{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(data)});const p=await res.json();if(!res.ok)throw new Error(p?.error||'Erro ao gerar banco de ganchos');return p.hooks||[]},

  async generateShopeeTrackingLink(data:{product_id:string;campaign_id:string;channel?:string;variation_id?:string;creative_id?:string}){
    const res=await fetch('/api/shopee/tracking-link',{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(data)})
    const p=await res.json().catch(()=>({}));if(!res.ok||!p?.success)throw new Error(p?.error||'Erro ao gerar link Shopee rastreável');return p as {success:boolean;short_link:string;sub_ids:string[];tracking_link:any}
  },

  async saveCampaign(campaignData:Partial<CampaignRecord>&{variations?:CampaignVariation[]}):Promise<{success:boolean;campaign_id:string;message:string;tracking_link?:string;sub_ids?:string[]}> {
    const variations=campaignData.variations||[]
    const payload:any={...campaignData};delete payload.variations;delete payload.created;delete payload.updated;delete payload.collectionId;delete payload.collectionName
    const res=await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify(payload)})
    const saved=await res.json().catch(()=>({}));if(!res.ok||!saved?.success)throw new Error(saved?.error||'Erro ao salvar campanha')
    const campaignId=String(saved.campaign_id)
    let tracked:any=null
    const isShopee=String(campaignData.platform||'').toLowerCase()==='shopee'
    if(isShopee&&campaignData.product_id){
      tracked=await this.generateShopeeTrackingLink({product_id:String(campaignData.product_id),campaign_id:campaignId,channel:String((campaignData as any).primary_channel||'radar'),variation_id:variations[0]?.version_letter||'A'})
      const trackedUrl=tracked.short_link
      await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json',...bearer()},body:JSON.stringify({id:campaignId,affiliate_url:trackedUrl,affiliate_is_configured:true,metadata:{shopee_tracking_link:trackedUrl,shopee_sub_ids:tracked.sub_ids}})})
    }
    return{success:true,campaign_id:campaignId,message:tracked?'Campanha salva com link Shopee rastreável.':'Campanha salva com sucesso.',tracking_link:tracked?.short_link,sub_ids:tracked?.sub_ids}
  },

  async getCampaigns(filter?:string,sort='-created',page=1,perPage=50){
    let lastError='Erro ao carregar campanhas'
    for(let attempt=0;attempt<3;attempt++){
      if(!pb.authStore.token){await sleep(350);continue}
      try{
        const res=await fetch(`/api/campaigns?_=${Date.now()}`,{headers:bearer(),cache:'no-store'})
        const p=await res.json().catch(()=>({}))
        if(!res.ok){lastError=p?.error||`Erro HTTP ${res.status}`;if(res.status===401){await sleep(500);continue}throw new Error(lastError)}
        let items=(Array.isArray(p?.items)?p.items:[]).map(normalizeCampaign)
        if(filter){const m=filter.match(/status\s*=\s*["']([^"']+)["']/i);if(m)items=items.filter((c:any)=>c.status===m[1])}
        return{items,totalItems:items.length,totalPages:Math.max(1,Math.ceil(items.length/perPage))}
      }catch(e:any){lastError=e?.message||lastError;if(attempt<2)await sleep(400)}
    }
    throw new Error(lastError)
  },
  async getCampaignById(id:string):Promise<CampaignRecord|null>{const res=await fetch(`/api/campaigns?id=${encodeURIComponent(id)}&_=${Date.now()}`,{headers:bearer(),cache:'no-store'});const p=await res.json().catch(()=>({}));if(!res.ok)throw new Error(p?.error||'Erro ao carregar campanha');return p.items?.[0]?normalizeCampaign(p.items[0]):null},
  async deleteCampaign(id:string):Promise<boolean>{const res=await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`,{method:'DELETE',headers:bearer()});const p=await res.json().catch(()=>({}));if(!res.ok)throw new Error(p?.error||'Erro ao excluir campanha');return true},
  async getProductCampaignStats(productId?:string,discoveredId?:string):Promise<{count:number;best_score:number}>{if(!productId&&!discoveredId)return{count:0,best_score:0};try{const params=new URLSearchParams();if(productId)params.set('product_id',productId);if(discoveredId)params.set('discovered_id',discoveredId);const res=await fetch(`${BASE_URL}/backend/v1/campaigns/stats-by-product?${params}`,{headers:bearer()});if(!res.ok)return{count:0,best_score:0};return await res.json()}catch{return{count:0,best_score:0}}},
}
