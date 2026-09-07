import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function scoreCandidate(trendPosition:number,highlightPosition:number,sold:number,price:number,freeShipping:boolean){let score=62;score+=Math.max(2,12-trendPosition);score+=Math.max(2,12-Math.floor(highlightPosition/2));if(sold>=1000)score+=8;else if(sold>=500)score+=6;else if(sold>=100)score+=4;else if(sold>=20)score+=2;if(price>=20&&price<=800)score+=3;if(freeShipping)score+=2;return clamp(Math.round(score),0,96)}
async function mlJson(url:string,token:string){const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'RadarIA/1.0'}});const d=await r.json().catch(()=>({}));if(!r.ok){const err:any=new Error(d?.message||d?.error||`Mercado Livre HTTP ${r.status}`);err.status=r.status;throw err}return d}
async function resolveHighlight(entry:any,token:string){const id=String(entry?.id||''),type=String(entry?.type||'');if(!id)return null;if(type==='ITEM'){const item=await mlJson(`https://api.mercadolibre.com/items/${encodeURIComponent(id)}`,token);return item?.id?item:null}if(type==='PRODUCT'){const product=await mlJson(`https://api.mercadolibre.com/products/${encodeURIComponent(id)}`,token);const itemId=String(product?.buy_box_winner?.item_id||'');if(!itemId)return null;const item=await mlJson(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`,token);return item?.id?item:null}return null}

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
  try{
    const {user,auth,url,key}=await requireSupabaseUser(req)
    const {session,setCookie}=await getMercadoLivreSession(req)
    if(setCookie)res.setHeader('Set-Cookie',setCookie)
    const trends=await mlJson('https://api.mercadolibre.com/trends/MLB',session.access_token)
    const keywords=(Array.isArray(trends)?trends:[]).map((x:any)=>String(x?.keyword||'').trim()).filter(Boolean).slice(0,8)
    const rows:any[]=[],seen=new Set<string>(),diagnostics:any[]=[]
    let categoriesPredicted=0,highlightsChecked=0,itemsResolved=0,skippedUpstream=0

    for(let i=0;i<keywords.length;i++){
      const keyword=keywords[i]
      try{
        const p=new URL('https://api.mercadolibre.com/sites/MLB/domain_discovery/search');p.searchParams.set('q',keyword);p.searchParams.set('limit','3')
        const predicted=await mlJson(p.toString(),session.access_token)
        const cats=(Array.isArray(predicted)?predicted:[]).map((x:any)=>({id:String(x?.category_id||''),domain:String(x?.domain_id||'')})).filter((x:any)=>x.id)
        categoriesPredicted+=cats.length
        let content:any[]=[],categoryId='',domainId='',lastErr:any=null
        for(const cat of cats){try{const h=await mlJson(`https://api.mercadolibre.com/highlights/MLB/category/${encodeURIComponent(cat.id)}`,session.access_token);const c=Array.isArray(h?.content)?h.content:[];if(c.length){content=c;categoryId=cat.id;domainId=cat.domain;break}}catch(e:any){lastErr=e}}
        if(!content.length){skippedUpstream++;diagnostics.push({keyword,status:Number(lastErr?.status||0)||null,error:String(lastErr?.message||'Sem ranking de mais vendidos para as categorias previstas.')});continue}
        highlightsChecked+=content.length
        let resolvedForKeyword=0
        for(const entry of content.slice(0,8)){
          try{
            const item=await resolveHighlight(entry,session.access_token)
            if(!item?.id||!item?.permalink||Number(item?.price||0)<=0||seen.has(String(item.id)))continue
            seen.add(String(item.id));itemsResolved++;resolvedForKeyword++
            const sold=Number(item?.sold_quantity||0),price=Number(item?.price||0),freeShipping=Boolean(item?.shipping?.free_shipping),position=Number(entry?.position||20)
            const proactiveScore=scoreCandidate(i+1,position,sold,price,freeShipping)
            rows.push({user_id:user.id,platform:'Mercado Livre',niche_key:String(domainId||item?.category_id||categoryId||'mercadolivre_highlights').toLowerCase(),search_query:keyword,external_id:String(item.id),title:String(item.title||keyword),image_url:String(item?.pictures?.[0]?.secure_url||item?.thumbnail||'').replace(/^http:/,'https:'),product_url:String(item.permalink),affiliate_url:null,price,commission_rate:0,commission_amount:0,sales_count:sold,rating:0,base_score:proactiveScore,niche_confidence:0,proactive_score:proactiveScore,reason:{source:'mercadolivre_trends_highlights_manual',trend_keyword:keyword,trend_position:i+1,highlight_position:position,highlight_type:String(entry?.type||''),category_id:categoryId,free_shipping:freeShipping,conversion_learning_enabled:false,affiliate_link_required_after_selection:true,autonomous_prepare_enabled:false},last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()})
          }catch{skippedUpstream++}
        }
        diagnostics.push({keyword,status:200,category_id:categoryId,highlights:content.length,resolved:resolvedForKeyword})
      }catch(e:any){skippedUpstream++;diagnostics.push({keyword,status:Number(e?.status||0)||null,error:String(e?.message||e||'Falha desconhecida')})}
    }

    rows.sort((a,b)=>Number(b.proactive_score)-Number(a.proactive_score));const selected=rows.slice(0,20)
    if(selected.length){const wr=await fetch(`${url}/rest/v1/hunter_proactive_opportunities?on_conflict=user_id,platform,external_id`,{method:'POST',headers:{apikey:key,Authorization:auth,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(selected)});if(!wr.ok){const e=await wr.json().catch(()=>({}));throw new Error(e?.message||'Não foi possível salvar as oportunidades.')}}
    return res.status(200).json({success:true,trend_keywords:keywords.length,categories_predicted:categoriesPredicted,highlights_checked:highlightsChecked,items_resolved:itemsResolved,candidates:selected.length,saved:selected.length,skipped_upstream:skippedUpstream,diagnostics,source:'mercadolivre_trends_highlights_manual'})
  }catch(e:any){return res.status(500).json({success:false,error:String(e?.message||e||'Falha na busca manual do Mercado Livre.'),status:Number(e?.status||0)||null})}
}
