import React from 'react';
import type { Exercise } from '../../db/schema';

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-800/80 px-4 py-3 shadow-sm border border-zinc-700/50">
      <span className="text-base font-medium text-zinc-100">
        {exercise.name}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(exercise)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
          aria-label={`Modifier ${exercise.name}`}
        >
          {/* Edit icon */}
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(exercise)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
          aria-label={`Supprimer ${exercise.name}`}
        >
          {/* Trash icon */}
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
