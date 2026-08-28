import React from 'react'
import { cn } from '@/lib/utils'
import type { OpportunityLevel } from '@/types/product'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  animate?: boolean
  className?: string
}

export function getScoreColor(score: number): {
  stroke: string
  text: string
  bg: string
  level: OpportunityLevel
  badgeLabel: string
} {
  if (score >= 80) {
    return {
      stroke: '#FF3D00',
      text: 'text-[#FF3D00]',
      bg: 'bg-[#FF3D00]/10 border-[#FF3D00]/30',
      level: 'hot',
      badgeLabel: '🔥 Alta Oportunidade',
    }
  }
  if (score >= 60) {
    return {
      stroke: '#00E676',
      text: 'text-[#00E676]',
      bg: 'bg-[#00E676]/10 border-[#00E676]/30',
      level: 'good',
      badgeLabel: '🟢 Bom Potencial',
    }
  }
  if (score >= 40) {
    return {
      stroke: '#FFD600',
      text: 'text-[#FFD600]',
      bg: 'bg-[#FFD600]/10 border-[#FFD600]/30',
      level: 'test',
      badgeLabel: '🟡 Testar',
    }
  }
  return {
    stroke: '#9E9E9E',
    text: 'text-[#9E9E9E]',
    bg: 'bg-[#9E9E9E]/10 border-[#9E9E9E]/30',
    level: 'low',
    badgeLabel: '🔴 Baixa Oportunidade',
  }
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const safeScore = Math.min(100, Math.max(0, Math.round(score || 0)))
  const { stroke, text } = getScoreColor(safeScore)

  const config = {
    sm: { size: 44, strokeWidth: 4, font: 'text-xs font-bold' },
    md: { size: 68, strokeWidth: 6, font: 'text-base font-bold' },
    lg: { size: 96, strokeWidth: 8, font: 'text-2xl font-bold' },
    xl: { size: 128, strokeWidth: 10, font: 'text-3xl font-extrabold' },
  }[size]

  const radius = (config.size - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (safeScore / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={config.size} height={config.size} className="transform -rotate-90 drop-shadow-sm">
        {/* Background Track */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="#232738"
          strokeWidth={config.strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-mono leading-none tracking-tight', config.font, text)}>
            {safeScore}
          </span>
          {size === 'xl' && (
            <span className="text-[10px] text-gray-400 font-sans mt-0.5 uppercase tracking-widest font-semibold">
              Score IA
            </span>
          )}
        </div>
      )}
    </div>
  )
}
