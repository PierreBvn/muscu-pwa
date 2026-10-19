import React from 'react';
import type { MuscleGroup } from '../db/schema';
import { MuscleIcon } from './MuscleIcon';

export interface ProgramSummaryData {
  muscleGroups: MuscleGroup[];
  exerciseCountText: string;
}

export interface ProgramSummaryProps {
  summary: ProgramSummaryData;
  rightMeta?: React.ReactNode;
}

export const ProgramSummary: React.FC<ProgramSummaryProps> = ({
  summary,
  rightMeta,
}) => {
  return (
    <>
      {/* Groupes musculaires travaillés */}
      {summary.muscleGroups.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {summary.muscleGroups.map((group) => (
            <span
              key={group}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-2 border border-line text-xs font-medium text-text"
            >
              <MuscleIcon
                group={group}
                className="w-4 h-4 object-contain"
              />
              <span>{group}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted mt-2">
          Aucun groupe musculaire
        </p>
      )}

      {/* Métadonnées : nombre d'exercices et élément optionnel à droite */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line text-xs text-muted">
        <span>{summary.exerciseCountText}</span>
        {rightMeta}
      </div>
    </>
  );
};
