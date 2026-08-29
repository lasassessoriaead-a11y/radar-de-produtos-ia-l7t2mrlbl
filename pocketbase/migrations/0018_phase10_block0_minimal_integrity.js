migrate(
  (app) => {
    // 1. Adicionar campo booleano `is_test_data` em tracking_links, click_events e conversions
    const targetCollections = ['tracking_links', 'click_events', 'conversions']
    for (let i = 0; i < targetCollections.length; i++) {
      const name = targetCollections[i]
      try {
        const col = app.findCollectionByNameOrId(name)
        let exists = false
        const fields = col.fields || []
        for (let j = 0; j < fields.length; j++) {
          if (fields[j].name === 'is_test_data') {
            exists = true
            break
          }
        }
        if (!exists) {
          col.fields.add(
            new BoolField({
              name: 'is_test_data',
              required: false,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        console.log('Error adding is_test_data to ' + name + ':', err)
      }
    }

    // 2. Restringir API Rules sensíveis por user_id = @request.auth.id
    // CRM: crm_contacts, crm_consent_logs, crm_recommendations, crm_cadence_settings
    // Leads: inbound_leads
    // Orquestrador: orchestrator_config, orchestrator_policies, orchestrator_actions, orchestrator_decision_log, orchestrator_shadow_log
    // Demais coleções de domínio sensíveis
    const userRestrictedCollections = [
      'crm_contacts',
      'crm_consent_logs',
      'crm_recommendations',
      'crm_cadence_settings',
      'inbound_leads',
      'orchestrator_config',
      'orchestrator_policies',
      'orchestrator_actions',
      'orchestrator_decision_log',
      'orchestrator_shadow_log',
      'campaigns',
      'brand_kits',
      'creatives',
      'creative_assets',
      'watchlist',
      'audience_signals',
      'audience_opportunities',
      'audience_terms_bank',
    ]

    const userOwnershipRule = "@request.auth.id != '' && user_id = @request.auth.id"

    for (let i = 0; i < userRestrictedCollections.length; i++) {
      const colName = userRestrictedCollections[i]
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (!col) continue

        col.listRule = userOwnershipRule
        col.viewRule = userOwnershipRule
        col.createRule = "@request.auth.id != ''"
        col.updateRule = userOwnershipRule
        col.deleteRule = userOwnershipRule
        app.save(col)
      } catch (err) {
        console.log('Error updating API rules for ' + colName + ':', err)
      }
    }

    // Coleções filhas (campaign_variations, creative_versions, campaign_hooks)
    const childCollections = [
      {
        name: 'campaign_variations',
        relRule: "@request.auth.id != '' && campaign_id.user_id = @request.auth.id",
      },
      { name: 'campaign_hooks', relRule: "@request.auth.id != ''" },
      {
        name: 'creative_versions',
        relRule: "@request.auth.id != '' && creative_id.user_id = @request.auth.id",
      },
    ]

    for (let i = 0; i < childCollections.length; i++) {
      const item = childCollections[i]
      try {
        const col = app.findCollectionByNameOrId(item.name)
        if (col) {
          col.listRule = item.relRule
          col.viewRule = item.relRule
          col.createRule = "@request.auth.id != ''"
          col.updateRule = item.relRule
          col.deleteRule = item.relRule
          app.save(col)
        }
      } catch (err) {
        console.log('Error updating child collection ' + item.name + ':', err)
      }
    }
  },
  (app) => {
    const revertCollections = [
      'crm_contacts',
      'crm_consent_logs',
      'crm_recommendations',
      'crm_cadence_settings',
      'inbound_leads',
      'orchestrator_config',
      'orchestrator_policies',
      'orchestrator_actions',
      'orchestrator_decision_log',
      'orchestrator_shadow_log',
    ]

    for (let i = 0; i < revertCollections.length; i++) {
      const colName = revertCollections[i]
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (col) {
          col.listRule = "@request.auth.id != ''"
          col.viewRule = "@request.auth.id != ''"
          col.createRule = "@request.auth.id != ''"
          col.updateRule = "@request.auth.id != ''"
          col.deleteRule = "@request.auth.id != ''"
          app.save(col)
        }
      } catch (_) {}
    }
  },
)
