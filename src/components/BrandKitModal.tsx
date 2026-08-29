import React, { useState, useEffect } from 'react'
import { Palette, Sparkles, Save, CheckCircle2, Type, AtSign, Tag, Eye, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { creativeService } from '@/services/creatives'
import type { BrandKitRecord } from '@/types/creative'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BrandKitModalProps {
  isOpen: boolean
  onClose: () => void
  onBrandKitSaved?: (kit: BrandKitRecord) => void
}

export function BrandKitModal({ isOpen, onClose, onBrandKitSaved }: BrandKitModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [kit, setKit] = useState<Partial<BrandKitRecord>>({
    brand_name: 'Achados do Radar',
    logo_url: '',
    primary_color: '#00F2FF',
    secondary_color: '#7000FF',
    accent_color: '#FF3D00',
    background_color: '#0A0B10',
    text_color: '#FFFFFF',
    font_family: 'Inter',
    visual_style: 'modern_cyber',
    tone_of_voice: 'direto_persuasivo',
    social_handle: '@achadosdoradar',
    signature_tagline: 'Testado & Aprovado pelo Radar IA',
  })

  useEffect(() => {
    if (!isOpen) return
    const fetchKit = async () => {
      setLoading(true)
      try {
        const existing = await creativeService.getBrandKit()
        if (existing) {
          setKit(existing)
        }
      } catch (e) {
        console.error('Error loading brand kit:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchKit()
  }, [isOpen])

  const handleSave = async () => {
    if (!kit.brand_name?.trim()) {
      toast.error('Informe o nome da marca')
      return
    }

    setSaving(true)
    try {
      const saved = await creativeService.saveBrandKit(kit)
      setKit(saved)
      if (onBrandKitSaved) onBrandKitSaved(saved)
      toast.success('Identidade de marca salva com sucesso!')
      onClose()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar Brand Kit'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#121420] border border-[#2B3047] shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 border-b border-[#232738] flex items-center justify-between bg-[#161928]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)]">
              <Palette className="w-5 h-5 text-[#0A0B10]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Minha Marca (Brand Kit)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
                  FASE 4
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Personalize cores, tipografia, arroba e logo aplicados automaticamente aos seus
                criativos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202538] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Info Banner */}
          <div className="p-3.5 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 flex items-start gap-2.5 text-gray-300">
            <Info className="w-4 h-4 text-[#00F2FF] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Opcional e Flexível:</strong>
              Você não é obrigado a usar marca própria para rodar anúncios. Se preencher, o Estúdio
              Criativo padroniza suas artes mantendo consistência visual de afiliado profissional.
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Nome da Marca / Perfil</Label>
              <Input
                value={kit.brand_name || ''}
                onChange={(e) => setKit({ ...kit, brand_name: e.target.value })}
                placeholder="Ex: Achados Incríveis, Tech Deals, etc."
                className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">@ Perfil das Redes Sociais</Label>
              <div className="relative">
                <AtSign className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={kit.social_handle || ''}
                  onChange={(e) => setKit({ ...kit, social_handle: e.target.value })}
                  placeholder="@seuperfildeafiliado"
                  className="h-9 pl-9 bg-[#0A0B10] border-[#252A3D] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Tagline / Signature */}
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">Assinatura / Slogan no Rodapé</Label>
            <Input
              value={kit.signature_tagline || ''}
              onChange={(e) => setKit({ ...kit, signature_tagline: e.target.value })}
              placeholder="Ex: Testado e aprovado • Links verificados"
              className="h-9 bg-[#0A0B10] border-[#252A3D] text-xs"
            />
          </div>

          {/* Colors Matrix */}
          <div className="space-y-2">
            <Label className="text-gray-300 text-xs flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#00F2FF]" />
              Paleta de Cores da Marca
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: 'Primária', key: 'primary_color', default: '#00F2FF' },
                { label: 'Secundária', key: 'secondary_color', default: '#7000FF' },
                { label: 'Destaque/CTA', key: 'accent_color', default: '#FF3D00' },
                { label: 'Fundo', key: 'background_color', default: '#0A0B10' },
                { label: 'Texto', key: 'text_color', default: '#FFFFFF' },
              ].map((c) => (
                <div
                  key={c.key}
                  className="p-2.5 rounded-xl bg-[#0E1018] border border-[#212638] space-y-1.5"
                >
                  <span className="text-[10px] text-gray-400 block truncate">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(kit as Record<string, string>)[c.key] || c.default}
                      onChange={(e) => setKit({ ...kit, [c.key]: e.target.value })}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-gray-300">
                      {(kit as Record<string, string>)[c.key] || c.default}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Style & Font Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Fonte Principal</Label>
              <select
                value={kit.font_family || 'Inter'}
                onChange={(e) => setKit({ ...kit, font_family: e.target.value })}
                className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] px-3 text-xs text-white focus:outline-none focus:border-[#00F2FF]"
              >
                <option value="Inter">Inter (Moderna & Neutra)</option>
                <option value="Montserrat">Montserrat (Impacto Publicitário)</option>
                <option value="Poppins">Poppins (Geométrica & Amigável)</option>
                <option value="Roboto">Roboto (Clara & Direta)</option>
                <option value="Syne">Syne (Estilizada & Cyber)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Estilo Visual</Label>
              <select
                value={kit.visual_style || 'modern_cyber'}
                onChange={(e) => setKit({ ...kit, visual_style: e.target.value })}
                className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] px-3 text-xs text-white focus:outline-none focus:border-[#00F2FF]"
              >
                <option value="modern_cyber">High-Tech Cyber (Neon / Alto Contraste)</option>
                <option value="high_converting_bold">
                  Alta Conversão Direta (Destaques Fortes)
                </option>
                <option value="clean_aesthetic">Clean & Minimalista (Aesthetic)</option>
                <option value="organic_creator">Orgânico / UGC (Estilo Criador Real)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Tom de Voz</Label>
              <select
                value={kit.tone_of_voice || 'direto_persuasivo'}
                onChange={(e) => setKit({ ...kit, tone_of_voice: e.target.value })}
                className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] px-3 text-xs text-white focus:outline-none focus:border-[#00F2FF]"
              >
                <option value="direto_persuasivo">Direto & Persuasivo (Foco em Solução)</option>
                <option value="consultivo">Consultivo & Técnico (Autoridade)</option>
                <option value="descontraido_humor">Descontraído & Viral (UGC)</option>
                <option value="urgencia_oferta">Alerta de Oportunidade Real</option>
              </select>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-xl border border-[#262B3F] bg-[#0A0B10] space-y-2">
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#00F2FF]" /> Pré-visualização da Identidade
            </div>
            <div
              className="p-4 rounded-lg flex items-center justify-between border"
              style={{
                backgroundColor: kit.background_color || '#0A0B10',
                borderColor: kit.primary_color || '#00F2FF',
                color: kit.text_color || '#FFFFFF',
                fontFamily: kit.font_family || 'sans-serif',
              }}
            >
              <div>
                <div
                  className="font-bold text-sm tracking-wide"
                  style={{ color: kit.primary_color }}
                >
                  {kit.brand_name || 'Nome da Marca'}
                </div>
                <div className="text-[11px] opacity-80">{kit.signature_tagline}</div>
              </div>
              <div className="text-right">
                <span
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold inline-block"
                  style={{ backgroundColor: kit.accent_color || '#FF3D00', color: '#FFFFFF' }}
                >
                  VER OFERTA
                </span>
                <div className="text-[10px] font-mono opacity-60 mt-1">{kit.social_handle}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#232738] bg-[#161928] flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#2B3047] text-gray-300"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-[#0A0B10] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Identidade
          </Button>
        </div>
      </div>
    </div>
  )
}
