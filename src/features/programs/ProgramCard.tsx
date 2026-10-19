import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Program, MuscleGroup } from '../../db/schema';
import {
  getProgramExercises,
  type ProgramWithSummary,
  type ProgramSummary as ProgramSummaryType,
} from '../../db/programs';
import { ProgramSummary } from '../../components/ProgramSummary';

const DAY_NAMES: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim',
};

interface ProgramCardProps {
  program: Program | ProgramWithSummary | (Program & Partial<ProgramSummaryType>);
  onSelect: (program: Program) => void;
  onEdit: (program: Program) => void;
  onDelete: (program: Program) => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  onSelect,
  onEdit,
  onDelete,
}) => {
  // Si le résumé n'a pas été fourni (ex. rendu isolé hors de ProgramList), fallback vers la requête Dexie
  const hasPrecomputedSummary = 'muscleGroups' in program && program.muscleGroups !== undefined;

  const exercises = useLiveQuery(
    async () => {
      if (hasPrecomputedSummary || !program.id) return [];
      return await getProgramExercises(program.id);
    },
    [program.id, hasPrecomputedSummary],
    undefined
  );

  const formattedDays = program.weekdays
    .map((day) => DAY_NAMES[day] ?? `${day}`)
    .join(', ');

  const muscleGroups: MuscleGroup[] =
    ('muscleGroups' in program && program.muscleGroups)
      ? program.muscleGroups
      : [];

  const exerciseCountText =
    ('exerciseCountText' in program && program.exerciseCountText)
      ? program.exerciseCountText
      : exercises === undefined
        ? '...'
        : `${exercises.length} ${exercises.length > 1 ? 'exercices' : 'exercice'}`;

  return (
    <div
      role="article"
      aria-label={program.name}
      className="rounded-xl bg-surface border border-line p-4 transition shadow-none"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <button
          type="button"
          onClick={() => onSelect(program)}
          className="text-left flex-1 min-h-[44px] flex flex-col justify-center -m-1 p-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold min-w-0"
        >
          <h2 className="text-base font-semibold text-text tracking-tight transition line-clamp-2 break-words">
            {program.name}
          </h2>
          <p className="text-xs text-muted font-medium mt-0.5">
            {formattedDays || 'Aucun jour'}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={`Modifier ${program.name}`}
            onClick={() => onEdit(program)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-text active:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-gold transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Supprimer ${program.name}`}
            onClick={() => onDelete(program)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-danger active:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-danger transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <ProgramSummary
        summary={{
          muscleGroups,
          exerciseCountText,
        }}
        rightMeta={
          <button
            type="button"
            onClick={() => onSelect(program)}
            className="min-h-[44px] text-gold font-medium hover:opacity-80 flex items-center gap-1 focus:outline-none shrink-0"
          >
            <span>Gérer les exercices</span>
            <span aria-hidden="true">→</span>
          </button>
        }
      />
    </div>
  );
};
