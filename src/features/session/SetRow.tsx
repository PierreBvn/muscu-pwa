import React from 'react';
import type { SetEntry } from '../../db/schema';

interface SetRowProps {
  set: SetEntry;
  label: string;
  onEdit: (set: SetEntry) => void;
  onDelete: (set: SetEntry) => void;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  label,
  onEdit,
  onDelete,
}) => {
  const isWarmup = set.type === 'warmup';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-2/60 border border-line/60 text-sm">
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isWarmup
              ? 'bg-surface border border-line text-muted'
              : 'bg-gold/15 text-gold border border-gold/30'
          }`}
        >
          {label}
        </span>
        <span className="font-medium text-text tabular-nums">
          {set.weight} kg <span className="text-muted">×</span> {set.reps}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(set)}
          aria-label={`Modifier ${label}`}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface transition"
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
          onClick={() => onDelete(set)}
          aria-label={`Supprimer ${label}`}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-surface transition"
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
  );
};
