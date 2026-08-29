migrate(
  (app) => {
    // 1. Adicionar campo is_test_data e provider nas collections da Fase 7 se ainda não existirem
    const signalsCol = app.findCollectionByNameOrId('audience_signals')
    if (!signalsCol.fields.getByName('is_test_data')) {
      signalsCol.fields.add(
        new BoolField({
          name: 'is_test_data',
          required: false,
        }),
      )
    }
    if (!signalsCol.fields.getByName('provider')) {
      signalsCol.fields.add(
        new TextField({
          name: 'provider',
          required: false,
        }),
      )
    }
    app.save(signalsCol)

    const oppsCol = app.findCollectionByNameOrId('audience_opportunities')
    if (!oppsCol.fields.getByName('is_test_data')) {
      oppsCol.fields.add(
        new BoolField({
          name: 'is_test_data',
          required: false,
        }),
      )
    }
    if (!oppsCol.fields.getByName('provider')) {
      oppsCol.fields.add(
        new TextField({
          name: 'provider',
          required: false,
        }),
      )
    }
    app.save(oppsCol)

    const termsCol = app.findCollectionByNameOrId('audience_terms_bank')
    if (!termsCol.fields.getByName('is_test_data')) {
      termsCol.fields.add(
        new BoolField({
          name: 'is_test_data',
          required: false,
        }),
      )
    }
    app.save(termsCol)

    // 2. Marcar todos os sinais, oportunidades e termos de seed existentes como dados de teste
    try {
      app
        .db()
        .newQuery("UPDATE audience_signals SET is_test_data = 1, provider = 'reddit'")
        .execute()
      app
        .db()
        .newQuery("UPDATE audience_opportunities SET is_test_data = 1, provider = 'reddit'")
        .execute()
      app.db().newQuery('UPDATE audience_terms_bank SET is_test_data = 1').execute()
    } catch (e) {
      console.log('Error updating test data flags: ' + e.message)
    }
  },
  (app) => {
    // Revert opcional
  },
)
