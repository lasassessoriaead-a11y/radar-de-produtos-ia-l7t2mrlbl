migrate(
  (app) => {
    const addTextField = (collectionName, fieldName) => {
      try {
        const col = app.findCollectionByNameOrId(collectionName)
        let exists = false
        const fields = col.fields || []
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].name === fieldName) {
            exists = true
            break
          }
        }
        if (!exists) {
          col.fields.add(
            new TextField({
              name: fieldName,
              required: false,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        console.log('Error adding ' + fieldName + ' to ' + collectionName + ':', err)
      }
    }

    const shopeeFields = [
      'marketplace',
      'sub_id_1',
      'sub_id_2',
      'sub_id_3',
      'sub_id_4',
      'sub_id_5',
    ]

    for (let i = 0; i < shopeeFields.length; i++) {
      addTextField('tracking_links', shopeeFields[i])
      addTextField('conversions', shopeeFields[i])
    }

    addTextField('conversions', 'dedupe_key')

    try {
      const tracking = app.findCollectionByNameOrId('tracking_links')
      const indexes = tracking.indexes || []
      const wanted = 'CREATE INDEX idx_track_subid5 ON tracking_links (sub_id_5)'
      if (!indexes.includes(wanted)) {
        tracking.indexes = indexes.concat([wanted])
        app.save(tracking)
      }
    } catch (err) {
      console.log('Error adding tracking_links Shopee index:', err)
    }

    try {
      const conversions = app.findCollectionByNameOrId('conversions')
      const indexes = conversions.indexes || []
      const additions = []
      const idxSub5 = 'CREATE INDEX idx_conv_subid5 ON conversions (sub_id_5)'
      const idxDedupe =
        'CREATE UNIQUE INDEX idx_conv_user_dedupe ON conversions (user_id, dedupe_key)'
      if (!indexes.includes(idxSub5)) additions.push(idxSub5)
      if (!indexes.includes(idxDedupe)) additions.push(idxDedupe)
      if (additions.length > 0) {
        conversions.indexes = indexes.concat(additions)
        app.save(conversions)
      }
    } catch (err) {
      console.log('Error adding conversions Shopee indexes:', err)
    }
  },
  (app) => {
    const removeField = (collectionName, fieldName) => {
      try {
        const col = app.findCollectionByNameOrId(collectionName)
        const field = col.fields.getByName(fieldName)
        if (field) {
          col.fields.removeById(field.id)
          app.save(col)
        }
      } catch (_) {}
    }

    const fields = [
      'marketplace',
      'sub_id_1',
      'sub_id_2',
      'sub_id_3',
      'sub_id_4',
      'sub_id_5',
    ]
    for (let i = 0; i < fields.length; i++) {
      removeField('tracking_links', fields[i])
      removeField('conversions', fields[i])
    }
    removeField('conversions', 'dedupe_key')
  },
)
