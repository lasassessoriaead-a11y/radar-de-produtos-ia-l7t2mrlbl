import { decryptMlSession, encryptMlSession, type MlSession } from '../../server/mercadolivre.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nqepcuktmbnjecjlemmh.supabase.co'
const BRIDGE = `${SUPABASE_URL}/functions/v1/mercadolivre-cron-bridge`

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function scoreCandidate(trendPosition:number,sold:number,price:number,freeShipping:boolean){let score=56;score+=Math.max(4,18-trendPosition*1.5);if(sold>=1000)score+=14;else if(sold>=500)score+=11;else if(sold>=100)score+=8;else if(sold>=20)score+=4;if(price>=20&&price<=800)score+=4;if(freeShipping)score+=3;return clamp(Math.round(score),0,96)}

async function bridge(token:string,body:Record<string,unknown>){const res=await fetch(BRIDGE,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||`Mercado Livre bridge HTTP ${res.status}`);return data}
async function mlJson(url:string,accessToken:string){const res=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json','User-Agent':'RadarIA/1.0'}});const data=await res.json().catch(()=>({}));if(!res.ok){const err:any=new Error(data?.message||data?.error||`Mercado Livre HTTP ${res.status}`);err.status=res.status;throw err}return data}

async function refreshSession(session:MlSession,clientSecret:string,appId:string){if(session.expires_at&&Date.now()<Number(session.expires_at)-120000)return{session,refreshed:false};if(!session.refresh_token)throw new Error('Sessão Mercado Livre sem refresh token.');const form=new URLSearchParams();form.set('grant_type','refresh_token');form.set('client_id',appId);form.set('client_secret',clientSecret);form.set('refresh_token',session.refresh_token);const res=await fetch('https://api.mercadolibre.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:form.toString()});const data=await res.json().catch(()=>({}));if(!res.ok||!data?.access_token)throw new Error(data?.message||data?.error||'Falha ao renovar Mercado Livre.');return{refreshed:true,session:{access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,expires_at:Date.now()+Number(data.expires_in||21600)*1000,user_id:data.user_id||session.user_id,scope:data.scope||session.scope,token_type:data.token_type||session.token_type}as MlSession}}

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
  const oidc=String(req.headers['x-vercel-oidc-token']||process.env.VERCEL_OIDC_TOKEN||'')
  const clientSecret=process.env.MERCADO_LIVRE_CLIENT_SECRET||''
  const appId=process.env.MERCADO_LIVRE_APP_ID||''
  const runId=crypto.randomUUID()
  let claimed=false
  try{
    if(!oidc)throw new Error('Vercel OIDC token ausente.')
    if(!clientSecret||!appId)throw new Error('Credenciais do Mercado Livre não configuradas.')
    const claim=await bridge(oidc,{mode:'claim',run_id:runId})
    if(!claim?.allowed)return res.status(200).json({success:true,skipped:true,reason:'cooldown'})
    claimed=true
    const source=await bridge(oidc,{mode:'connections',run_id:runId})
    const connections=Array.isArray(source?.connections)?source.connections:[]
    const allCandidates=new Map<string,any>()
    let trendKeywords=0,listingsChecked=0,skippedUpstream=0

    for(const connection of connections){
      if(!connection?.credentials_encrypted||!connection?.user_id)continue
      let session=decryptMlSession(String(connection.credentials_encrypted),clientSecret)
      const refreshed=await refreshSession(session,clientSecret,appId)
      session=refreshed.session
      if(refreshed.refreshed)await bridge(oidc,{mode:'update_connection',run_id:runId,connection_id:connection.id,user_id:connection.user_id,credentials_encrypted:encryptMlSession(session,clientSecret)})

      const trends=await mlJson('https://api.mercadolibre.com/trends/MLB',session.access_token)
      const keywords=(Array.isArray(trends)?trends:[]).map((x:any)=>String(x?.keyword||'').trim()).filter(Boolean).slice(0,12)
      trendKeywords+=keywords.length

      for(let i=0;i<keywords.length;i++){
        const keyword=keywords[i]
        try{
          const u=new URL('https://api.mercadolibre.com/sites/MLB/search')
          u.searchParams.set('q',keyword)
          u.searchParams.set('limit','10')
          const found=await mlJson(u.toString(),session.access_token)
          const listings=Array.isArray(found?.results)?found.results:[]
          listingsChecked+=listings.length
          for(const item of listings.slice(0,5)){
            const externalId=String(item?.id||'')
            const title=String(item?.title||'').trim()
            const productUrl=String(item?.permalink||'').trim()
            const price=Number(item?.price||0)
            if(!externalId||!title||!productUrl||price<=0)continue
            const sold=Number(item?.sold_quantity||0)
            const freeShipping=Boolean(item?.shipping?.free_shipping)
            const proactiveScore=scoreCandidate(i+1,sold,price,freeShipping)
            if(proactiveScore<60)continue
            const row={user_id:connection.user_id,niche_key:String(item?.category_id||'mercadolivre_trends').toLowerCase(),search_query:keyword,external_id:externalId,title,image_url:String(item?.thumbnail||item?.secure_thumbnail||'').replace(/^http:/,'https:'),product_url:productUrl,affiliate_url:null,price,commission_rate:0,commission_amount:0,sales_count:sold,rating:0,base_score:proactiveScore,niche_confidence:0,proactive_score:proactiveScore,reason:{source:'mercadolivre_trends_listing_search',trend_keyword:keyword,trend_position:i+1,free_shipping:freeShipping,conversion_learning_enabled:false,affiliate_link_required_after_selection:true,autonomous_prepare_enabled:false}}
            const key=`${connection.user_id}:${externalId}`
            const prev=allCandidates.get(key)
            if(!prev||Number(prev.proactive_score||0)<proactiveScore)allCandidates.set(key,row)
          }
        }catch{skippedUpstream++}
      }
    }

    const candidates=[...allCandidates.values()].sort((a,b)=>Number(b.proactive_score)-Number(a.proactive_score)).slice(0,Math.max(10,connections.length*20))
    const saved=await bridge(oidc,{mode:'ingest',run_id:runId,candidates})
    claimed=false
    return res.status(200).json({success:true,connections:connections.length,trend_keywords:trendKeywords,listings_checked:listingsChecked,candidates:candidates.length,saved:Number(saved?.saved||0),skipped_upstream:skippedUpstream,source:'mercadolivre_trends_listing_search'})
  }catch(err:any){const message=String(err?.message||err||'Falha desconhecida.');if(claimed){try{await bridge(oidc,{mode:'fail',run_id:runId,error:message,stage:'mercadolivre_trends'})}catch{}}return res.status(500).json({success:false,error:message})}
}
