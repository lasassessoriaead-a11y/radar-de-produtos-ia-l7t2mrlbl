import { requireSupabaseUser } from '../../server/mercadolivre'

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
 try{
  const s=await requireSupabaseUser(req)
  const headers={apikey:s.key,Authorization:s.auth}
  const [metricsR,nichesR]=await Promise.all([
   fetch(`${s.url}/rest/v1/hunter_intelligence_dashboard?user_id=eq.${encodeURIComponent(s.user.id)}&order=conversion_rate.desc,valid_clicks.desc&limit=50&select=*`,{headers}),
   fetch(`${s.url}/rest/v1/hunter_niche_learning?user_id=eq.${encodeURIComponent(s.user.id)}&order=confidence_score.desc&limit=20&select=*`,{headers})
  ])
  const metrics=await metricsR.json().catch(()=>[]),niches=await nichesR.json().catch(()=>[])
  if(!metricsR.ok)throw new Error(metrics?.message||'Falha ao carregar métricas.')
  if(!nichesR.ok)throw new Error(niches?.message||'Falha ao carregar nichos.')
  const rows=Array.isArray(metrics)?metrics:[]
  const totals=rows.reduce((a:any,x:any)=>({clicks:a.clicks+Number(x.valid_clicks||0),conversions:a.conversions+Number(x.conversions||0),commission:a.commission+Number(x.commission_earned||0)}),{clicks:0,conversions:0,commission:0})
  return res.status(200).json({success:true,totals:{...totals,conversion_rate:totals.clicks?Number((totals.conversions/totals.clicks*100).toFixed(2)):0},metrics:rows,niches:Array.isArray(niches)?niches:[]})
 }catch(e:any){return res.status(401).json({success:false,error:e?.message||'Falha na Inteligência do Hunter.'})}
}
