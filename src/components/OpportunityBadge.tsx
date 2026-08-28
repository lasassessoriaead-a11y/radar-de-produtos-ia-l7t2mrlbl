import React from 'react'
import { cn } from '@/lib/utils'
import type { OpportunityLevel } from '@/types/product'

interface OpportunityBadgeProps {
  level: OpportunityLevel
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const OpportunityBadge: React.FC<OpportunityBadgeProps> = ({
  level,
  className,
  size = 'md',
}) => {
  const configs = {
    hot: {
      label: 'Alta Oportunidade',
      emoji: '🔥',
      classes:
        'bg-[#FF3D00]/15 text-[#FF3D00] border-[#FF3D00]/40 shadow-[0_0_12px_rgba(255,61,0,0.25)]',
    },
    good: {
      label: 'Bom Potencial',
      emoji: '🟢',
      classes:
        'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]',
    },
    test: {
      label: 'Testar',
      emoji: '🟡',
      classes: 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/40',
    },
    low: {
      label: 'Baixa Oportunidade',
      emoji: '🔴',
      classes: 'bg-[#9E9E9E]/15 text-[#9E9E9E] border-[#9E9E9E]/40',
    },
  }[level] || {
    label: 'Em Análise',
    emoji: '⚡',
    classes: 'bg-gray-800 text-gray-300 border-gray-700',
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-bold gap-2',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border tracking-wide uppercase font-sans backdrop-blur-sm transition-all',
        sizeClasses,
        configs.classes,
        className,
      )}
    >
      <span className="text-xs">{configs.emoji}</span>
      <span>{configs.label}</span>
    </span>
  )
}
