import React, { useState } from 'react'
import {
  FolderArchive,
  Image as ImageIcon,
  Sparkles,
  Download,
  ExternalLink,
  History,
  Layers,
  Copy,
  Trash2,
  RotateCcw,
  Tag,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CreativeRecord, CreativeVersionRecord, CreativeAssetRecord } from '@/types/creative'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreativeLibraryAndVersionsProps {
  creative: Partial<CreativeRecord>
  versions: CreativeVersionRecord[]
  assets: CreativeAssetRecord[]
  onRestoreVersion: (version: CreativeVersionRecord) => void
  onExportKit: () => void
}

export function CreativeLibraryAndVersions({
  creative,
  versions,
  assets,
  onRestoreVersion,
  onExportKit,
}: CreativeLibraryAndVersionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'assets' | 'versions'>('assets')
  const [selectedVersion, setSelectedVersion] = useState<CreativeVersionRecord | null>(null)

  return (
    <div className="space-y-6 text-xs">
      {/* Sub navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141624] border border-[#232738]">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveSubTab('assets')}
            className={cn(
              'h-8 px-3 rounded-xl border-[#2A2F45] text-xs gap-1.5',
              activeSubTab === 'assets'
                ? 'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/50 font-bold'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            Biblioteca de Assets ({assets.length})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveSubTab('versions')}
            className={cn(
              'h-8 px-3 rounded-xl border-[#2A2F45] text-xs gap-1.5',
              activeSubTab === 'versions'
                ? 'bg-[#7000FF]/20 text-[#C084FC] border-[#7000FF]/50 font-bold'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <History className="w-3.5 h-3.5" />
            Histórico de Versões ({versions.length || 1})
          </Button>
        </div>

        <Button
          size="sm"
          onClick={onExportKit}
          className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
        >
          <Download className="w-4 h-4" />
          Exportar Kit Completo Estruturado
        </Button>
      </div>

      {/* SUBTAB 1: ASSETS LIBRARY */}
      {activeSubTab === 'assets' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0E1018] border border-[#232738] flex items-center justify-between text-gray-400">
            <span>
              Cada asset sabe exatamente a qual <strong>Produto</strong>, <strong>Campanha</strong>,{' '}
              <strong>Variação</strong> e <strong>Formato</strong> pertence.
            </span>
            <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
              Auto-Indexado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Primary / Active Image Asset */}
            <div className="p-3.5 rounded-2xl bg-[#121420] border border-[#232738] space-y-3 group hover:border-[#00F2FF]/50 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#0A0B10] border border-[#212638]">
                  <img
                    src={
                      creative.image_url ||
                      creative.product_image_url ||
                      'https://img.usecurling.com/p/300/300?q=product'
                    }
                    alt="Asset ativo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-2 left-2">
                    {creative.is_ai_generated ? (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#7000FF]/80 text-white border border-[#7000FF] backdrop-blur-md">
                        IA (OpenAI)
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E676]/80 text-[#0A0B10] border border-[#00E676] backdrop-blur-md">
                        Original
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-white text-xs truncate">
                    {creative.title || 'Arte Principal do Anúncio'}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">
                    Formato: {creative.aspect_ratio || '1:1'} • Variação{' '}
                    {creative.version_letter || 'A'}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(creative.image_url || creative.product_image_url, '_blank')
                }}
                className="w-full h-7 text-[10px] border-[#252A3D] bg-[#0A0B10] text-gray-300 gap-1 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                Visualizar Imagem
              </Button>
            </div>

            {/* Original Product Image if distinct */}
            {creative.product_image_url && creative.product_image_url !== creative.image_url && (
              <div className="p-3.5 rounded-2xl bg-[#121420] border border-[#232738] space-y-3 group hover:border-[#00F2FF]/50 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#0A0B10] border border-[#212638]">
                    <img
                      src={creative.product_image_url}
                      alt="Foto original"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#00E676]/80 text-[#0A0B10] backdrop-blur-md">
                        Foto Real do Produto
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-white text-xs truncate">
                      Referência Original do Fornecedor
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">
                      Garantia de Fidelidade Visual
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(creative.product_image_url, '_blank')}
                  className="w-full h-7 text-[10px] border-[#252A3D] bg-[#0A0B10] text-gray-300 gap-1 hover:text-white"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visualizar Original
                </Button>
              </div>
            )}

            {/* Other tracked assets */}
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-3.5 rounded-2xl bg-[#121420] border border-[#232738] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#0A0B10] border border-[#212638]">
                    <img
                      src={asset.file_url}
                      alt={asset.format_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 backdrop-blur-md">
                        {asset.format_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-white truncate">{asset.format_name}</div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(asset.file_url, '_blank')}
                  className="w-full h-7 text-[10px] border-[#252A3D] bg-[#0A0B10] text-gray-300 gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir Asset
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: VERSIONS HISTORY (V1, V2, V3...) */}
      {activeSubTab === 'versions' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0E1018] border border-[#232738] text-gray-400 flex items-center justify-between">
            <span>
              Ao regenerar ou editar, o sistema nunca sobrescreve seu criativo — cria versões
              históricas (V1, V2, V3...) permitindo comparar e restaurar.
            </span>
            <span className="text-[10px] font-mono text-[#00F2FF]">
              Versão Atual: V{creative.current_version || 1}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {versions.length === 0 ? (
              <div className="col-span-2 p-8 text-center rounded-2xl bg-[#121420] border border-[#232738] text-gray-400">
                Apenas a versão inicial V1 foi gerada. Ajustes feitos no editor e salvos criarão V2,
                V3 automaticamente.
              </div>
            ) : (
              versions.map((ver) => (
                <div
                  key={ver.id || ver.version_number}
                  className={cn(
                    'p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3',
                    ver.version_number === creative.current_version
                      ? 'bg-[#181B2A] border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                      : 'bg-[#121420] border-[#232738]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0A0B10] border border-[#232738] flex-shrink-0">
                        <img
                          src={
                            ver.image_url ||
                            creative.image_url ||
                            'https://img.usecurling.com/p/100/100?q=product'
                          }
                          alt="Thumb versão"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            V{ver.version_number}
                          </span>
                          {ver.version_number === creative.current_version && (
                            <Badge className="bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/40 text-[9px]">
                              Ativa
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 line-clamp-1">
                          {ver.change_summary || ver.version_tag || 'Versão do criativo'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10px] text-gray-500">
                      Score: <strong className="text-[#00F2FF]">{ver.creative_score || 85}</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0A0B10] border border-[#1E2232] text-[10px] font-mono space-y-1">
                    <div className="text-gray-300 truncate">
                      <strong>Headline: </strong>
                      {ver.text_layers?.headline ||
                        creative.text_layers?.headline ||
                        'Gancho principal'}
                    </div>
                    <div className="text-gray-400 truncate">
                      <strong>CTA: </strong>
                      {ver.text_layers?.cta_text ||
                        creative.text_layers?.cta_text ||
                        'Ver Detalhes'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#232738]">
                    <span className="text-[10px] font-mono text-gray-500">
                      {new Date(ver.created || Date.now()).toLocaleString('pt-BR')}
                    </span>

                    {ver.version_number !== creative.current_version && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestoreVersion(ver)}
                        className="h-7 text-[10px] border-[#2B3047] bg-[#141624] text-gray-300 hover:text-white gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar esta Versão
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
