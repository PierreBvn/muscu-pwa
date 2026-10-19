import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { SessionExercise, Exercise, SetEntry } from '../../db/schema';
import { MuscleIcon } from '../../components/MuscleIcon';
import { SetRow } from './SetRow';
import { SetInputRow } from './SetInputRow';

interface ExerciseCardProps {
  item: SessionExercise & { exercise?: Exercise };
  index?: number;
  totalExercises?: number;
  sets: SetEntry[];
  sessionId: number;
  isOpen: boolean;
  isCompleted: boolean;
  workSetsDone: number;
  onToggleOpen: () => void;
  onAddSet: (data: {
    sessionId: number;
    exerciseId: number;
    weight: number;
    reps: number;
    type: 'warmup' | 'work';
  }) => Promise<void>;
  onEditSet: (set: SetEntry) => void;
  onDeleteSet: (set: SetEntry) => void;
  onSkipExercise: (sessionExerciseId: number, skipped: boolean) => Promise<void> | void;
  onRequestRemoveExercise: (item: SessionExercise & { exercise?: Exercise }) => void;
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: DraggableSyntheticListeners;
  };
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  sets,
  sessionId,
  isOpen,
  isCompleted,
  workSetsDone,
  onToggleOpen,
  onAddSet,
  onEditSet,
  onDeleteSet,
  onSkipExercise,
  onRequestRemoveExercise,
  dragHandleProps,
}) => {
  const [isAddingExtraSet, setIsAddingExtraSet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const exName = item.exercise?.name ?? 'Exercice';
  const isArchived = item.exercise?.archived === true;
  const isSkipped = item.skipped === true;

  // Séparation warmup et work
  const warmupDone = sets.filter((s) => s.type === 'warmup');
  const workDone = sets.filter((s) => s.type === 'work');

  const needsWarmup = warmupDone.length < item.warmupSets;
  const needsWork = workDone.length < item.workSets;

  // Détermination de la prochaine série
  let nextSetType: 'warmup' | 'work' | null = null;
  let nextSetLabel = '';

  if (!isSkipped) {
    if (needsWarmup) {
      nextSetType = 'warmup';
      nextSetLabel = 'Échauffement';
    } else if (needsWork) {
      nextSetType = 'work';
      nextSetLabel = `Série ${workDone.length + 1}`;
    } else if (isAddingExtraSet) {
      nextSetType = 'work';
      nextSetLabel = `Série ${workDone.length + 1}`;
    }
  }

  const handleAddSet = async (data: {
    weight: number;
    reps: number;
    type: 'warmup' | 'work';
  }) => {
    await onAddSet({
      sessionId,
      exerciseId: item.exerciseId,
      ...data,
    });
    if (isAddingExtraSet) {
      setIsAddingExtraSet(false);
    }
  };

  const renderActionMenu = () => (
    <div
      className="mt-2 py-1 px-1 rounded-xl bg-surface-2 border border-line flex flex-col gap-1 shadow-xl animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={isSkipped ? `Rétablir ${exName}` : `Passer ${exName}`}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(false);
          if (item.id) onSkipExercise(item.id, !isSkipped);
        }}
        className="min-h-[44px] px-3 rounded-lg text-left text-xs font-semibold text-text hover:bg-surface flex items-center gap-2.5 transition"
      >
        <span className="text-sm font-bold">{isSkipped ? '↺' : '↷'}</span>
        <span>{isSkipped ? 'Rétablir' : 'Passer'}</span>
      </button>

      <button
        type="button"
        aria-label={`Retirer ${exName}`}
        disabled={sets.length > 0}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(false);
          onRequestRemoveExercise(item);
        }}
        className="min-h-[44px] px-3 rounded-lg text-left text-xs font-semibold text-danger hover:bg-surface disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2.5 transition"
      >
        <span className="text-sm font-bold">✕</span>
        <span>Retirer</span>
      </button>
    </div>
  );

  // --- RENDU EXERCICE FERMÉ ---
  if (!isOpen) {
    const showCheck = isCompleted || isSkipped;
    const showRatio = !showCheck && workSetsDone > 0;

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Ouvrir ${exName}`}
        onClick={onToggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleOpen();
          }
        }}
        className="rounded-xl border border-line bg-surface p-3 transition active:bg-surface-2 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label={`Réordonner ${exName}`}
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-muted hover:text-text active:text-gold transition touch-none cursor-grab active:cursor-grabbing shrink-0"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="w-5 h-5" aria-hidden="true" />
            </button>
            {item.exercise?.muscleGroup && (
              <MuscleIcon
                group={item.exercise.muscleGroup}
                alt={item.exercise.muscleGroup}
                className="w-10 h-10 shrink-0 object-contain"
              />
            )}
            <span className="text-base font-semibold text-text truncate">
              {exName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showCheck ? (
              <span aria-label="Terminé" className="text-gold font-bold text-sm">
                ✓
              </span>
            ) : showRatio ? (
              <span aria-label={`${workSetsDone}/${item.workSets}`} className="text-xs text-muted font-semibold tabular-nums">
                {workSetsDone}/{item.workSets}
              </span>
            ) : null}

            <button
              type="button"
              aria-label={`Options ${exName}`}
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-text active:bg-surface-2 transition text-lg tracking-widest font-bold"
            >
              ⋯
            </button>
          </div>
        </div>

        {menuOpen && renderActionMenu()}
      </div>
    );
  }

  // --- RENDU EXERCICE OUVERT ---
  return (
    <div className="rounded-xl border border-line bg-surface p-4 space-y-3.5 transition">
      {/* En-tête de l'exercice ouvert */}
      <div className="flex items-center justify-between gap-2 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label={`Réordonner ${exName}`}
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
            onClick={(e) => e.stopPropagation()}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-muted hover:text-text active:text-gold transition touch-none cursor-grab active:cursor-grabbing shrink-0"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="w-5 h-5" aria-hidden="true" />
          </button>
          {item.exercise?.muscleGroup && (
            <MuscleIcon
              group={item.exercise.muscleGroup}
              alt={item.exercise.muscleGroup}
              className="w-10 h-10 shrink-0 object-contain"
            />
          )}
          <h2 className="text-base font-semibold text-text truncate">
            {exName}
          </h2>
          {isArchived && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
              Archivé
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isSkipped && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (item.id) onSkipExercise(item.id, true);
              }}
              className="min-h-[44px] px-3 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface active:opacity-90 transition"
            >
              Passer
            </button>
          )}

          <button
            type="button"
            aria-label={`Options ${exName}`}
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-text active:bg-surface-2 transition text-lg tracking-widest font-bold"
          >
            ⋯
          </button>
        </div>
      </div>

      {menuOpen && renderActionMenu()}

      {/* Séries déjà enregistrées */}
      {sets.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {sets.map((s, idx) => {
            const isWarmup = s.type === 'warmup';
            const label = isWarmup
              ? 'Échauffement'
              : `Série ${
                  sets.filter((prev, pIdx) => pIdx <= idx && prev.type === 'work').length
                }`;

            return (
              <SetRow
                key={s.id ?? idx}
                set={s}
                label={label}
                onEdit={onEditSet}
                onDelete={onDeleteSet}
              />
            );
          })}
        </div>
      )}

      {/* Saisie de la prochaine série ou message d'état */}
      {isSkipped ? (
        <div className="py-2.5 px-3 rounded-lg bg-surface-2/30 border border-dashed border-line text-center text-xs text-muted flex items-center justify-between">
          <span>Exercice passé (séries suivantes ignorées)</span>
          {item.id && (
            <button
              type="button"
              onClick={() => onSkipExercise(item.id!, false)}
              className="text-gold font-semibold text-xs hover:underline min-h-[44px] px-2 flex items-center"
            >
              Rétablir
            </button>
          )}
        </div>
      ) : nextSetType !== null ? (
        <SetInputRow
          key={`${item.exerciseId}-${nextSetType}-${sets.length}`}
          sessionId={sessionId}
          exerciseId={item.exerciseId}
          isWarmup={nextSetType === 'warmup'}
          setLabel={nextSetLabel}
          onAddSet={handleAddSet}
        />
      ) : isCompleted ? (
        <div className="pt-1 flex items-center justify-between">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <span className="text-gold">✓</span> Toutes les séries prévues sont validées
          </span>
          <button
            type="button"
            onClick={() => setIsAddingExtraSet(true)}
            className="min-h-[44px] px-3 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface active:opacity-90 transition"
          >
            + Ajouter une série
          </button>
        </div>
      ) : null}
    </div>
  );
};
