// Backend Hook: CRM Metrics, Cohort Analysis, Relationship Report & Sales Intelligence Aggregation
// Rules:
// - LTV based strictly on confirmed commission amounts. If sample < 3, flag "insufficient_data".
// - Cohorts grouped by acquisition period, channel, and origin campaign.
// - Integration feeds Sales Intelligence with aggregated repurchase data.

routerAdd(
  'GET',
  '/backend/v1/crm/analytics/dashboard',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const contactsCol = $app.findCollectionByNameOrId('crm_contacts')

    let contacts = []
    try {
      contacts = $app.findRecordsByFilter('crm_contacts', '', '-created', 500, 0) || []
    } catch (_) {
      contacts = []
    }

    let totalContacts = contacts.length
    let totalLeads = 0
    let qualifiedLeads = 0
    let totalCustomers = 0
    let recurringCustomers = 0
    let totalOptOuts = 0
    let activeConsentCount = 0

    let totalCommissionEarned = 0
    let totalSalesVolume = 0
    let customerWithPurchasesCount = 0

    const channelMap = {}
    const categoryRepurchaseMap = {}
    const reactivationOpportunities = []
    const cohortsMap = {}

    const now = Date.now()

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const status = c.getString('status')
      const channel = c.getString('channel') || 'outros'
      const isCust = c.getBool('is_customer')
      const isRec = c.getBool('is_recurring_customer')
      const comm = c.getFloat('total_commission_earned') || 0
      const sales = c.getFloat('total_sales_value') || 0
      const purchases = c.getInt('purchases_count') || 0
      const lastInteraction = c.getString('last_interaction_date')
      const createdDate = c.getString('created') || new Date().toISOString()
      const categories = c.get('categories_of_interest') || []
      const identifier = c.getString('identifier')
      const name = c.getString('name') || identifier
      const isTestData = c.getBool('is_test_data')

      if (status === 'opt_out') {
        totalOptOuts++
      } else {
        activeConsentCount++
      }

      if (isCust) {
        totalCustomers++
        if (purchases > 0) {
          customerWithPurchasesCount++
          totalCommissionEarned += comm
          totalSalesVolume += sales
        }
      } else if (status !== 'opt_out') {
        totalLeads++
        if (status === 'qualificado' || status === 'engajado' || status === 'em_decisao') {
          qualifiedLeads++
        }
      }

      if (isRec) {
        recurringCustomers++
      }

      // Canais
      channelMap[channel] = (channelMap[channel] || 0) + 1

      // Categorias de recompra
      if (Array.isArray(categories)) {
        for (let j = 0; j < categories.length; j++) {
          const cat = categories[j]
          if (!categoryRepurchaseMap[cat]) {
            categoryRepurchaseMap[cat] = {
              category: cat,
              customers_count: 0,
              recurring_count: 0,
              total_commission: 0,
            }
          }
          if (isCust) categoryRepurchaseMap[cat].customers_count++
          if (isRec) categoryRepurchaseMap[cat].recurring_count++
          categoryRepurchaseMap[cat].total_commission += comm
        }
      }

      // Oportunidades de Reativação (com consentimento válido e sem opt-out)
      if (status !== 'opt_out') {
        let diffDays = 0
        if (lastInteraction) {
          diffDays = Math.floor((now - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
        }

        if (isCust && diffDays >= 30) {
          reactivationOpportunities.push({
            id: c.id,
            name: name,
            identifier: identifier,
            type: 'cliente_sem_interacao',
            days_inactive: diffDays,
            reason: `Cliente sem interação há ${diffDays} dias com compras anteriores. Oportunidade de conteúdo útil ou reposição.`,
            priority: diffDays >= 60 ? 'alta' : 'media',
            channel: channel,
            is_test_data: isTestData,
          })
        } else if (
          !isCust &&
          (status === 'qualificado' || status === 'engajado') &&
          diffDays >= 14
        ) {
          reactivationOpportunities.push({
            id: c.id,
            name: name,
            identifier: identifier,
            type: 'lead_qualificado_parado',
            days_inactive: diffDays,
            reason: `Lead qualificado sem avanço há ${diffDays} dias. Sugerir conteúdo educativo ou demonstração prática.`,
            priority: 'media',
            channel: channel,
            is_test_data: isTestData,
          })
        }
      }

      // Coortes (Mês de Aquisição)
      const monthCohort = createdDate.slice(0, 7) // "YYYY-MM"
      if (!cohortsMap[monthCohort]) {
        cohortsMap[monthCohort] = {
          cohort_period: monthCohort,
          total_acquired: 0,
          customers: 0,
          recurring: 0,
          total_commission: 0,
          opt_outs: 0,
        }
      }
      cohortsMap[monthCohort].total_acquired++
      if (isCust) cohortsMap[monthCohort].customers++
      if (isRec) cohortsMap[monthCohort].recurring++
      cohortsMap[monthCohort].total_commission += comm
      if (status === 'opt_out') cohortsMap[monthCohort].opt_outs++
    }

    // Taxas do Funil
    const leadToCustomerRate =
      totalContacts > 0 ? ((totalCustomers / totalContacts) * 100).toFixed(1) : '0.0'
    const repurchaseRate =
      totalCustomers > 0 ? ((recurringCustomers / totalCustomers) * 100).toFixed(1) : '0.0'
    const averageLtvCommission =
      customerWithPurchasesCount > 0
        ? (totalCommissionEarned / customerWithPurchasesCount).toFixed(2)
        : '0.00'

    const cohortsList = Object.keys(cohortsMap)
      .sort()
      .map((k) => {
        const item = cohortsMap[k]
        const convRate =
          item.total_acquired > 0
            ? ((item.customers / item.total_acquired) * 100).toFixed(1)
            : '0.0'
        const recRate =
          item.customers > 0 ? ((item.recurring / item.customers) * 100).toFixed(1) : '0.0'
        return {
          cohort: item.cohort_period,
          acquired: item.total_acquired,
          customers: item.customers,
          recurring: item.recurring,
          conversion_rate: convRate,
          repurchase_rate: recRate,
          total_commission: item.total_commission.toFixed(2),
          opt_outs: item.opt_outs,
        }
      })

    const categoriesList = Object.values(categoryRepurchaseMap).map((cat) => ({
      category: cat.category,
      customers: cat.customers_count,
      recurring: cat.recurring_count,
      repurchase_rate:
        cat.customers_count > 0
          ? ((cat.recurring_count / cat.customers_count) * 100).toFixed(1)
          : '0.0',
      total_commission: cat.total_commission.toFixed(2),
    }))

    // Integração com Fase 6 (Sales Intelligence Learning Data)
    const crmLearningsForSalesIntelligence = {
      top_repurchase_categories: categoriesList
        .filter((c) => parseFloat(c.repurchase_rate) > 0)
        .sort((a, b) => parseFloat(b.repurchase_rate) - parseFloat(a.repurchase_rate)),
      top_channels_for_recurring: Object.keys(channelMap).map((ch) => ({
        channel: ch,
        total_contacts: channelMap[ch],
      })),
      ltv_data_status: customerWithPurchasesCount >= 3 ? 'valid_sample' : 'insufficient_data',
      average_commercial_relationship_value: parseFloat(averageLtvCommission),
    }

    return e.json(200, {
      success: true,
      metrics: {
        total_contacts: totalContacts,
        total_leads: totalLeads,
        qualified_leads: qualifiedLeads,
        total_customers: totalCustomers,
        recurring_customers: recurringCustomers,
        total_opt_outs: totalOptOuts,
        active_consents: activeConsentCount,
        lead_to_customer_rate: parseFloat(leadToCustomerRate),
        repurchase_rate: parseFloat(repurchaseRate),
        total_commission_earned: totalCommissionEarned,
        total_sales_volume: totalSalesVolume,
        average_commission_per_customer: parseFloat(averageLtvCommission),
        ltv_status: customerWithPurchasesCount >= 3 ? 'calculado' : 'dados_insuficientes',
      },
      funnel: [
        { stage: 'Leads Consentidos', count: totalContacts, pct: 100 },
        {
          stage: 'Leads Qualificados',
          count: qualifiedLeads + totalCustomers,
          pct:
            totalContacts > 0
              ? Math.round(((qualifiedLeads + totalCustomers) / totalContacts) * 100)
              : 0,
        },
        {
          stage: 'Clientes',
          count: totalCustomers,
          pct: totalContacts > 0 ? Math.round((totalCustomers / totalContacts) * 100) : 0,
        },
        {
          stage: 'Clientes Recorrentes',
          count: recurringCustomers,
          pct: totalCustomers > 0 ? Math.round((recurringCustomers / totalCustomers) * 100) : 0,
        },
      ],
      cohorts: cohortsList,
      category_repurchase: categoriesList,
      reactivation_opportunities: reactivationOpportunities,
      crm_learnings: crmLearningsForSalesIntelligence,
    })
  },
  $apis.requireAuth(),
)
