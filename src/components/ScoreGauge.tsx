import React from 'react'
import { getOpportunityLevelInfo } from '@/lib/scoreUtils'
import { OpportunityLevel } from '@/types/product'

interface ScoreGaugeProps {
  score: number
  level?: OpportunityLevel | string
  size?: 'sm' | 'md' | 'lg'
  showLevel?: boolean
  showLabel?: boolean
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  level,
  size = 'md',
  showLevel = true,
  showLabel = true,
}) => {
  const info = getOpportunityLevelInfo(level, score)
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score || 0)))

  // SVG parameters
  const dimensions = size === 'sm' ? 44 : size === 'lg' ? 96 : 64
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 7 : 5
  const radius = (dimensions - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: dimensions, height: dimensions }}
      >
        <svg className="transform -rotate-90" width={dimensions} height={dimensions}>
          {/* Background circle */}
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            className="stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            stroke={info.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold leading-none ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'
            } text-slate-100`}
          >
            {normalizedScore}
          </span>
          {size === 'lg' && (
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">SCORE</span>
          )}
        </div>
      </div>

      {(showLevel || showLabel) && (
        <div className="flex flex-col">
          {showLevel && (
            <span
              className={`inline-flex items-center gap-1 font-semibold text-xs ${info.textClass}`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </span>
          )}
          {showLabel && <span className="text-[10px] text-slate-400">Score de Oportunidade</span>}
        </div>
      )}
    </div>
  )
}
