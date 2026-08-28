import { CsvMapping, Product } from '@/types/product'

/**
 * Autodetects the delimiter (comma or semicolon) based on the first lines.
 */
export function detectDelimiter(text: string): ',' | ';' {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return ','
  const firstLine = lines[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  return semicolonCount >= commaCount ? ';' : ','
}

/**
 * Robust CSV parser that correctly handles quotes, escaped quotes, and newlines in cells.
 */
export function parseCsvText(
  text: string,
  delimiter?: ',' | ';',
): { headers: string[]; rows: string[][] } {
  const resolvedDelimiter = delimiter || detectDelimiter(text)
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === resolvedDelimiter && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const dataRows = rows.slice(1)

  return { headers, rows: dataRows }
}

/**
 * Suggests default mapping between CSV header names and Product fields.
 */
export function autoSuggestMapping(headers: string[]): CsvMapping {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

  const mapping: CsvMapping = {
    title: '',
    platform: '',
    category: '',
    niche: '',
    price: '',
    promo_price: '',
    commission_rate: '',
    commission_amount: '',
    sales_count: '',
    reviews_count: '',
    rating: '',
    seller: '',
    product_url: '',
    affiliate_url: '',
    image_url: '',
  }

  headers.forEach((h) => {
    const n = normalize(h)
    if (
      !mapping.title &&
      (n.includes('titulo') || n.includes('title') || n.includes('nome') || n.includes('produto'))
    ) {
      mapping.title = h
    } else if (
      !mapping.platform &&
      (n.includes('plataforma') ||
        n.includes('platform') ||
        n.includes('fonte') ||
        n.includes('marketplace') ||
        n.includes('loja'))
    ) {
      mapping.platform = h
    } else if (
      !mapping.category &&
      (n.includes('categoria') || n.includes('category') || n.includes('departamento'))
    ) {
      mapping.category = h
    } else if (
      !mapping.niche &&
      (n.includes('nicho') || n.includes('niche') || n.includes('segmento'))
    ) {
      mapping.niche = h
    } else if (
      !mapping.promo_price &&
      (n.includes('promocional') || n.includes('promoprice') || n.includes('desconto'))
    ) {
      mapping.promo_price = h
    } else if (
      !mapping.price &&
      (n.includes('preco') || n.includes('price') || n.includes('valor'))
    ) {
      mapping.price = h
    } else if (
      !mapping.commission_rate &&
      (n.includes('comissaopercent') ||
        n.includes('comissao%') ||
        n.includes('commissionrate') ||
        n.includes('taxa'))
    ) {
      mapping.commission_rate = h
    } else if (
      !mapping.commission_amount &&
      (n.includes('comissaors') ||
        n.includes('comissao') ||
        n.includes('commissionamount') ||
        n.includes('lucro'))
    ) {
      mapping.commission_amount = h
    } else if (
      !mapping.sales_count &&
      (n.includes('vendas') ||
        n.includes('sales') ||
        n.includes('qtdvendas') ||
        n.includes('pedidos'))
    ) {
      mapping.sales_count = h
    } else if (
      !mapping.reviews_count &&
      (n.includes('avaliacoes') || n.includes('reviews') || n.includes('comentarios'))
    ) {
      mapping.reviews_count = h
    } else if (
      !mapping.rating &&
      (n.includes('nota') || n.includes('rating') || n.includes('estrelas') || n.includes('score'))
    ) {
      mapping.rating = h
    } else if (
      !mapping.seller &&
      (n.includes('vendedor') ||
        n.includes('seller') ||
        n.includes('loja') ||
        n.includes('merchant'))
    ) {
      mapping.seller = h
    } else if (
      !mapping.affiliate_url &&
      (n.includes('afiliado') || n.includes('affiliate') || n.includes('linkafiliado'))
    ) {
      mapping.affiliate_url = h
    } else if (
      !mapping.product_url &&
      (n.includes('link') || n.includes('url') || n.includes('site'))
    ) {
      mapping.product_url = h
    } else if (
      !mapping.image_url &&
      (n.includes('imagem') ||
        n.includes('image') ||
        n.includes('foto') ||
        n.includes('img') ||
        n.includes('thumb'))
    ) {
      mapping.image_url = h
    }
  })

  return mapping
}

export function parseNumberField(val: string | undefined): number | undefined {
  if (!val) return undefined
  // Normalize Brazilian currency like R$ 1.250,50 or 49,90 or 49.90
  const clean = val.replace(/r\$/gi, '').replace(/%/g, '').trim()
  if (!clean) return undefined

  if (clean.includes(',') && clean.includes('.')) {
    // If dot comes first, it's 1.250,50 -> remove dot, replace comma with dot
    if (clean.indexOf('.') < clean.indexOf(',')) {
      const parsed = parseFloat(clean.replace(/\./g, '').replace(',', '.'))
      return isNaN(parsed) ? undefined : parsed
    }
  } else if (clean.includes(',')) {
    const parsed = parseFloat(clean.replace(',', '.'))
    return isNaN(parsed) ? undefined : parsed
  }

  const parsed = parseFloat(clean)
  return isNaN(parsed) ? undefined : parsed
}

export function transformCsvRowsToProducts(
  headers: string[],
  rows: string[][],
  mapping: CsvMapping,
): { valid: Partial<Product>[]; errors: Array<{ row: number; reason: string }> } {
  const headerIndexMap: Record<string, number> = {}
  headers.forEach((h, i) => {
    headerIndexMap[h] = i
  })

  const valid: Partial<Product>[] = []
  const errors: Array<{ row: number; reason: string }> = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed including header
    const getVal = (fieldName: keyof CsvMapping): string => {
      const headerName = mapping[fieldName]
      if (!headerName) return ''
      const colIdx = headerIndexMap[headerName]
      if (colIdx === undefined || colIdx >= row.length) return ''
      return row[colIdx]?.trim() || ''
    }

    const title = getVal('title')
    if (!title) {
      errors.push({ row: rowNum, reason: 'Nome do produto (title) está vazio' })
      return
    }

    const price = parseNumberField(getVal('price'))
    const promoPrice = parseNumberField(getVal('promo_price'))
    const commRate = parseNumberField(getVal('commission_rate'))
    const commAmount = parseNumberField(getVal('commission_amount'))
    const salesCount = parseNumberField(getVal('sales_count'))
    const reviewsCount = parseNumberField(getVal('reviews_count'))
    const rating = parseNumberField(getVal('rating'))

    const product: Partial<Product> = {
      title,
      platform: getVal('platform') || 'Manual',
      category: getVal('category') || 'Geral',
      niche: getVal('niche') || 'Outros',
      price: price || 0,
      promo_price: promoPrice || price || 0,
      commission_rate: commRate || 0,
      commission_amount: commAmount || 0,
      sales_count: salesCount || 0,
      reviews_count: reviewsCount || 0,
      rating: rating || 4.5,
      seller: getVal('seller') || '',
      product_url: getVal('product_url') || '',
      affiliate_url: getVal('affiliate_url') || '',
      image_url: getVal('image_url') || 'https://img.usecurling.com/p/600/600?q=ecommerce+product',
      competition_level: 5,
      trends_score: 7,
      demand_score: 7,
      source: 'csv',
      metadata: { imported_at: new Date().toISOString() },
    }

    valid.push(product)
  })

  return { valid, errors }
}
