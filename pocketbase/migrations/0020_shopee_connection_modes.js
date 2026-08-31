migrate(
  (app) => {
    const col = new Collection({
      name: 'marketplace_connections',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'marketplace',
          type: 'select',
          required: true,
          values: ['shopee'],
          maxSelect: 1,
        },
        {
          name: 'mode',
          type: 'select',
          required: true,
          values: ['manual', 'open_api'],
          maxSelect: 1,
        },
        { name: 'manual_enabled', type: 'bool' },
        {
          name: 'api_status',
          type: 'select',
          required: true,
          values: ['not_configured', 'waiting_credentials', 'configured', 'error'],
          maxSelect: 1,
        },
        { name: 'app_id_masked', type: 'text' },
        { name: 'credentials_encrypted', type: 'text' },
        { name: 'status_message', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'last_tested_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_marketplace_user_unique ON marketplace_connections (user_id, marketplace)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('marketplace_connections')
      app.delete(col)
    } catch (_) {}
  },
)
