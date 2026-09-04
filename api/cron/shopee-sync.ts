import crypto from 'node:crypto'

const SHOPEE_ENDPOINT='https://open-api.affiliate.shopee.com.br/graphql'
const num=(v:any)=>Number(v||0)
const iso=(u:any)=>u?new Date(Number(u)*1000).toISOString():new Date().toISOString()
const statusMap=(s:any)=>({UNPAID:'pending',PENDING:'pending',COMPLETED:'completed',CANCELLED:'cancelled'} as Record<string,string>)[String(s||'').toUpperCase()]||String(s||'pending').toLowerCase()

async function shopeeGraphql(query:string){
  const appId=String(process.env.SHOPEE_AFFILIATE_APP_ID||'').trim()
  const secret=String(process.env.SHOPEE_AFFILIATE_SECRET||'').trim()
  if(!appId||!secret) throw new Error('Credenciais Shopee ausentes.')
  const payload=JSON.stringify({query})
  const timestamp=Math.floor(Date.now()/1000).toString()
  const signature=crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`,'utf8').digest('hex')
  const rr=await fetch(SHOPEE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:`SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`},body:payload})
  const data=await rr.json().catch(()=>({}))
  if(!rr.ok) throw new Error(data?.message||`Shopee HTTP ${rr.status}`)
  if(data?.errors?.length) throw new Error(data.errors[0]?.extensions?.message||data.errors[0]?.message||'Erro Shopee')
  return data?.data||{}
}

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'})
  try{
    const cronSecret=String(process.env.CRON_SECRET||'')
    if(!cronSecret||String(req.headers?.authorization||'')!==`Bearer ${cronSecret}`) return res.status(401).json({error:'Unauthorized'})
    const url=String(process.env.SUPABASE_URL||'https://nqepcuktmbnjecjlemmh.supabase.co').replace(/\/$/,'')
    const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim()
    if(!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')
    const headers={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'}
    const lr=await fetch(`${url}/rest/v1/tracking_links?utm_source=eq.shopee&is_active=eq.true&select=*`,{headers})
    const links=await lr.json().catch(()=>[])
    if(!lr.ok) throw new Error('Falha ao carregar links Shopee.')
    const byUser=new Map<string,any[]>()
    for(const link of Array.isArray(links)?links:[]) if(link?.user_id){const arr=byUser.get(link.user_id)||[];arr.push(link);byUser.set(link.user_id,arr)}
    const end=Math.floor(Date.now()/1000),start=end-30*86400
    let users=0,received=0,saved=0,attributed=0
    for(const [userId,userLinks] of byUser){
      users++
      const bySubs=new Map<string,any>()
      for(const l of userLinks){const a=Array.isArray(l.shopee_sub_ids)?l.shopee_sub_ids.map(String):[];if(a.length)bySubs.set(a.join('|'),l)}
      let scrollId='',pages=0
      do{
        const scrollArg=scrollId?`, scrollId: ${JSON.stringify(scrollId)}`:''
        const data=await shopeeGraphql(`{ conversionReport(purchaseTimeStart: ${start}, purchaseTimeEnd: ${end}, limit: 50${scrollArg}) { nodes { purchaseTime clickTime conversionId totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission attributionType } } } pageInfo { hasNextPage scrollId } } }`)
        const report=data?.conversionReport,nodes=Array.isArray(report?.nodes)?report.nodes:[]
        received+=nodes.length
        for(const conv of nodes){
          const rawSubs=Array.isArray(conv?.utmContent)?conv.utmContent.map(String):String(conv?.utmContent||'').split(/[,|]/).map((x:string)=>x.trim()).filter(Boolean)
          const link=bySubs.get(rawSubs.join('|'))||null
          if(link) attributed++
          for(const order of Array.isArray(conv?.orders)?conv.orders:[]){
            const items=Array.isArray(order?.items)&&order.items.length?order.items:[null]
            for(let i=0;i<items.length;i++){
              const item=items[i]
              const externalId=`${conv.conversionId||order.orderId}:${order.orderId||'order'}:${item?.itemId||i}`
              const sale=item?num(item.itemPrice)*Math.max(1,num(item.qty)):0
              const commission=item?num(item.itemTotalCommission):num(conv.totalCommission)
              const er=await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(userId)}&source_type=eq.shopee_affiliate_api&external_order_id=eq.${encodeURIComponent(externalId)}&select=id,commission_validation_status,validated_commission_amount`,{headers})
              const existing=await er.json().catch(()=>[]),prior=Array.isArray(existing)?existing[0]:null
              const isValidated=String(prior?.commission_validation_status||'').toLowerCase()==='validated'
              const payload:any={user_id:userId,product_id:link?.product_id||null,campaign_id:link?.campaign_id||null,creative_id:link?.creative_id||null,publication_id:link?.publication_id||null,tracking_link_id:link?.id||null,variation_id:link?.variation_id||null,sub_id:rawSubs.join('|')||null,external_order_id:externalId,channel:link?.channel||null,sale_amount:sale,commission_amount:isValidated?num(prior?.validated_commission_amount):commission,estimated_commission_amount:commission,commission_validation_status:isValidated?'validated':'estimated',currency:'BRL',status:statusMap(order?.orderStatus),source_type:'shopee_affiliate_api',attribution_confidence:link?'high':'unmatched',attribution_method:link?'shopee_sub_ids':'shopee_report',conversion_date:iso(conv.purchaseTime),raw_payload:{conversion:conv,order,item,sub_ids:rawSubs},notes:isValidated?'Comissão final já validada pela Shopee.':(link?'Sincronização automática por Sub IDs Shopee.':'Conversão Shopee sem correspondência local de Sub IDs.'),is_test_data:false,updated_at:new Date().toISOString()}
              const wr=prior?.id?await fetch(`${url}/rest/v1/conversions?id=eq.${prior.id}`,{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify(payload)}):await fetch(`${url}/rest/v1/conversions`,{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify(payload)})
              if(!wr.ok){const e=await wr.json().catch(()=>({}));throw new Error(e?.message||'Falha ao salvar conversão Shopee.')}
              saved++
            }
          }
        }
        pages++;scrollId=String(report?.pageInfo?.scrollId||'');if(!report?.pageInfo?.hasNextPage)break
      }while(scrollId&&pages<20)
      for(const link of userLinks){
        const cr=await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(userId)}&tracking_link_id=eq.${link.id}&source_type=eq.shopee_affiliate_api&select=commission_amount`,{headers})
        const rows=await cr.json().catch(()=>[])
        if(cr.ok&&Array.isArray(rows)) await fetch(`${url}/rest/v1/tracking_links?id=eq.${link.id}`,{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({conversions_count:rows.length,commission_earned:rows.reduce((a:number,r:any)=>a+num(r.commission_amount),0),updated_at:new Date().toISOString()})})
      }
    }
    return res.status(200).json({success:true,users,received,saved,attributed,run_at:new Date().toISOString()})
  }catch(e:any){return res.status(500).json({error:e?.message||'Falha no cron Shopee.'})}
}
