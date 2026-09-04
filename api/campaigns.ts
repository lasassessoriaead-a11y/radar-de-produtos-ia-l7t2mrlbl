import { requireSupabaseUser } from '../server/mercadolivre.js'

function clean(data: any) {
  const out = { ...data }
  for (const k of ['id','created','updated','created_at','updated_at','collectionId','collectionName','variations']) delete out[k]
  return out
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const headers: Record<string,string> = { apikey:key, Authorization:auth, 'Content-Type':'application/json' }
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
      const rr=await fetch(`${url}/rest/v1/campaigns?${q}user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`,{headers})
      const rows=await rr.json().catch(()=>[])
      if(!rr.ok)return res.status(rr.status).json({error:rows?.message||'Falha ao carregar campanhas.'})
      return res.status(200).json({success:true,items:Array.isArray(rows)?rows:[]})
    }
    return res.status(405).json({error:'Method not allowed'})
  } catch(err:any){return res.status(401).json({error:err?.message||'Falha na campanha.'})}
}
