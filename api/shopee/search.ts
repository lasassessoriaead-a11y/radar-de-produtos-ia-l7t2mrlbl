import crypto from 'node:crypto'

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function num(value: any) { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
function ratePercent(value: any) { const n = num(value); return n > 0 && n <= 1 ? n * 100 : n }
function normalize(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() }

function relevanceScore(keyword: string, title: string) {
  const q = normalize(keyword), t = normalize(title)
  const tokens = q.split(' ').filter(x => x.length > 1)
  if (!tokens.length) return 0
  const matches = tokens.filter(x => t.includes(x)).length
  let score = Math.round((matches / tokens.length) * 70)
  if (t.includes(q)) score += 20
  if (t.startsWith(q)) score += 10
  return clamp(score, 0, 100)
}

function intentFitScore(keyword: string, title: string) {
  const q = normalize(keyword)
  const t = normalize(title)
  let score = relevanceScore(keyword, title)

  // Product-intent rule for hair dryers: accessories/cosmetics may contain the
  // exact phrase "secador de cabelo" but are not the requested appliance.
  if (q.includes('secador') && q.includes('cabelo')) {
    const accessoryTerms = [
      'spray', 'protetor', 'protecao termica', 'termoprotetor', 'creme', 'oleo', 'serum',
      'shampoo', 'condicionador', 'mascara', 'leave in', 'difusor avulso', 'bico avulso',
      'suporte', 'capa', 'bolsa', 'peca', 'reposicao', 'adaptador', 'escova', 'pente'
    ]
    const applianceSignals = [
      'secador de cabelo', 'secador cabelo', 'hair dryer', 'watt', ' watts', 'w ',
      '220v', '127v', '110v', 'bivolt', 'motor', 'ionico', 'ion ', 'profissional'
    ]

    const isAccessory = accessoryTerms.some(term => t.includes(term))
    const applianceSignalCount = applianceSignals.filter(term => t.includes(term)).length
    const startsAsDryer = t.startsWith('secador de cabelo') || t.startsWith('secador cabelo') || t.startsWith('secador profissional')

    if (isAccessory && !startsAsDryer) score -= 65
    if (startsAsDryer) score += 25
    else if (applianceSignalCount >= 2 && t.includes('secador')) score += 15

    // If the title only mentions the phrase as a usage context, keep it out of
    // the main ranking even when lexical relevance is high.
    if (/para secador de cabelo|uso com secador|protetor.*secador|spray.*secador/.test(t)) score -= 30
  }

  return clamp(score, 0, 100)
}

function opportunityScore(sales: number, rating: number, commissionRate: number, price: number, relevance: number) {
  let score = 25
  if (sales >= 10000) score += 20; else if (sales >= 1000) score += 16; else if (sales >= 100) score += 10; else if (sales > 0) score += 4
  if (rating >= 4.8) score += 12; else if (rating >= 4.5) score += 9; else if (rating >= 4) score += 5
  if (commissionRate >= 10) score += 16; else if (commissionRate >= 5) score += 11; else if (commissionRate > 0) score += 5
  if (price >= 20 && price <= 500) score += 6
  score += Math.round(relevance * 0.2)
  return clamp(score, 0, 98)
}
function level(score: number) { if (score >= 80) return 'hot'; if (score >= 65) return 'good'; if (score >= 50) return 'test'; return 'low' }

async function shopeeGraphql(query: string, variables: Record<string, any>) {
  const appId = String(process.env.SHOPEE_AFFILIATE_APP_ID || '').trim()
  const secret = String(process.env.SHOPEE_AFFILIATE_SECRET || '').trim()
  if (!appId || !secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')
  const payload = JSON.stringify({ query, variables }), timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex')
  const response = await fetch(ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:`SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`}, body:payload })
  const text = await response.text(); let data:any={}; try { data=text?JSON.parse(text):{} } catch { data={raw:text} }
  if (!response.ok) throw new Error(data?.message || `Shopee respondeu HTTP ${response.status}.`)
  if (Array.isArray(data?.errors) && data.errors.length) { const error=data.errors[0]; throw new Error(error?.extensions?.message || error?.message || 'Erro retornado pela Shopee Affiliate API.') }
  return data?.data || {}
}

export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json; charset=utf-8')
  if(req.method!=='POST') return res.status(405).json({success:false,message:'Use POST.'})
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
    const keyword=String(body.query||'').trim(), limit=clamp(Number(body.limit||30),1,100), page=Math.max(1,Number(body.page||(Number(body.offset||0)/limit+1)||1))
    if(!keyword) return res.status(200).json({success:false,status:'invalid_query',message:'Informe um produto para buscar.',total_found:0,products:[]})
    const query=`query RadarShopeeProducts($keyword: String!, $page: Int!, $limit: Int!) { productOfferV2(keyword: $keyword, listType: 0, sortType: 1, page: $page, limit: $limit) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate sales ratingStar commissionRate sellerCommissionRate shopeeCommissionRate commission shopId shopName shopType periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }`
    const data=await shopeeGraphql(query,{keyword,page,limit}), result=data?.productOfferV2||{}, nodes=Array.isArray(result?.nodes)?result.nodes:[]
    let products=nodes.map((p:any)=>{
      const price=num(p.priceMin||p.priceMax), sales=num(p.sales), rating=num(p.ratingStar), commissionRate=ratePercent(p.commissionRate), commission=num(p.commission), relevance=intentFitScore(keyword,String(p.productName||'')), score=opportunityScore(sales,rating,commissionRate,price,relevance)
      return { id:`shopee_${p.shopId||'shop'}_${p.itemId}`,collectionId:'shopee_affiliate',collectionName:'shopee_affiliate',external_id:String(p.itemId||''),platform:'Shopee',title:String(p.productName||''),image_url:String(p.imageUrl||'').replace(/^http:/,'https:'),category:'Shopee',niche:'',price,promo_price:price,commission_rate:commissionRate,commission_amount:commission,commission_is_estimated:false,sales_count:sales,reviews_count:0,rating,seller:String(p.shopName||''),product_url:String(p.productLink||''),affiliate_url:String(p.offerLink||''),competition_level:0,trends_score:0,demand_score:sales,opportunity_score:score,opportunity_level:level(score),status:'pending',source:'shopee_affiliate_api',raw_data:{relevance_score:relevance,shop_id:p.shopId||null,shop_type:p.shopType||null,price_max:num(p.priceMax),discount_rate:num(p.priceDiscountRate),seller_commission_rate:ratePercent(p.sellerCommissionRate),shopee_commission_rate:ratePercent(p.shopeeCommissionRate),period_start_time:p.periodStartTime||null,period_end_time:p.periodEndTime||null,data_source:'Shopee Affiliate Open API'},created:new Date().toISOString(),updated:new Date().toISOString() }
    })
    if(Number(body.min_price)) products=products.filter((p:any)=>p.price>=Number(body.min_price)); if(Number(body.max_price)) products=products.filter((p:any)=>p.price<=Number(body.max_price)); if(Number(body.min_sales)) products=products.filter((p:any)=>p.sales_count>=Number(body.min_sales)); if(Number(body.min_rating)) products=products.filter((p:any)=>p.rating>=Number(body.min_rating)); if(Number(body.estimated_commission_rate)) products=products.filter((p:any)=>p.commission_rate>=Number(body.estimated_commission_rate))

    const normalizedKeyword = normalize(keyword)
    if (normalizedKeyword.includes('secador') && normalizedKeyword.includes('cabelo')) {
      products = products.filter((p:any) => Number(p.raw_data?.relevance_score || 0) >= 45)
    }

    products.sort((a:any,b:any)=>{ const rd=Number(b.raw_data?.relevance_score||0)-Number(a.raw_data?.relevance_score||0); if(Math.abs(rd)>=8)return rd; return b.opportunity_score-a.opportunity_score })
    const pageInfo=result?.pageInfo||{}
    return res.status(200).json({success:true,marketplace:'Shopee',status:'ok',message:`${products.length} produtos relevantes encontrados pela Shopee Affiliate Open API.`,total_found:products.length,products,page,offset:(page-1)*limit,next_offset:page*limit,has_more:Boolean(pageInfo?.hasNextPage),page_info:pageInfo,source_mode:'shopee_affiliate_open_api'})
  } catch(err:any) { return res.status(200).json({success:false,marketplace:'Shopee',status:'api_error',total_found:0,products:[],message:String(err?.message||err)}) }
}
