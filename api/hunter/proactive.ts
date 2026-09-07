import { requireSupabaseUser } from '../../server/mercadolivre.js'

function validAffiliateUrl(value:string){
  try{
    const u=new URL(value)
    if(u.protocol!=='https:')return false
    const h=u.hostname.toLowerCase()
    return h==='mercadolivre.com'||h.endsWith('.mercadolivre.com')||h==='mercadolivre.com.br'||h.endsWith('.mercadolivre.com.br')||h==='mercadolibre.com'||h.endsWith('.mercadolibre.com')||h==='meli.la'||h.endsWith('.meli.la')
  }catch{return false}
}

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
      const id=String(body.id||'').trim(),operation=String(body.operation||'status').trim()
      if(!id)return res.status(400).json({success:false,error:'ID obrigatório.'})

      if(operation==='affiliate_confirm'){
        const commissionRate=Number(body.commission_rate)
        const affiliateUrl=String(body.affiliate_url||'').trim()
        if(!Number.isFinite(commissionRate)||commissionRate<=0||commissionRate>100)return res.status(400).json({success:false,error:'Comissão inválida. Informe um percentual maior que 0 e até 100.'})
        if(!validAffiliateUrl(affiliateUrl))return res.status(400).json({success:false,error:'Informe um link oficial válido do Mercado Livre/Afiliados.'})
        const currentRes=await fetch(`${session.url}/rest/v1/hunter_proactive_opportunities?id=eq.${encodeURIComponent(id)}&user_id=eq.${uid}&select=*`,{headers})
        const currentRows=await currentRes.json().catch(()=>[])
        const current=Array.isArray(currentRows)?currentRows[0]:null
        if(!currentRes.ok||!current)return res.status(404).json({success:false,error:'Oportunidade não encontrada.'})
        if(String(current.platform||'').toLowerCase()!=='mercado livre')return res.status(400).json({success:false,error:'Esta confirmação é exclusiva do Mercado Livre.'})
        const price=Number(current.price||0)
        const reason={...(current.reason||{}),affiliate_eligibility:'eligible',affiliate_eligible:true,affiliate_eligibility_source:'manual_portal_confirmation',affiliate_commission_source:'manual_portal_confirmation',affiliate_link_source:'mercadolivre_portal_afiliados',affiliate_confirmed_at:new Date().toISOString()}
        const payload={affiliate_url:affiliateUrl,commission_rate:commissionRate,commission_amount:price>0?Number((price*commissionRate/100).toFixed(2)):0,reason,updated_at:new Date().toISOString()}
        const r=await fetch(`${session.url}/rest/v1/hunter_proactive_opportunities?id=eq.${encodeURIComponent(id)}&user_id=eq.${uid}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)})
        const rows=await r.json().catch(()=>[])
        if(!r.ok)throw new Error(rows?.message||rows?.error||`Falha ao confirmar dados de afiliado (${r.status}).`)
        return res.status(200).json({success:true,item:Array.isArray(rows)?rows[0]:rows})
      }

      const status=String(body.status||'').trim()
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
