import { requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store')
 try{
  const s=await requireSupabaseUser(req)
  const headers={apikey:s.key,Authorization:s.auth,'Content-Type':'application/json'}
  const uid=encodeURIComponent(s.user.id)
  if(req.method==='GET'){
   const r=await fetch(`${s.url}/rest/v1/watchlist_items?user_id=eq.${uid}&order=created_at.desc&limit=200&select=*`,{headers})
   const raw=await r.text();let rows:any=[];try{rows=raw?JSON.parse(raw):[]}catch{rows=[]}
   if(!r.ok)throw new Error(rows?.message||rows?.error||`Falha ao carregar Watchlist (${r.status}).`)
   return res.status(200).json({success:true,items:Array.isArray(rows)?rows:[]})
  }
  if(req.method==='POST'){
   const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
   const externalId=String(b.external_id||'').trim(),title=String(b.title||'').trim()
   if(!externalId||!title)return res.status(400).json({success:false,error:'Produto inválido para monitoramento.'})
   const q=`${s.url}/rest/v1/watchlist_items?user_id=eq.${uid}&external_id=eq.${encodeURIComponent(externalId)}&select=id`
   const qr=await fetch(q,{headers}),existing=await qr.json().catch(()=>[])
   if(!qr.ok)throw new Error(existing?.message||existing?.error||'Falha ao consultar Watchlist.')
   if(Array.isArray(existing)&&existing[0]?.id){
    const dr=await fetch(`${s.url}/rest/v1/watchlist_items?id=eq.${encodeURIComponent(existing[0].id)}&user_id=eq.${uid}`,{method:'DELETE',headers})
    if(!dr.ok){const x=await dr.text();throw new Error(x||`Falha ao remover da Watchlist (${dr.status}).`)}
    return res.status(200).json({success:true,action:'removed'})
   }
   const price=Number(b.price||0),rate=Number(b.commission_rate||0),amount=Number(b.commission_amount||0),sales=Number(b.sales_count||0),rating=Number(b.rating||0),score=Number(b.opportunity_score||0)
   const payload={user_id:s.user.id,external_id:externalId,platform:String(b.platform||''),title,image_url:String(b.image_url||''),product_url:String(b.product_url||''),category:String(b.category||''),initial_price:price,current_price:price,initial_commission_rate:rate,current_commission_rate:rate,initial_commission_amount:amount,current_commission_amount:amount,initial_sales_count:sales,current_sales_count:sales,initial_rating:rating,current_rating:rating,initial_score:score,current_score:score,trend_signal:'insufficient_data'}
   const ir=await fetch(`${s.url}/rest/v1/watchlist_items`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)})
   const rows=await ir.json().catch(()=>[])
   if(!ir.ok)throw new Error(rows?.message||rows?.error||`Falha ao adicionar à Watchlist (${ir.status}).`)
   return res.status(200).json({success:true,action:'added',item:Array.isArray(rows)?rows[0]:rows})
  }
  return res.status(405).json({success:false,error:'Method not allowed'})
 }catch(e:any){
  const message=String(e?.message||e||'Falha na Watchlist.')
  return res.status(/autentica|sessão|session|token|jwt/i.test(message)?401:500).json({success:false,error:message})
 }
}
