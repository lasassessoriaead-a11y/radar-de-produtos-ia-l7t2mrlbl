import { requireSupabaseUser } from '../../server/mercadolivre'

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
  try{
    const session=await requireSupabaseUser(req)
    const limit=Math.max(1,Math.min(50,Number(req.query?.limit||12)))
    const status=String(req.query?.status||'new')
    const url=`${session.url}/rest/v1/hunter_proactive_opportunities?user_id=eq.${encodeURIComponent(session.user.id)}&status=eq.${encodeURIComponent(status)}&order=proactive_score.desc,last_seen_at.desc&limit=${limit}&select=*`
    const r=await fetch(url,{headers:{apikey:session.key,Authorization:session.auth}})
    const rows=await r.json().catch(()=>[])
    if(!r.ok)throw new Error(rows?.message||'Falha ao carregar oportunidades proativas.')
    return res.status(200).json({success:true,items:Array.isArray(rows)?rows:[],count:Array.isArray(rows)?rows.length:0})
  }catch(e:any){return res.status(401).json({success:false,error:e?.message||'Falha ao carregar Hunter Proativo.'})}
}
