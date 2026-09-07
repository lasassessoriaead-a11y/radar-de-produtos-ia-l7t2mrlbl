import { requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  try{
    const session=await requireSupabaseUser(req)
    const headers={apikey:session.key,Authorization:session.auth,'Content-Type':'application/json'}
    const uid=encodeURIComponent(session.user.id)
    if(req.method==='GET'){
      const limit=Math.max(1,Math.min(50,Number(req.query?.limit||12)))
      const status=String(req.query?.status||'new')
      const url=`${session.url}/rest/v1/hunter_proactive_opportunities?user_id=eq.${uid}&status=eq.${encodeURIComponent(status)}&order=proactive_score.desc,last_seen_at.desc&limit=${limit}&select=*`
      const r=await fetch(url,{headers})
      const raw=await r.text()
      let rows:any=[]
      try{rows=raw?JSON.parse(raw):[]}catch{rows=[]}
      if(!r.ok)throw new Error(rows?.message||rows?.error||`Falha ao carregar oportunidades proativas (${r.status}).`)
      return res.status(200).json({success:true,items:Array.isArray(rows)?rows:[],count:Array.isArray(rows)?rows.length:0})
    }
    if(req.method==='PATCH'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
      const id=String(body.id||'').trim(),status=String(body.status||'').trim()
      if(!id)return res.status(400).json({success:false,error:'ID obrigatório.'})
      if(!['new','seen','ignored','imported'].includes(status))return res.status(400).json({success:false,error:'Status inválido.'})
      const r=await fetch(`${session.url}/rest/v1/hunter_proactive_opportunities?id=eq.${encodeURIComponent(id)}&user_id=eq.${uid}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({status,updated_at:new Date().toISOString()})})
      const raw=await r.text()
      let rows:any=[]
      try{rows=raw?JSON.parse(raw):[]}catch{rows=[]}
      if(!r.ok)throw new Error(rows?.message||rows?.error||`Falha ao atualizar oportunidade (${r.status}).`)
      return res.status(200).json({success:true,item:Array.isArray(rows)?rows[0]:rows})
    }
    return res.status(405).json({success:false,error:'Method not allowed'})
  }catch(e:any){
    const message=String(e?.message||e||'Falha no Hunter Proativo.')
    const authError=/autentica|sessão|session|token|jwt/i.test(message)
    return res.status(authError?401:500).json({success:false,error:message})
  }
}
