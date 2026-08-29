import React, { useState } from 'react'
import {
  Film,
  Sparkles,
  Play,
  Clock,
  Video,
  Mic,
  Subtitles,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { StoryboardScene } from '@/types/creative'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VideoStoryboardTabProps {
  scenes: StoryboardScene[]
  narrationScript: string
  subtitlesText: string
  totalDuration: number
  retentionTips?: string
  onChangeScenes: (scenes: StoryboardScene[]) => void
  onChangeNarration: (text: string) => void
  onChangeSubtitles: (text: string) => void
  onRegenerateStoryboard: () => void
  isGenerating?: boolean
}

export function VideoStoryboardTab({
  scenes,
  narrationScript,
  subtitlesText,
  totalDuration,
  retentionTips,
  onChangeScenes,
  onChangeNarration,
  onChangeSubtitles,
  onRegenerateStoryboard,
  isGenerating = false,
}: VideoStoryboardTabProps) {
  const [copiedNarration, setCopiedNarration] = useState(false)
  const [copiedSubs, setCopiedSubs] = useState(false)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0)

  const handleUpdateScene = (index: number, field: keyof StoryboardScene, val: unknown) => {
    const updated = [...scenes]
    updated[index] = {
      ...updated[index],
      [field]: val,
    }
    onChangeScenes(updated)
  }

  const handleCopyNarration = () => {
    navigator.clipboard.writeText(narrationScript)
    setCopiedNarration(true)
    toast.success('Roteiro de narração copiado!')
    setTimeout(() => setCopiedNarration(false), 2000)
  }

  const handleCopySubs = () => {
    navigator.clipboard.writeText(subtitlesText)
    setCopiedSubs(true)
    toast.success('Legendas sincronizadas copiadas!')
    setTimeout(() => setCopiedSubs(false), 2000)
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Top Banner: Video Engine Status (Strictly Honest: Video Generator Not Configured) */}
      <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,242,255,0.25)]">
            <Film className="w-5 h-5 text-[#0A0B10]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-white">
                Storyboard & Roteiro Visual de Vídeo Curto
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/30 font-bold">
                ESTRUTURA AUDIOVISUAL
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Vídeos curtos de 9:16 (TikTok, Reels, YouTube Shorts) divididos em cenas com segundo a
              segundo, enquadramento e narração.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={onRegenerateStoryboard}
          disabled={isGenerating}
          className="h-9 px-4 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(112,0,255,0.3)] flex-shrink-0"
        >
          {isGenerating ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#00F2FF]" />
          )}
          Regenerar Storyboard IA
        </Button>
      </div>

      {/* Honest Provider Disclosure Box */}
      <div className="p-3.5 rounded-xl bg-[#0E1018] border border-[#252A3D] flex items-center justify-between gap-3 text-gray-400">
        <div className="flex items-center gap-2 text-[11px]">
          <AlertCircle className="w-4 h-4 text-[#00F2FF] flex-shrink-0" />
          <span>
            <strong>Geração Automática de Vídeo:</strong> Ainda não configurada por API. O
            storyboard técnico, textos na tela e roteiro de locução estão prontos para gravação e
            edição.
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-[#161924] px-2 py-1 rounded border border-[#232738] flex-shrink-0">
          Vídeo Engine: Storyboard Mode
        </span>
      </div>

      {/* Scenes Timeline View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-[#00F2FF]" />
            Timeline de Cenas do Vídeo ({scenes.length} Cenas • {totalDuration || 30}s)
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {retentionTips
              ? `💡 Dica: ${retentionTips}`
              : 'Cortes rápidos a cada 2-3s aumentam retenção'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenes.map((scene, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedSceneIndex(idx)}
              className={cn(
                'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2',
                selectedSceneIndex === idx
                  ? 'bg-[#181B2A] border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                  : 'bg-[#121420] border-[#232738] hover:border-[#353B55]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
                  Cena {scene.scene_number || idx + 1} ({scene.time_range})
                </span>
                <span className="text-[10px] font-mono text-gray-500">{scene.duration_sec}s</span>
              </div>

              <div className="text-xs font-bold text-white line-clamp-1">{scene.objective}</div>

              <div className="p-2 rounded-lg bg-[#0A0B10] border border-[#1E2232] text-[10px] text-gray-300 font-mono line-clamp-2">
                <strong>Tela:</strong> &quot;{scene.on_screen_text}&quot;
              </div>

              <div className="text-[10px] text-gray-400 line-clamp-1">
                <strong>Locução:</strong> {scene.narration_text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Scene Editor */}
      {scenes[selectedSceneIndex] && (
        <div className="p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00F2FF]" />
              Editando Cena {scenes[selectedSceneIndex].scene_number || selectedSceneIndex + 1} (
              {scenes[selectedSceneIndex].time_range})
            </h4>
            <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
              Transição: {scenes[selectedSceneIndex].transition_type || 'Corte seco'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Objetivo da Cena</Label>
              <Input
                value={scenes[selectedSceneIndex].objective || ''}
                onChange={(e) => handleUpdateScene(selectedSceneIndex, 'objective', e.target.value)}
                className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Enquadramento / Ângulo da Câmera</Label>
              <Input
                value={scenes[selectedSceneIndex].camera_framing || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'camera_framing', e.target.value)
                }
                className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Efeito Sonoro / Áudio Cue</Label>
              <Input
                value={scenes[selectedSceneIndex].sound_effect_cue || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'sound_effect_cue', e.target.value)
                }
                className="h-8 bg-[#0A0B10] border-[#252A3D] text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Tomada / Visual Necessário</Label>
              <Textarea
                value={scenes[selectedSceneIndex].required_visual || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'required_visual', e.target.value)
                }
                rows={2}
                className="bg-[#0A0B10] border-[#252A3D] text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Texto na Tela (Caixa Alta / Stickers)</Label>
              <Textarea
                value={scenes[selectedSceneIndex].on_screen_text || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'on_screen_text', e.target.value)
                }
                rows={2}
                className="bg-[#0A0B10] border-[#252A3D] text-xs font-mono resize-none text-[#00F2FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#00E676]" />
                Narração Falada nesta Cena
              </Label>
              <Textarea
                value={scenes[selectedSceneIndex].narration_text || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'narration_text', e.target.value)
                }
                rows={2}
                className="bg-[#0A0B10] border-[#252A3D] text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs flex items-center gap-1.5">
                <Subtitles className="w-3.5 h-3.5 text-[#FFD600]" />
                Legenda Sincronizada
              </Label>
              <Textarea
                value={scenes[selectedSceneIndex].subtitle_text || ''}
                onChange={(e) =>
                  handleUpdateScene(selectedSceneIndex, 'subtitle_text', e.target.value)
                }
                rows={2}
                className="bg-[#0A0B10] border-[#252A3D] text-xs resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Full Script & Subtitles Export Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Narration Script */}
        <div className="p-4 rounded-2xl bg-[#121420] border border-[#232738] space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#00E676]" />
              Roteiro Completo de Locução
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyNarration}
              className="h-7 text-[10px] border-[#2B3047] bg-[#161928] text-gray-300 gap-1"
            >
              {copiedNarration ? (
                <Check className="w-3 h-3 text-[#00E676]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedNarration ? 'Copiado' : 'Copiar Roteiro'}
            </Button>
          </div>
          <Textarea
            value={narrationScript}
            onChange={(e) => onChangeNarration(e.target.value)}
            rows={5}
            className="bg-[#0A0B10] border-[#252A3D] text-xs leading-relaxed"
          />
        </div>

        {/* Full Subtitles */}
        <div className="p-4 rounded-2xl bg-[#121420] border border-[#232738] space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-[#FFD600]" />
              Legendas Formatadas por Tempo
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySubs}
              className="h-7 text-[10px] border-[#2B3047] bg-[#161928] text-gray-300 gap-1"
            >
              {copiedSubs ? (
                <Check className="w-3 h-3 text-[#00E676]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedSubs ? 'Copiado' : 'Copiar Legendas'}
            </Button>
          </div>
          <Textarea
            value={subtitlesText}
            onChange={(e) => onChangeSubtitles(e.target.value)}
            rows={5}
            className="bg-[#0A0B10] border-[#252A3D] text-xs font-mono leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}
