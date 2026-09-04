import crypto from 'node:crypto'

const SHOPEE_ENDPOINT='https://open-api.affiliate.shopee.com.br/graphql'
const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://nqepcuktmbnjecjlemmh.supabase.co').replace(/\/$/,'')
const INGEST_URL=`${SUPABASE_URL}/functions/v1/shopee-cron-ingest`

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

async function edgeCall(oidc:string,body:any){
  const r=await fetch(INGEST_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${oidc}`},body:JSON.stringify(body)})
  const data=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(data?.error||`Supabase Edge HTTP ${r.status}`)
  return data
}

export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'})
  try{
    const oidc=String(process.env.VERCEL_OIDC_TOKEN||'').trim()
    if(!oidc) throw new Error('VERCEL_OIDC_TOKEN não disponível no runtime.')

    const runId=crypto.randomUUID()
    const claim=await edgeCall(oidc,{mode:'claim',run_id:runId})
    if(!claim?.allowed) return res.status(200).json({success:true,skipped:true,reason:'cooldown_or_running',run_id:runId,run_at:new Date().toISOString()})

    const end=Math.floor(Date.now()/1000),start=end-30*86400
    let scrollId='',pages=0
    const nodes:any[]=[]
    do{
      const scrollArg=scrollId?`, scrollId: ${JSON.stringify(scrollId)}`:''
      const data=await shopeeGraphql(`{ conversionReport(purchaseTimeStart: ${start}, purchaseTimeEnd: ${end}, limit: 100${scrollArg}) { nodes { purchaseTime clickTime conversionId totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission attributionType } } } pageInfo { hasNextPage scrollId } } }`)
      const report=data?.conversionReport
      const pageNodes=Array.isArray(report?.nodes)?report.nodes:[]
      nodes.push(...pageNodes)
      pages++
      scrollId=String(report?.pageInfo?.scrollId||'')
      if(!report?.pageInfo?.hasNextPage) break
    }while(scrollId&&pages<20)

    const result=await edgeCall(oidc,{mode:'ingest',run_id:runId,nodes})
    return res.status(200).json({...result,pages,run_id:runId,run_at:new Date().toISOString()})
  }catch(e:any){
    console.error('cron shopee-sync',e)
    return res.status(500).json({error:e?.message||'Falha no cron Shopee.'})
  }
}
