import React from 'react';
import type { MuscleGroup } from '../db/schema';

export const MUSCLE_GROUP_MONOGRAMS: Record<MuscleGroup, string> = {
  Pectoraux: 'PE',
  Dos: 'DO',
  Épaules: 'ÉP',
  Bras: 'BR',
  Jambes: 'JA',
  Abdominaux: 'AB',
};

interface MuscleGroupBadgeProps {
  muscleGroup?: MuscleGroup;
  isOpen?: boolean;
  className?: string;
}

export const MuscleGroupBadge: React.FC<MuscleGroupBadgeProps> = ({
  muscleGroup,
  isOpen = false,
  className = '',
}) => {
  if (!muscleGroup) return null;

  const monogram = MUSCLE_GROUP_MONOGRAMS[muscleGroup] ?? muscleGroup.slice(0, 2).toUpperCase();

  return (
    <span
      data-testid="muscle-group-badge"
      aria-hidden="true"
      className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border flex items-center justify-center text-xs font-semibold select-none shrink-0 transition-colors ${
        isOpen
          ? 'border-gold text-gold'
          : 'border-line text-muted'
      } ${className}`}
    >
      {monogram}
    </span>
  );
};
