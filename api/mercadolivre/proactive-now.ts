import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function scoreCandidate(trendPosition:number,sold:number,price:number,freeShipping:boolean){let score=56;score+=Math.max(4,18-trendPosition*1.5);if(sold>=1000)score+=14;else if(sold>=500)score+=11;else if(sold>=100)score+=8;else if(sold>=20)score+=4;if(price>=20&&price<=800)score+=4;if(freeShipping)score+=3;return clamp(Math.round(score),0,96)}
async function mlJson(url:string,token:string){const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'RadarIA/1.0'}});const d=await r.json().catch(()=>({}));if(!r.ok){const err:any=new Error(d?.message||d?.error||`Mercado Livre HTTP ${r.status}`);err.status=r.status;err.payload=d;throw err}return d}

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
  try{
    const {user,auth,url,key}=await requireSupabaseUser(req)
    const {session,setCookie}=await getMercadoLivreSession(req)
    if(setCookie)res.setHeader('Set-Cookie',setCookie)

    const trends=await mlJson('https://api.mercadolibre.com/trends/MLB',session.access_token)
    const keywords=(Array.isArray(trends)?trends:[]).map((x:any)=>String(x?.keyword||'').trim()).filter(Boolean).slice(0,8)
    const rows:any[]=[]
    const seen=new Set<string>()
    const diagnostics:any[]=[]
    let listingsChecked=0
    let skippedUpstream=0

    for(let i=0;i<keywords.length;i++){
      const keyword=keywords[i]
      try{
        const u=new URL('https://api.mercadolibre.com/sites/MLB/search')
        u.searchParams.set('q',keyword)
        u.searchParams.set('limit','10')
        const found=await mlJson(u.toString(),session.access_token)
        const listings=Array.isArray(found?.results)?found.results:[]
        listingsChecked+=listings.length
        diagnostics.push({keyword,status:200,results:listings.length})

        for(const item of listings.slice(0,5)){
          const externalId=String(item?.id||'')
          const title=String(item?.title||'').trim()
          const productUrl=String(item?.permalink||'').trim()
          const price=Number(item?.price||0)
          if(!externalId||!title||!productUrl||price<=0||seen.has(externalId))continue
          seen.add(externalId)
          const sold=Number(item?.sold_quantity||0)
          const freeShipping=Boolean(item?.shipping?.free_shipping)
          const proactiveScore=scoreCandidate(i+1,sold,price,freeShipping)
          if(proactiveScore<60)continue
          rows.push({user_id:user.id,platform:'Mercado Livre',niche_key:String(item?.category_id||'mercadolivre_trends').toLowerCase(),search_query:keyword,external_id:externalId,title,image_url:String(item?.thumbnail||item?.secure_thumbnail||'').replace(/^http:/,'https:'),product_url:productUrl,affiliate_url:null,price,commission_rate:0,commission_amount:0,sales_count:sold,rating:0,base_score:proactiveScore,niche_confidence:0,proactive_score:proactiveScore,reason:{source:'mercadolivre_trends_listing_search_manual',trend_keyword:keyword,trend_position:i+1,free_shipping:freeShipping,conversion_learning_enabled:false,affiliate_link_required_after_selection:true,autonomous_prepare_enabled:false},last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        }
      }catch(e:any){
        skippedUpstream++
        diagnostics.push({keyword,status:Number(e?.status||0)||null,error:String(e?.message||e||'Falha desconhecida')})
      }
    }

    rows.sort((a,b)=>Number(b.proactive_score)-Number(a.proactive_score))
    const selected=rows.slice(0,20)
    if(selected.length){const wr=await fetch(`${url}/rest/v1/hunter_proactive_opportunities?on_conflict=user_id,platform,external_id`,{method:'POST',headers:{apikey:key,Authorization:auth,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(selected)});if(!wr.ok){const e=await wr.json().catch(()=>({}));throw new Error(e?.message||'Não foi possível salvar as oportunidades.') }}
    return res.status(200).json({success:true,trend_keywords:keywords.length,listings_checked:listingsChecked,candidates:selected.length,saved:selected.length,skipped_upstream:skippedUpstream,diagnostics,source:'mercadolivre_trends_listing_search_manual'})
  }catch(e:any){return res.status(500).json({success:false,error:String(e?.message||e||'Falha na busca manual do Mercado Livre.'),status:Number(e?.status||0)||null})}
}
