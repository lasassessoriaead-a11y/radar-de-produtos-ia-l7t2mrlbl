import { requireSupabaseUser } from '../server/mercadolivre.js'

function clean(data: any) {
  const out = { ...data }
  for (const k of ['id','created','updated','created_at','updated_at','collectionId','collectionName','variations']) delete out[k]
  return out
}
const num = (v:any) => Number(v || 0)

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const headers: Record<string,string> = { apikey:key, Authorization:auth, 'Content-Type':'application/json', Accept:'application/json' }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const id = String(body.id || '').trim()
      const payload = { ...clean(body), user_id:user.id, updated_at:new Date().toISOString() }
      const endpoint = id ? `${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}` : `${url}/rest/v1/campaigns`
      if (!id) payload.created_at = new Date().toISOString()
      const rr = await fetch(endpoint, { method:id?'PATCH':'POST', headers:{...headers,Prefer:'return=representation'}, body:JSON.stringify(payload) })
      const rows = await rr.json().catch(()=>[])
      if(!rr.ok) return res.status(rr.status).json({error:rows?.message||'Falha ao salvar campanha.'})
      const campaign = Array.isArray(rows) ? rows[0] : rows
      return res.status(200).json({success:true,campaign,campaign_id:campaign?.id,message:id?'Campanha atualizada.':'Campanha salva.'})
    }
    if (req.method === 'GET') {
      const id=String(req.query?.id||'').trim()
      const q=id?`id=eq.${encodeURIComponent(id)}&`:''
      const rr=await fetch(`${url}/rest/v1/campaigns?${q}user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`,{headers,cache:'no-store'})
      const rows=await rr.json().catch(()=>[])
      if(!rr.ok)return res.status(rr.status).json({error:rows?.message||'Falha ao carregar campanhas.'})
      const items = Array.isArray(rows) ? rows : []
      if (items.length) {
        const ids = items.map((c:any)=>c.id).filter(Boolean)
        if (ids.length) {
          const cr = await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&campaign_id=in.(${ids.join(',')})&source_type=eq.shopee_affiliate_api&select=campaign_id,sale_amount,commission_amount,status,attribution_confidence`, { headers,cache:'no-store' })
          const conversions = await cr.json().catch(()=>[])
          if (cr.ok && Array.isArray(conversions)) {
            const metrics = new Map<string,any>()
            for (const c of conversions) {
              const m = metrics.get(c.campaign_id) || { conversions:0, completed:0, sales:0, commission:0, attributed:0 }
              m.conversions++
              if (String(c.status).toLowerCase()==='completed') m.completed++
              m.sales += num(c.sale_amount);m.commission += num(c.commission_amount)
              if (String(c.attribution_confidence).toLowerCase()==='high') m.attributed++
              metrics.set(c.campaign_id,m)
            }
            for (const campaign of items) campaign.shopee_metrics = metrics.get(campaign.id) || { conversions:0, completed:0, sales:0, commission:0, attributed:0 }
          }
        }
      }
      return res.status(200).json({success:true,items,count:items.length})
    }
    if (req.method === 'DELETE') {
      const id=String(req.query?.id||'').trim()
      if(!id)return res.status(400).json({error:'ID da campanha é obrigatório.'})
      const rr=await fetch(`${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`,{method:'DELETE',headers:{...headers,Prefer:'return=representation'}})
      const rows=await rr.json().catch(()=>[])
      if(!rr.ok)return res.status(rr.status).json({error:rows?.message||'Falha ao excluir campanha.'})
      return res.status(200).json({success:true,deleted:Array.isArray(rows)?rows.length:0})
    }
    return res.status(405).json({error:'Method not allowed'})
  } catch(err:any){return res.status(401).json({error:err?.message||'Falha na campanha.'})}
}
