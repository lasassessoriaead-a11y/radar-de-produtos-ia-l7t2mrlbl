import { requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET')return res.status(405).json({success:false,error:'Method not allowed'})
  try{
    const {user,auth,url,key}=await requireSupabaseUser(req)
    const limit=Math.max(1,Math.min(50,Number(req.query?.limit||20)))
    const marketplace=String(req.query?.marketplace||'').trim()
    const filters=[`user_id=eq.${encodeURIComponent(user.id)}`]
    if(marketplace)filters.push(`marketplace=eq.${encodeURIComponent(marketplace)}`)
    const endpoint=`${url}/rest/v1/hunter_scan_history?${filters.join('&')}&order=created_at.desc&limit=${limit}&select=*`
    const r=await fetch(endpoint,{headers:{apikey:key,Authorization:auth,Accept:'application/json'}})
    const raw=await r.text();let rows:any=[];try{rows=raw?JSON.parse(raw):[]}catch{rows=[]}
    if(!r.ok)throw new Error(rows?.message||`Falha ao carregar histórico (${r.status}).`)
    return res.status(200).json({success:true,items:Array.isArray(rows)?rows:[]})
  }catch(e:any){
    const message=String(e?.message||e||'Falha ao carregar histórico do Hunter.')
    const authError=/autentica|sessão|session|token|jwt/i.test(message)
    return res.status(authError?401:500).json({success:false,error:message})
  }
}
