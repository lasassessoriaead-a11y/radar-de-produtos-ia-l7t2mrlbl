import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre.js'

const ENDPOINT='https://open-api.affiliate.shopee.com.br/graphql'
async function gql(query:string){
 const appId=String(process.env.SHOPEE_AFFILIATE_APP_ID||'').trim(), secret=String(process.env.SHOPEE_AFFILIATE_SECRET||'').trim()
 if(!appId||!secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')
 const payload=JSON.stringify({query}), timestamp=Math.floor(Date.now()/1000).toString()
 const signature=crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`,'utf8').digest('hex')
 const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:`SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`},body:payload})
 const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d?.message||`Shopee respondeu HTTP ${r.status}.`)
 if(d?.errors?.length) throw new Error(d.errors[0]?.extensions?.message||d.errors[0]?.message||'Erro no relatório validado Shopee.')
 return d?.data||{}
}
const num=(v:any)=>Number(v||0)
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store'); if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'})
 try{
  const {user,auth,url,key}=await requireSupabaseUser(req); const h={apikey:key,Authorization:auth,'Content-Type':'application/json'}
  const body=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})):(req.query||{})
  const validationId=Number(body.validation_id||body.validationId)
  if(!Number.isFinite(validationId)||validationId<=0) return res.status(400).json({error:'Informe um validationId válido da Shopee.'})
  let scrollId='',pages=0,received=0,matched=0,updated=0,netCommission=0
  do{
   const scroll=scrollId?`, scrollId: ${JSON.stringify(scrollId)}`:''
   const data=await gql(`{ validatedReport(validationId: ${Math.floor(validationId)}, limit: 100${scroll}) { nodes { conversionId netCommission totalCommission orders { orderId items { itemName itemTotalCommission refundAmount } } } pageInfo { hasNextPage scrollId } } }`)
   const report=data?.validatedReport,nodes=Array.isArray(report?.nodes)?report.nodes:[]; received+=nodes.length
   for(const node of nodes){
    const orders=Array.isArray(node?.orders)?node.orders:[]
    for(const order of orders){
     const prefix=`${node.conversionId||order.orderId}:${order.orderId||'order'}:`
     const qr=await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&source_type=eq.shopee_affiliate_api&external_order_id=like.${encodeURIComponent(prefix+'*')}&select=*`,{headers:h})
     const rows=await qr.json().catch(()=>[]); if(!qr.ok||!Array.isArray(rows)||!rows.length) continue
     matched+=rows.length
     const items=Array.isArray(order?.items)?order.items:[]
     const finalTotal=num(node.netCommission||node.totalCommission)
     const itemFinal=items.reduce((a:number,i:any)=>a+num(i.itemTotalCommission)-num(i.refundAmount),0)
     const target=itemFinal||finalTotal
     const oldTotal=rows.reduce((a:number,r:any)=>a+num(r.commission_amount),0)
     for(const row of rows){
      const share=oldTotal>0?num(row.commission_amount)/oldTotal:1/rows.length
      const finalCommission=Math.max(0,target*share)
      const raw={...(row.raw_payload||{}),validated_report:{validation_id:validationId,conversion_id:node.conversionId,net_commission:finalTotal,total_commission:num(node.totalCommission),order,final_commission:finalCommission,reconciled_at:new Date().toISOString()}}
      const ur=await fetch(`${url}/rest/v1/conversions?id=eq.${row.id}&user_id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',headers:{...h,Prefer:'return=minimal'},body:JSON.stringify({commission_amount:finalCommission,raw_payload:raw,notes:'Comissão reconciliada com o relatório validado da Shopee.',updated_at:new Date().toISOString()})})
      if(ur.ok){updated++;netCommission+=finalCommission}
     }
    }
   }
   pages++; scrollId=String(report?.pageInfo?.scrollId||''); if(!report?.pageInfo?.hasNextPage) break
  }while(scrollId&&pages<20)
  return res.status(200).json({success:true,validation_id:validationId,received,matched,updated,net_commission:netCommission,pages,message:'Comissões validadas da Shopee reconciliadas.'})
 }catch(e:any){return res.status(400).json({error:e?.message||'Não foi possível reconciliar o relatório validado da Shopee.'})}
}
