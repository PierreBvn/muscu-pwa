import React from 'react';
import { MUSCLE_GROUPS, type MuscleGroup } from '../db/schema';
import { MuscleGroupBadge } from './MuscleGroupBadge';

export interface MuscleGroupGridProps {
  counts?: Partial<Record<MuscleGroup, number>>;
  onSelectGroup: (group: MuscleGroup) => void;
}

export const MuscleGroupGrid: React.FC<MuscleGroupGridProps> = ({
  counts = {},
  onSelectGroup,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MUSCLE_GROUPS.map((group) => {
        const count = counts[group] ?? 0;
        return (
          <button
            key={group}
            type="button"
            aria-label={`${group} (${count} ${count > 1 ? 'exercices' : 'exercice'})`}
            onClick={() => onSelectGroup(group)}
            className="min-h-[88px] p-3.5 rounded-xl bg-surface border border-line flex flex-col justify-between items-start text-left hover:border-gold/50 active:bg-surface-2 transition-colors focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <MuscleGroupBadge muscleGroup={group} />
            <div className="mt-3 w-full">
              <span className="block font-bold text-text text-sm leading-tight truncate">
                {group}
              </span>
              <span className="block text-xs text-muted tabular-nums mt-0.5">
                {count} {count > 1 ? 'exercices' : 'exercice'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
