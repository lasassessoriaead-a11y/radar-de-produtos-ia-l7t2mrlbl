import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  FileText,
  Trash2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { productsService } from '@/services/products'
import pb from '@/lib/pocketbase/client'
import type { ProductRecord } from '@/types/product'
import { toast } from 'sonner'
import { shopeeService } from '@/services/shopee'

interface CsvRow {
  [key: string]: string
}

export default function ImportPage() {
  const navigate = useNavigate()

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    image_url: '',
    platform: 'Shopee',
    category: 'Eletrônicos & Áudio',
    niche: '',
    price: '',
    promo_price: '',
    commission_rate: '',
    commission_amount: '',
    sales_count: '',
    reviews_count: '',
    rating: '4.5',
    seller: '',
    product_url: '',
    affiliate_url: '',
    competition_level: '5',
    trends_score: '8',
    demand_score: '8',
  })
  const [manualLoading, setManualLoading] = useState(false)
  const [quickUrl, setQuickUrl] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)
  const [shopeeConnected, setShopeeConnected] = useState(false)

  // CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [columnMapping, setColumnMapping] = useState<{ [field: string]: string }>({
    title: '',
    price: '',
    promo_price: '',
    commission_rate: '',
    commission_amount: '',
    platform: '',
    category: '',
    sales_count: '',
    reviews_count: '',
    rating: '',
    product_url: '',
    affiliate_url: '',
    image_url: '',
    seller: '',
  })
  const [csvStep, setCsvStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [csvImporting, setCsvImporting] = useState(false)

  const handleQuickImport = async () => {
    const url = quickUrl.trim()
    if (!url) {
      toast.error('Cole o link do produto da Shopee.')
      return
    }
    setQuickLoading(true)
    try {
      await shopeeService.setMode('manual')
      setShopeeConnected(true)
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-import`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível importar o produto.')
      if (!data.success || !data.product) {
        const detected = data.detected || {}
        const detail = [
          detected.title ? `Título detectado: ${detected.title}` : '',
          detected.price ? `Preço detectado: R$ ${Number(detected.price).toFixed(2)}` : '',
        ].filter(Boolean).join(' • ')
        toast.warning(data.message || 'Produto não pôde ser validado automaticamente.', {
          description: detail || 'Nada foi salvo para evitar foto, preço ou produto incorreto.',
          duration: 9000,
        })
        return
      }
      let product = data.product as ProductRecord

      if ((!product.title || product.title === 'Produto Shopee' || !product.image_url || !product.price) && product.id) {
        try {
          const enrichRes = await fetch('/api/product-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_url: product.product_url || url }),
          })
          const enrich = await enrichRes.json()
          if (enrichRes.ok && enrich?.found) {
            const updates: Partial<ProductRecord> = {}
            if (enrich.title && (!product.title || product.title === 'Produto Shopee')) updates.title = enrich.title
            if (enrich.image_url && !product.image_url) updates.image_url = enrich.image_url
            if (enrich.price && !product.price) {
              updates.price = enrich.price
              updates.promo_price = enrich.promo_price || enrich.price
            }
            if (Object.keys(updates).length) {
              product = await productsService.updateProduct(product.id, updates)
              toast.success('Produto enriquecido automaticamente com dados públicos.')
            }
          }
        } catch (enrichErr) {
          console.warn('Shopee enrichment fallback unavailable:', enrichErr)
        }
      }

      if (Array.isArray(data.warnings) && data.warnings.length && (!product.image_url || !product.price)) {
        toast.warning(data.warnings.join(' '))
      } else {
        toast.success('Produto importado automaticamente.')
      }
      navigate(`/laboratorio?productId=${product.id}`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar o link.')
    } finally {
      setQuickLoading(false)
    }
  }

  // Handle Manual Form Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.title.trim()) {
      toast.error('O título do produto é obrigatório.')
      return
    }

    setManualLoading(true)
    try {
      const priceNum = parseFloat(manualForm.price.replace(',', '.')) || 0
      const promoNum = parseFloat(manualForm.promo_price.replace(',', '.')) || priceNum
      const rateNum = parseFloat(manualForm.commission_rate.replace(',', '.')) || 0
      let amountNum = parseFloat(manualForm.commission_amount.replace(',', '.')) || 0

      if (amountNum <= 0 && rateNum > 0 && promoNum > 0) {
        amountNum = Math.round(promoNum * (rateNum / 100) * 100) / 100
      }

      await productsService.createProduct({
        title: manualForm.title,
        image_url: manualForm.image_url || 'https://img.usecurling.com/p/600/600?q=product',
        platform: manualForm.platform,
        category: manualForm.category,
        niche: manualForm.niche,
        price: priceNum,
        promo_price: promoNum,
        commission_rate: rateNum,
        commission_amount: amountNum,
        sales_count: parseInt(manualForm.sales_count, 10) || 0,
        reviews_count: parseInt(manualForm.reviews_count, 10) || 0,
        rating: parseFloat(manualForm.rating) || 4.5,
        seller: manualForm.seller,
        product_url: manualForm.product_url,
        affiliate_url: manualForm.affiliate_url,
        competition_level: parseInt(manualForm.competition_level, 10) || 5,
        trends_score: parseInt(manualForm.trends_score, 10) || 7,
        demand_score: parseInt(manualForm.demand_score, 10) || 7,
        source: 'manual',
        metadata: {
          imported_at: new Date().toISOString(),
          future_api_ready: true,
        },
      })

      toast.success('Produto salvo com sucesso! O Score e a Análise de IA foram calculados.')
      navigate('/radar')
    } catch (err) {
      console.error('Error creating product manually:', err)
      toast.error('Erro ao salvar produto. Verifique os dados.')
    } finally {
      setManualLoading(false)
    }
  }

  // CSV File parsing
  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo no formato .CSV')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        toast.error('O arquivo CSV parece estar vazio ou não possui linhas de dados.')
        return
      }

      // Detect delimiter (comma or semicolon)
      const firstLine = lines[0]
      const delimiter = firstLine.includes(';') ? ';' : ','

      const headers = firstLine.split(delimiter).map((h) => h.replace(/^"|"$/g, '').trim())
      setCsvHeaders(headers)

      const rows: CsvRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const rowValues = lines[i].split(delimiter).map((v) => v.replace(/^"|"$/g, '').trim())
        const rowObj: CsvRow = {}
        headers.forEach((h, idx) => {
          rowObj[h] = rowValues[idx] || ''
        })
        rows.push(rowObj)
      }

      setCsvRows(rows)
      setCsvFile(file)

      // Auto-match headers by common names
      const initialMap: { [field: string]: string } = {}
      headers.forEach((h) => {
        const lower = h.toLowerCase()
        if (
          lower.includes('titulo') ||
          lower.includes('title') ||
          lower.includes('nome') ||
          lower.includes('produto')
        )
          initialMap.title = h
        if (lower === 'preco' || lower === 'price' || lower.includes('valor')) initialMap.price = h
        if (lower.includes('promo') || lower.includes('desconto')) initialMap.promo_price = h
        if (
          lower.includes('comissao') &&
          (lower.includes('%') || lower.includes('rate') || lower.includes('taxa'))
        )
          initialMap.commission_rate = h
        if (
          lower.includes('comissao') &&
          (lower.includes('r$') || lower.includes('valor') || lower.includes('amount'))
        )
          initialMap.commission_amount = h
        if (lower.includes('plataforma') || lower.includes('platform') || lower.includes('origem'))
          initialMap.platform = h
        if (lower.includes('categoria') || lower.includes('category')) initialMap.category = h
        if (lower.includes('vendas') || lower.includes('sales') || lower.includes('sold'))
          initialMap.sales_count = h
        if (
          lower.includes('avaliacoes') ||
          lower.includes('reviews') ||
          lower.includes('rating_count')
        )
          initialMap.reviews_count = h
        if (lower.includes('nota') || lower.includes('rating') || lower.includes('score'))
          initialMap.rating = h
        if (lower.includes('link') && !lower.includes('afiliado')) initialMap.product_url = h
        if (lower.includes('afiliado') || lower.includes('affiliate')) initialMap.affiliate_url = h
        if (lower.includes('imagem') || lower.includes('image') || lower.includes('foto'))
          initialMap.image_url = h
        if (lower.includes('vendedor') || lower.includes('seller') || lower.includes('loja'))
          initialMap.seller = h
      })

      setColumnMapping((prev) => ({ ...prev, ...initialMap }))
      setCsvStep('mapping')
      toast.success(`${rows.length} registros identificados no CSV!`)
    }

    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Perform Batch CSV Import
  const handleExecuteCsvImport = async () => {
    if (!columnMapping.title) {
      toast.error('Mapeie pelo menos a coluna "Título do Produto".')
      return
    }

    setCsvImporting(true)
    try {
      const itemsToCreate = csvRows.map((row) => {
        const title = row[columnMapping.title] || 'Produto sem título'
        const rawPrice = row[columnMapping.price]
          ? parseFloat(row[columnMapping.price].replace(',', '.'))
          : 0
        const rawPromo = row[columnMapping.promo_price]
          ? parseFloat(row[columnMapping.promo_price].replace(',', '.'))
          : rawPrice
        const rate = row[columnMapping.commission_rate]
          ? parseFloat(row[columnMapping.commission_rate].replace(',', '.'))
          : 10
        let commAmount = row[columnMapping.commission_amount]
          ? parseFloat(row[columnMapping.commission_amount].replace(',', '.'))
          : 0

        if (commAmount <= 0 && rate > 0 && rawPromo > 0) {
          commAmount = Math.round(rawPromo * (rate / 100) * 100) / 100
        }

        return {
          title,
          image_url:
            row[columnMapping.image_url] ||
            `https://img.usecurling.com/p/600/600?q=${encodeURIComponent(title.slice(0, 15))}`,
          platform: row[columnMapping.platform] || 'Shopee',
          category: row[columnMapping.category] || 'Geral',
          price: rawPrice || 99.9,
          promo_price: rawPromo || rawPrice || 79.9,
          commission_rate: rate || 12,
          commission_amount: commAmount || 10,
          sales_count: parseInt(row[columnMapping.sales_count], 10) || 100,
          reviews_count: parseInt(row[columnMapping.reviews_count], 10) || 20,
          rating: parseFloat(row[columnMapping.rating]) || 4.5,
          seller: row[columnMapping.seller] || 'Vendedor Parceiro',
          product_url: row[columnMapping.product_url] || '',
          affiliate_url: row[columnMapping.affiliate_url] || '',
          competition_level: 5,
          trends_score: 7,
          demand_score: 7,
          source: 'csv',
          metadata: {
            csv_source_file: csvFile?.name,
            raw_row: row,
          },
        }
      })

      const { created, errors } = await productsService.batchCreateProducts(itemsToCreate)
      toast.success(`${created} produtos importados e calculados com sucesso!`)
      if (errors > 0) {
        toast.warning(`${errors} produtos falharam durante a validação.`)
      }
      navigate('/radar')
    } catch (err) {
      console.error('Error importing CSV products:', err)
      toast.error('Erro na importação do lote.')
    } finally {
      setCsvImporting(false)
    }
  }

  // Sample CSV generator for download
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'titulo,plataforma,categoria,preco,preco_promocional,comissao_porcento,vendas,nota,avaliacoes,vendedor,link_produto,link_afiliado\n' +
      'Mini Projetor Smart LED 1080p,Shopee,Eletrônicos,349.90,279.90,14.5,3420,4.8,890,TechVibe,https://shopee.com.br/item1,https://shopee.com.br/afiliado1\n' +
      'Garrafa Térmica Digital LED,Mercado Livre,Cozinha & Casa,69.90,49.90,18.0,5120,4.6,1420,ShopFit,https://mercadolivre.com.br/item2,https://mercadolivre.com.br/afiliado2\n' +
      'Luminária Articulada Indução,Amazon,Decoração,159.00,129.90,12.0,1280,4.5,310,LuminaTech,https://amazon.com.br/item3,https://amzn.to/afiliado3'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'modelo_produtos_radar_ia.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#1E2232]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 font-bold">
            Fontes de Produtos
          </span>
          <span className="text-xs text-gray-400 font-mono">Shopee Manual + Link + CSV</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-7 h-7 text-[#00F2FF]" />
          Importar Produtos para o Radar
        </h1>
        <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
          Conecte a Shopee em modo manual e importe produtos por link. O Radar salva o marketplace, traz o produto para o catálogo e prepara análise, campanha e tracking.
        </p>
      </div>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="grid grid-cols-3 bg-[#12141F] p-1 border border-[#232738] rounded-2xl mb-6">
          <TabsTrigger
            value="link"
            className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2.5 rounded-xl gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Importar por Link
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2.5 rounded-xl gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Cadastro Manual Completo
          </TabsTrigger>
          <TabsTrigger
            value="csv"
            className="data-[state=active]:bg-[#1A1D2B] data-[state=active]:text-[#00E676] text-xs font-bold py-2.5 rounded-xl gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importação em Massa (CSV)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="m-0 space-y-6">
          <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Shopee — Conectar e importar por link</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${shopeeConnected ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30' : 'bg-[#EE4D2D]/10 text-[#FF765B] border-[#EE4D2D]/30'}`}>
                  {shopeeConnected ? 'CONECTADA' : 'MODO MANUAL'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Cole um link normal ou um link curto de afiliado da Shopee. O Radar ativa a Shopee Manual, tenta capturar os dados do produto, salva no catálogo e abre o Laboratório de Campanhas.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="https://shopee.com.br/... ou https://s.shopee.com.br/..."
                className="flex-1 h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF]"
              />
              <Button
                type="button"
                onClick={handleQuickImport}
                disabled={quickLoading}
                className="h-11 px-5 bg-gradient-to-r from-[#00F2FF] to-[#7000FF] text-[#0A0B10] font-bold"
              >
                {quickLoading ? 'Conectando & importando...' : 'Conectar Shopee e importar'}
              </Button>
            </div>
            <div className="text-[11px] text-gray-500">
              Links curtos s.shopee.com.br são preservados como link de afiliado quando possível. Se a Shopee limitar metadados, o Radar mantém o produto e pede somente os campos que faltarem.
            </div>
          </div>
        </TabsContent>

        {/* TAB 1: MANUAL ENTRY */}
        <TabsContent value="manual" className="m-0 space-y-6">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#212538]">
                <Info className="w-4 h-4 text-[#00F2FF]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Informações Básicas do Produto
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Título do Produto <span className="text-[#FF3D00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    placeholder="Ex: Mini Projetor Portátil Smart LED Full HD 1080p"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Platform */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Plataforma / Marketplace <span className="text-[#FF3D00]">*</span>
                  </label>
                  <select
                    value={manualForm.platform}
                    onChange={(e) => setManualForm({ ...manualForm, platform: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Mercado Livre">Mercado Livre</option>
                    <option value="Amazon">Amazon</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Hotmart">Hotmart</option>
                    <option value="Kiwify">Kiwify</option>
                    <option value="Braip">Braip</option>
                    <option value="AliExpress">AliExpress</option>
                    <option value="Shein">Shein</option>
                    <option value="Manual">Outra / Manual</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Categoria Principal <span className="text-[#FF3D00]">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    placeholder="Ex: Eletrônicos, Beleza, Cozinha, Moda..."
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Niche */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Nicho / Subcategoria Específica
                  </label>
                  <input
                    type="text"
                    value={manualForm.niche}
                    onChange={(e) => setManualForm({ ...manualForm, niche: e.target.value })}
                    placeholder="Ex: Home Cinema, Cabelos, Setup Minimalista..."
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Seller */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Nome da Loja / Vendedor
                  </label>
                  <input
                    type="text"
                    value={manualForm.seller}
                    onChange={(e) => setManualForm({ ...manualForm, seller: e.target.value })}
                    placeholder="Ex: Loja Oficial Brasil, TechStore..."
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    URL da Imagem do Produto
                  </label>
                  <input
                    type="text"
                    value={manualForm.image_url}
                    onChange={(e) => setManualForm({ ...manualForm, image_url: e.target.value })}
                    placeholder="https://... (deixe em branco para imagem automática)"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>
              </div>
            </div>

            {/* Financials & Commissions */}
            <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#212538]">
                <Info className="w-4 h-4 text-[#00E676]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  2. Preços, Comissão & Validação de Vendas
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Regular Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Preço Normal (R$)</label>
                  <input
                    type="text"
                    value={manualForm.price}
                    onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })}
                    placeholder="Ex: 199.90"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Promo Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Preço Promocional (R$) <span className="text-[#FF3D00]">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.promo_price}
                    onChange={(e) => setManualForm({ ...manualForm, promo_price: e.target.value })}
                    placeholder="Ex: 149.90"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Commission % */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#00E676]">
                    Comissão (%) <span className="text-[#FF3D00]">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.commission_rate}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, commission_rate: e.target.value })
                    }
                    placeholder="Ex: 15"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-[#00E676] font-mono font-bold focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                {/* Commission in R$ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#00E676]">
                    Comissão Estimada (R$)
                  </label>
                  <input
                    type="text"
                    value={manualForm.commission_amount}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, commission_amount: e.target.value })
                    }
                    placeholder="Auto-calculado se vazio"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00E676]"
                  />
                </div>

                {/* Sales Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Quantidade de Vendas
                  </label>
                  <input
                    type="text"
                    value={manualForm.sales_count}
                    onChange={(e) => setManualForm({ ...manualForm, sales_count: e.target.value })}
                    placeholder="Ex: 3400"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Reviews count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Número de Avaliações
                  </label>
                  <input
                    type="text"
                    value={manualForm.reviews_count}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, reviews_count: e.target.value })
                    }
                    placeholder="Ex: 890"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Nota do Produto (0 - 5.0)
                  </label>
                  <input
                    type="text"
                    value={manualForm.rating}
                    onChange={(e) => setManualForm({ ...manualForm, rating: e.target.value })}
                    placeholder="Ex: 4.8"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white font-mono focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                {/* Demand estimate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Procura / Tendência (1-10)
                  </label>
                  <select
                    value={manualForm.demand_score}
                    onChange={(e) => setManualForm({ ...manualForm, demand_score: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  >
                    <option value="9">9 - 10 (Explosivo / Viral)</option>
                    <option value="8">8 (Alta Procura)</option>
                    <option value="7">7 (Demanda Estável)</option>
                    <option value="5">5 (Média)</option>
                    <option value="3">3 (Baixa)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#212538]">
                <Info className="w-4 h-4 text-[#7000FF]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. Links de Destino & Divulgação
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Link Direto do Produto na Loja
                  </label>
                  <input
                    type="text"
                    value={manualForm.product_url}
                    onChange={(e) => setManualForm({ ...manualForm, product_url: e.target.value })}
                    placeholder="https://shopee.com.br/item-exemplo"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#00F2FF]">
                    Seu Link de Afiliado (com tag de rastreio)
                  </label>
                  <input
                    type="text"
                    value={manualForm.affiliate_url}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, affiliate_url: e.target.value })
                    }
                    placeholder="https://shopee.com.br/afiliado/link-unico-123"
                    className="w-full h-11 px-4 rounded-xl bg-[#0D0F18] border border-[#2A2F45] text-xs text-[#00F2FF] focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/radar')}
                className="border-[#2A2F45] text-xs text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={manualLoading}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-95 text-[#0A0B10] font-bold text-xs gap-2 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
              >
                <Sparkles className="w-4 h-4" />
                {manualLoading ? 'Processando & Calculando IA...' : 'Cadastrar e Analisar com IA'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: CSV IMPORT */}
        <TabsContent value="csv" className="m-0 space-y-6">
          {csvStep === 'upload' && (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="p-12 rounded-3xl bg-[#141622] border-2 border-dashed border-[#2E3550] hover:border-[#00F2FF] transition-all text-center space-y-4 cursor-pointer"
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div className="w-16 h-16 rounded-2xl bg-[#00F2FF]/10 text-[#00F2FF] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Arraste seu arquivo CSV aqui ou clique para selecionar
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Suporta CSVs exportados de plataformas de afiliados, planilhas do Excel ou
                    Google Sheets (delimitados por vírgula ou ponto-e-vírgula).
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#2E3550] text-xs text-[#00F2FF]"
                >
                  Selecionar Arquivo do Computador
                </Button>
              </div>

              {/* Sample Download Card */}
              <div className="p-5 rounded-2xl bg-[#10121D] border border-[#232738] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#00E676]" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Modelo de Planilha CSV</h4>
                    <p className="text-[11px] text-gray-400">
                      Baixe o modelo pré-formatado com cabeçalhos de exemplo para agilizar o
                      preenchimento.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadSampleCsv}
                  size="sm"
                  variant="outline"
                  className="border-[#2A2F45] text-xs text-white hover:border-[#00E676]"
                >
                  Baixar Modelo .CSV
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Mapping & Preview */}
          {csvStep === 'mapping' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#212538]">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Mapeamento de Colunas ({csvRows.length} linhas detectadas)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Associe os cabeçalhos do seu arquivo CSV com os campos oficiais do Radar de
                      Produtos.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setCsvStep('upload')
                      setCsvFile(null)
                    }}
                    variant="outline"
                    size="sm"
                    className="border-[#2A2F45] text-xs text-red-400 hover:text-red-300"
                  >
                    Trocar Arquivo
                  </Button>
                </div>

                {/* Mapping Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'title', label: 'Título do Produto *', required: true },
                    { key: 'promo_price', label: 'Preço / Preço Promocional' },
                    { key: 'commission_rate', label: 'Comissão (%)' },
                    { key: 'commission_amount', label: 'Comissão em Dinheiro (R$)' },
                    { key: 'platform', label: 'Plataforma (Shopee, ML, etc.)' },
                    { key: 'category', label: 'Categoria' },
                    { key: 'sales_count', label: 'Qtd de Vendas' },
                    { key: 'rating', label: 'Nota / Avaliação (0-5)' },
                    { key: 'reviews_count', label: 'Qtd de Avaliações' },
                    { key: 'product_url', label: 'Link do Produto' },
                    { key: 'affiliate_url', label: 'Link de Afiliado' },
                    { key: 'image_url', label: 'URL da Imagem' },
                    { key: 'seller', label: 'Vendedor / Loja' },
                  ].map((field) => (
                    <div
                      key={field.key}
                      className="space-y-1.5 p-3 rounded-xl bg-[#0D0F18] border border-[#232738]"
                    >
                      <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>{field.label}</span>
                        {field.required && (
                          <span className="text-[#FF3D00] text-[10px]">Obrigatório</span>
                        )}
                      </label>
                      <select
                        value={columnMapping[field.key] || ''}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full h-9 px-3 rounded-lg bg-[#141724] border border-[#2E3550] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                      >
                        <option value="">-- Não Mapeado --</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table (Top 3 items) */}
              <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Pré-visualização das 3 primeiras linhas
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0D0F18] text-gray-400 border-b border-[#232738]">
                      <tr>
                        <th className="p-2.5">Título</th>
                        <th className="p-2.5">Plataforma</th>
                        <th className="p-2.5">Preço</th>
                        <th className="p-2.5">Comissão</th>
                        <th className="p-2.5">Vendas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2030] text-gray-200">
                      {csvRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#181B2B]">
                          <td className="p-2.5 font-bold truncate max-w-[200px]">
                            {row[columnMapping.title] || row[csvHeaders[0]] || '-'}
                          </td>
                          <td className="p-2.5">{row[columnMapping.platform] || 'Shopee'}</td>
                          <td className="p-2.5 font-bold text-white">
                            R$ {row[columnMapping.promo_price] || row[columnMapping.price] || '-'}
                          </td>
                          <td className="p-2.5 text-[#00E676]">
                            {row[columnMapping.commission_rate]
                              ? `${row[columnMapping.commission_rate]}%`
                              : '-'}
                          </td>
                          <td className="p-2.5">{row[columnMapping.sales_count] || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => setCsvStep('upload')}
                  variant="outline"
                  className="border-[#2A2F45] text-xs text-gray-300"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleExecuteCsvImport}
                  disabled={csvImporting || !columnMapping.title}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] hover:opacity-95 text-[#0A0B10] font-bold text-xs gap-2 shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                >
                  <Sparkles className="w-4 h-4" />
                  {csvImporting
                    ? 'Importando e Calculando Scores...'
                    : `Importar ${csvRows.length} Produtos com IA`}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
