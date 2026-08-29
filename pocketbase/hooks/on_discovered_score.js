// Hook for calculating Opportunity Score and Opportunity Level for discovered_products
// Keep all logic self-contained inside the callback to avoid JSVM scoping issues

onRecordCreate((e) => {
  const rec = e.record

  const price = rec.getFloat('price') || 0
  const promoPrice = rec.getFloat('promo_price') || price
  const effectivePrice = promoPrice > 0 ? promoPrice : price

  let commissionRate = rec.getFloat('commission_rate') || 0
  let commissionAmount = rec.getFloat('commission_amount') || 0

  if (commissionAmount <= 0 && commissionRate > 0 && effectivePrice > 0) {
    commissionAmount = Math.round(effectivePrice * (commissionRate / 100) * 100) / 100
    rec.set('commission_amount', commissionAmount)
  } else if (commissionRate <= 0 && commissionAmount > 0 && effectivePrice > 0) {
    commissionRate = Math.round((commissionAmount / effectivePrice) * 100 * 10) / 10
    rec.set('commission_rate', commissionRate)
  }

  const sales = rec.getFloat('sales_count') || 0
  const rating = rec.getFloat('rating') || 0
  const comp = rec.getFloat('competition_level') || 5
  const trends = rec.getFloat('trends_score') || 5
  const demand = rec.getFloat('demand_score') || 5

  // 1. Commission factor (0-25 pts)
  let commScore = 0
  if (commissionAmount >= 50) commScore = 25
  else if (commissionAmount >= 30) commScore = 22
  else if (commissionAmount >= 15) commScore = 18
  else if (commissionAmount >= 8) commScore = 14
  else if (commissionAmount >= 4) commScore = 9
  else if (commissionAmount > 0) commScore = Math.max(1, Math.min(6, commissionAmount * 1.5))
  else commScore = 10 // Sensible default when commission is unavailable/unestimated

  // 2. Sales factor (0-20 pts)
  let salesScore = 0
  if (sales >= 2000) salesScore = 20
  else if (sales >= 800) salesScore = 16
  else if (sales >= 200) salesScore = 12
  else if (sales >= 50) salesScore = 8
  else if (sales > 0) salesScore = Math.min(6, sales * 0.1)
  else salesScore = 8

  // 3. Rating factor (0-20 pts)
  let ratingScore = 0
  if (rating >= 4.7) ratingScore = 20
  else if (rating >= 4.4) ratingScore = 17
  else if (rating >= 4.0) ratingScore = 13
  else if (rating >= 3.5) ratingScore = 7
  else if (rating > 0) ratingScore = 2
  else ratingScore = 10

  // 4. Trend & Demand (0-20 pts)
  const trendDemandScore = Math.round((trends * 1.0 + demand * 1.0) * 1.0)

  // 5. Competition Penalty (-15 to 0 pts)
  const compPenalty = Math.max(0, Math.min(15, (comp - 3) * 2))

  let finalScore = Math.round(commScore + salesScore + ratingScore + trendDemandScore - compPenalty)
  if (finalScore < 5) finalScore = 5
  if (finalScore > 98) finalScore = 98

  if (rating > 0 && rating < 3.8 && finalScore > 40) {
    finalScore = 30
  }

  rec.set('opportunity_score', finalScore)

  if (finalScore >= 80) {
    rec.set('opportunity_level', 'hot')
  } else if (finalScore >= 60) {
    rec.set('opportunity_level', 'good')
  } else if (finalScore >= 40) {
    rec.set('opportunity_level', 'test')
  } else {
    rec.set('opportunity_level', 'low')
  }

  if (!rec.getString('status')) {
    rec.set('status', 'pending')
  }

  e.next()
}, 'discovered_products')

onRecordUpdate((e) => {
  const rec = e.record

  const price = rec.getFloat('price') || 0
  const promoPrice = rec.getFloat('promo_price') || price
  const effectivePrice = promoPrice > 0 ? promoPrice : price

  let commissionRate = rec.getFloat('commission_rate') || 0
  let commissionAmount = rec.getFloat('commission_amount') || 0

  if (commissionAmount <= 0 && commissionRate > 0 && effectivePrice > 0) {
    commissionAmount = Math.round(effectivePrice * (commissionRate / 100) * 100) / 100
    rec.set('commission_amount', commissionAmount)
  } else if (commissionRate <= 0 && commissionAmount > 0 && effectivePrice > 0) {
    commissionRate = Math.round((commissionAmount / effectivePrice) * 100 * 10) / 10
    rec.set('commission_rate', commissionRate)
  }

  const sales = rec.getFloat('sales_count') || 0
  const rating = rec.getFloat('rating') || 0
  const comp = rec.getFloat('competition_level') || 5
  const trends = rec.getFloat('trends_score') || 5
  const demand = rec.getFloat('demand_score') || 5

  let commScore = 0
  if (commissionAmount >= 50) commScore = 25
  else if (commissionAmount >= 30) commScore = 22
  else if (commissionAmount >= 15) commScore = 18
  else if (commissionAmount >= 8) commScore = 14
  else if (commissionAmount >= 4) commScore = 9
  else if (commissionAmount > 0) commScore = Math.max(1, Math.min(6, commissionAmount * 1.5))
  else commScore = 10

  let salesScore = 0
  if (sales >= 2000) salesScore = 20
  else if (sales >= 800) salesScore = 16
  else if (sales >= 200) salesScore = 12
  else if (sales >= 50) salesScore = 8
  else if (sales > 0) salesScore = Math.min(6, sales * 0.1)
  else salesScore = 8

  let ratingScore = 0
  if (rating >= 4.7) ratingScore = 20
  else if (rating >= 4.4) ratingScore = 17
  else if (rating >= 4.0) ratingScore = 13
  else if (rating >= 3.5) ratingScore = 7
  else if (rating > 0) ratingScore = 2
  else ratingScore = 10

  const trendDemandScore = Math.round((trends * 1.0 + demand * 1.0) * 1.0)
  const compPenalty = Math.max(0, Math.min(15, (comp - 3) * 2))

  let finalScore = Math.round(commScore + salesScore + ratingScore + trendDemandScore - compPenalty)
  if (finalScore < 5) finalScore = 5
  if (finalScore > 98) finalScore = 98

  if (rating > 0 && rating < 3.8 && finalScore > 40) {
    finalScore = 30
  }

  rec.set('opportunity_score', finalScore)

  if (finalScore >= 80) {
    rec.set('opportunity_level', 'hot')
  } else if (finalScore >= 60) {
    rec.set('opportunity_level', 'good')
  } else if (finalScore >= 40) {
    rec.set('opportunity_level', 'test')
  } else {
    rec.set('opportunity_level', 'low')
  }

  e.next()
}, 'discovered_products')
