import React, { useState, useRef } from 'react'
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Type,
  Palette,
  ShieldAlert,
  Layers,
  Image as ImageIcon,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type {
  CreativeRecord,
  CreativeFormatType,
  CreativeTextLayers,
  BrandKitRecord,
} from '@/types/creative'
import { CREATIVE_FORMAT_SPECS } from '@/types/creative'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VisualCanvasEditorProps {
  creative: Partial<CreativeRecord>
  formatSpec: (typeof CREATIVE_FORMAT_SPECS)[0]
  brandKit?: BrandKitRecord | null
  onChangeTextLayers: (layers: CreativeTextLayers) => void
  onSaveVersion: (summary: string) => void
}

export function VisualCanvasEditor({
  creative,
  formatSpec,
  brandKit,
  onChangeTextLayers,
  onSaveVersion,
}: VisualCanvasEditorProps) {
  const [copied, setCopied] = useState(false)
  const [versionNote, setVersionNote] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  const textLayers: CreativeTextLayers = creative.text_layers || {
    headline: 'Descubra a Solução Prática',
    subheadline: 'O achado que economiza seu tempo todos os dias',
    benefit_pill: 'Praticidade & Alta Eficiência',
    cta_text: 'Conferir na Bio / Ver Detalhes',
    badge_tag: 'Destaque no Radar',
    price_text: 'R$ 89,90',
    promo_price_text: 'R$ 49,90',
    show_price: true,
    show_badge: true,
    show_subheadline: true,
    show_benefit: true,
    show_logo: true,
    show_disclaimer: creative.is_ai_generated || false,
    text_align: 'center',
    text_density_status: 'ideal',
  }

  const updateField = (field: keyof CreativeTextLayers, value: unknown) => {
    const updated = {
      ...textLayers,
      [field]: value,
    }
    onChangeTextLayers(updated)
  }

  // Calculate text density
  const totalChars =
    (textLayers.headline?.length || 0) +
    (textLayers.subheadline?.length || 0) +
    (textLayers.benefit_pill?.length || 0) +
    (textLayers.cta_text?.length || 0)

  const isTextHeavy = totalChars > 160

  const primaryColor = brandKit?.primary_color || '#00F2FF'
  const secondaryColor = brandKit?.secondary_color || '#7000FF'
  const accentColor = brandKit?.accent_color || '#FF3D00'
  const brandName = brandKit?.brand_name || 'Radar IA'
  const socialHandle = brandKit?.social_handle || '@achados'

  // Image display: prefer generated/active image_url, fallback to product_image_url
  const activeImage =
    creative.image_url ||
    creative.product_image_url ||
    'https://img.usecurling.com/p/600/600?q=product'

  const handleCopyTexts = () => {
    const fullText = `[HEADLINE]: ${textLayers.headline}\n[SUBHEADLINE]: ${textLayers.subheadline}\n[BENEFÍCIO]: ${textLayers.benefit_pill}\n[CTA]: ${textLayers.cta_text}\n[PREÇO]: ${textLayers.price_text}`
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast.success('Textos do criativo copiados para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Interactive Live Canvas Preview */}
      <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0E1018] border border-[#232738] relative min-h-[520px]">
        {/* Canvas Format Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#181B2A] text-[#00F2FF] border border-[#2B3048]">
            {formatSpec.name} ({formatSpec.ratio})
          </span>
          {creative.is_ai_generated ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#C084FC] border border-[#7000FF]/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00F2FF]" /> Imagem IA (OpenAI)
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
              Foto Original do Produto
            </span>
          )}
        </div>

        {/* The Live Render Canvas */}
        <div
          ref={canvasRef}
          className={cn(
            'relative overflow-hidden rounded-xl border border-[#3A405C] shadow-2xl transition-all duration-300 flex flex-col justify-between select-none group',
            formatSpec.ratio === '1:1' && 'w-full max-w-[420px] aspect-square',
            formatSpec.ratio === '4:5' && 'w-full max-w-[380px] aspect-[4/5]',
            formatSpec.ratio === '9:16' && 'w-full max-w-[310px] aspect-[9/16]',
            formatSpec.ratio === '16:9' && 'w-full max-w-[480px] aspect-[16/9]',
            formatSpec.ratio === '2:3' && 'w-full max-w-[340px] aspect-[2/3]',
          )}
          style={{
            fontFamily: brandKit?.font_family || 'sans-serif',
          }}
        >
          {/* Background Image with Cinematic Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={activeImage}
              alt={creative.product_title || 'Produto'}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            {/* Gradient Dimmer for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/90 pointer-events-none" />
          </div>

          {/* TOP LAYER: Badge & Brand Handle */}
          <div className="relative z-10 p-4 flex items-start justify-between gap-2">
            {textLayers.show_badge && (
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-lg backdrop-blur-md"
                style={{
                  backgroundColor: `${primaryColor}25`,
                  color: primaryColor,
                  border: `1px solid ${primaryColor}60`,
                }}
              >
                {textLayers.badge_tag || 'DESTAQUE NO RADAR'}
              </span>
            )}

            {textLayers.show_logo && (
              <div className="text-[10px] font-mono font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md">
                {socialHandle}
              </div>
            )}
          </div>

          {/* MIDDLE LAYER: Visual Hierarchy (GANCHO → BENEFÍCIO) */}
          <div
            className={cn(
              'relative z-10 px-4 py-2 space-y-2',
              textLayers.text_align === 'center' && 'text-center',
              textLayers.text_align === 'left' && 'text-left',
              textLayers.text_align === 'right' && 'text-right',
            )}
          >
            {/* 1. Gancho / Headline */}
            <h2 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] tracking-tight">
              {textLayers.headline}
            </h2>

            {/* 2. Subheadline */}
            {textLayers.show_subheadline && (
              <p className="text-xs text-gray-200 font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] line-clamp-2">
                {textLayers.subheadline}
              </p>
            )}

            {/* 3. Benefício Pill */}
            {textLayers.show_benefit && (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold shadow-md backdrop-blur-md',
                  textLayers.text_align === 'center' && 'mx-auto',
                )}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  border: `1px solid ${secondaryColor}`,
                  color: '#FFFFFF',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>{textLayers.benefit_pill}</span>
              </div>
            )}
          </div>

          {/* BOTTOM LAYER: Preço & CTA */}
          <div className="relative z-10 p-4 space-y-2.5 bg-gradient-to-t from-black via-black/80 to-transparent">
            {/* Price Row */}
            {textLayers.show_price && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-gray-400 line-through font-mono">
                    {textLayers.price_text}
                  </span>
                  <span className="text-sm sm:text-base font-black text-[#00E676] font-mono">
                    {textLayers.promo_price_text || textLayers.price_text}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-gray-400 uppercase">
                  Preço Confirmado
                </span>
              </div>
            )}

            {/* CTA Button */}
            <div
              className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-black tracking-wide shadow-xl transition-transform hover:scale-102 flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF',
                boxShadow: `0 0 15px ${accentColor}50`,
              }}
            >
              <span>{textLayers.cta_text}</span>
            </div>

            {/* Conceptual AI disclaimer if generated */}
            {(textLayers.show_disclaimer || creative.is_ai_generated) && (
              <div className="text-[8px] text-center font-mono text-gray-400">
                Representação conceitual gerada por IA.
              </div>
            )}
          </div>
        </div>

        {/* Quick Canvas Toolbar */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyTexts}
            className="h-8 text-xs border-[#2B3047] bg-[#141624] text-gray-300 hover:text-white gap-1.5"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#00E676]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copiado!' : 'Copiar Textos'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.info('Para exportar, clique em "Baixar Kit Criativo" na barra superior.')
            }}
            className="h-8 text-xs border-[#2B3047] bg-[#141624] text-gray-300 hover:text-white gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Imagem
          </Button>
        </div>
      </div>

      {/* RIGHT: Essential Controls & Text Hierarchy Customizer */}
      <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-5 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#00F2FF]" />
            <h3 className="text-sm font-bold text-white">Hierarquia de Textos na Arte</h3>
          </div>
          {isTextHeavy ? (
            <Badge className="bg-[#FF3D00]/20 text-[#FF3D00] border-[#FF3D00]/40 text-[9px]">
              Texto Excessivo
            </Badge>
          ) : (
            <Badge className="bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40 text-[9px]">
              Densidade Ideal
            </Badge>
          )}
        </div>

        {/* 1. Gancho / Headline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300 text-xs font-bold">
              1. Gancho / Headline Principal
            </Label>
            <span className="text-[10px] font-mono text-gray-500">
              {textLayers.headline?.length || 0}/60
            </span>
          </div>
          <Input
            value={textLayers.headline || ''}
            onChange={(e) => updateField('headline', e.target.value)}
            placeholder="Gancho de parada de scroll..."
            className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs text-white"
          />
        </div>

        {/* 2. Subheadline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300 text-xs flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={textLayers.show_subheadline !== false}
                onChange={(e) => updateField('show_subheadline', e.target.checked)}
                className="rounded border-[#252A3D]"
              />
              2. Subheadline / Dor Rápida
            </Label>
          </div>
          {textLayers.show_subheadline !== false && (
            <Input
              value={textLayers.subheadline || ''}
              onChange={(e) => updateField('subheadline', e.target.value)}
              placeholder="Complemento curto de contexto..."
              className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs text-white"
            />
          )}
        </div>

        {/* 3. Benefício Principal */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={textLayers.show_benefit !== false}
              onChange={(e) => updateField('show_benefit', e.target.checked)}
              className="rounded border-[#252A3D]"
            />
            3. Benefício Comprovado
          </Label>
          {textLayers.show_benefit !== false && (
            <Input
              value={textLayers.benefit_pill || ''}
              onChange={(e) => updateField('benefit_pill', e.target.value)}
              placeholder="Ex: Praticidade & Alta Durabilidade"
              className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs text-white"
            />
          )}
        </div>

        {/* 4. Preço e Promoção */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={textLayers.show_price !== false}
              onChange={(e) => updateField('show_price', e.target.checked)}
              className="rounded border-[#252A3D]"
            />
            4. Exibir Preço / Promoção
          </Label>
          {textLayers.show_price !== false && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={textLayers.price_text || ''}
                onChange={(e) => updateField('price_text', e.target.value)}
                placeholder="Preço De: R$ 89,90"
                className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs"
              />
              <Input
                value={textLayers.promo_price_text || ''}
                onChange={(e) => updateField('promo_price_text', e.target.value)}
                placeholder="Por: R$ 49,90"
                className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs text-[#00E676] font-bold"
              />
            </div>
          )}
        </div>

        {/* 5. CTA e Selo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-gray-300 text-xs">5. Texto do CTA</Label>
            <Input
              value={textLayers.cta_text || ''}
              onChange={(e) => updateField('cta_text', e.target.value)}
              placeholder="Ex: Conferir na Bio"
              className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300 text-xs">Selo / Tag Superior</Label>
            <Input
              value={textLayers.badge_tag || ''}
              onChange={(e) => updateField('badge_tag', e.target.value)}
              placeholder="Ex: Achado do Mês"
              className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs"
            />
          </div>
        </div>

        {/* Alignment & Layout toggles */}
        <div className="pt-2 border-t border-[#232738] flex items-center justify-between">
          <span className="text-gray-400">Alinhamento do Texto:</span>
          <div className="flex items-center gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <Button
                key={align}
                size="sm"
                variant="outline"
                onClick={() => updateField('text_align', align)}
                className={cn(
                  'h-7 px-2.5 text-[10px] border-[#252A3D]',
                  textLayers.text_align === align
                    ? 'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/50'
                    : 'text-gray-400',
                )}
              >
                {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
              </Button>
            ))}
          </div>
        </div>

        {/* Version Save Action */}
        <div className="pt-3 border-t border-[#232738] space-y-2">
          <Label className="text-gray-300 text-xs">Salvar como Nova Versão no Histórico</Label>
          <div className="flex items-center gap-2">
            <Input
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="Ex: Ajustei a headline para ser mais curta..."
              className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs"
            />
            <Button
              size="sm"
              onClick={() => {
                onSaveVersion(versionNote || 'Ajustes visuais no editor')
                setVersionNote('')
              }}
              className="h-9 px-3 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs flex-shrink-0"
            >
              Salvar V{(creative.current_version || 1) + 1}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
