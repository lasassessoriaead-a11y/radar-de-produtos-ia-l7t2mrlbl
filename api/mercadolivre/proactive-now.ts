import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function scoreCandidate(trendPosition:number,sold:number,price:number,freeShipping:boolean){let score=48;score+=Math.max(4,28-trendPosition*1.7);if(sold>=1000)score+=15;else if(sold>=500)score+=12;else if(sold>=100)score+=9;else if(sold>=20)score+=5;if(price>=25&&price<=600)score+=5;if(freeShipping)score+=4;return clamp(Math.round(score),0,96)}
async function mlJson(url:string,token:string){const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'RadarIA/1.0'}});const d=await r.json().catch(()=>({}));if(!r.ok){const err:any=new Error(d?.message||d?.error||`Mercado Livre HTTP ${r.status}`);err.status=r.status;throw err}return d}
function isSkippableMlError(e:any){const m=String(e?.message||e||'').toLowerCase();return Number(e?.status)===404||m.includes('no winners found')||m.includes('not found')}

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
    let skippedNoWinner=0
    let skippedUpstream=0

    for(let i=0;i<keywords.length;i++){
      const keyword=keywords[i]
      let found:any
      try{
        const u=new URL('https://api.mercadolibre.com/products/search')
        u.searchParams.set('status','active');u.searchParams.set('site_id','MLB');u.searchParams.set('q',keyword);u.searchParams.set('limit','5')
        found=await mlJson(u.toString(),session.access_token)
      }catch(e:any){if(isSkippableMlError(e)){skippedNoWinner++;continue}skippedUpstream++;continue}

      for(const product of Array.isArray(found?.results)?found.results:[]){
        const catalogId=String(product?.id||'');if(!catalogId)continue
        let detail:any
        try{detail=await mlJson(`https://api.mercadolibre.com/products/${encodeURIComponent(catalogId)}`,session.access_token)}catch(e:any){if(isSkippableMlError(e)){skippedNoWinner++;continue}skippedUpstream++;continue}
        const winner=detail?.buy_box_winner
        const externalId=String(winner?.item_id||'')
        if(!externalId){skippedNoWinner++;continue}
        if(seen.has(externalId))continue
        seen.add(externalId)

        const price=Number(winner?.price||0)
        if(price<=0)continue
        const sold=Number(winner?.sold_quantity||detail?.sold_quantity||0)
        const freeShipping=Boolean(winner?.shipping?.free_shipping)
        const proactiveScore=scoreCandidate(i+1,sold,price,freeShipping)
        if(proactiveScore<62)continue
        const picture=String(detail?.pictures?.[0]?.secure_url||detail?.pictures?.[0]?.url||product?.pictures?.[0]?.url||'').replace(/^http:/,'https:')
        const permalink=String(detail?.permalink||'')
        rows.push({user_id:user.id,platform:'Mercado Livre',niche_key:String(detail?.domain_id||product?.domain_id||winner?.category_id||'mercadolivre_trends').toLowerCase(),search_query:keyword,external_id:externalId,title:String(detail?.name||product?.name||keyword),image_url:picture,product_url:permalink,affiliate_url:null,price,commission_rate:0,commission_amount:0,sales_count:sold,rating:0,base_score:proactiveScore,niche_confidence:0,proactive_score:proactiveScore,reason:{source:'mercadolivre_trends_buy_box_manual',trend_keyword:keyword,trend_position:i+1,catalog_product_id:catalogId,buy_box_winner:true,free_shipping:freeShipping,conversion_learning_enabled:false,affiliate_link_required_after_selection:true,autonomous_prepare_enabled:false},last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      }
    }

    if(rows.length){const wr=await fetch(`${url}/rest/v1/hunter_proactive_opportunities?on_conflict=user_id,platform,external_id`,{method:'POST',headers:{apikey:key,Authorization:auth,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});if(!wr.ok){const e=await wr.json().catch(()=>({}));throw new Error(e?.message||'Não foi possível salvar as oportunidades.') }}
    return res.status(200).json({success:true,trend_keywords:keywords.length,candidates:rows.length,saved:rows.length,skipped_no_winner:skippedNoWinner,skipped_upstream:skippedUpstream,source:'mercadolivre_trends_buy_box_manual'})
  }catch(e:any){return res.status(500).json({success:false,error:String(e?.message||e||'Falha na busca manual do Mercado Livre.')})}
}
