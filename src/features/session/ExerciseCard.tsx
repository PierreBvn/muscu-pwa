import React, { useState } from 'react';
import type { SessionExercise, Exercise, SetEntry } from '../../db/schema';
import { SetRow } from './SetRow';
import { SetInputRow } from './SetInputRow';

interface ExerciseCardProps {
  item: SessionExercise & { exercise?: Exercise };
  index: number;
  totalExercises: number;
  sets: SetEntry[];
  sessionId: number;
  onAddSet: (data: {
    sessionId: number;
    exerciseId: number;
    weight: number;
    reps: number;
    type: 'warmup' | 'work';
  }) => Promise<void>;
  onEditSet: (set: SetEntry) => void;
  onDeleteSet: (set: SetEntry) => void;
  onMoveExercise: (sessionExerciseId: number, direction: 'up' | 'down') => Promise<void>;
  onSkipExercise: (sessionExerciseId: number, skipped: boolean) => Promise<void>;
  onUpdateWorkSets: (sessionExerciseId: number, workSets: number) => Promise<void>;
  onRequestRemoveExercise: (item: SessionExercise & { exercise?: Exercise }) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  index,
  totalExercises,
  sets,
  sessionId,
  onAddSet,
  onEditSet,
  onDeleteSet,
  onMoveExercise,
  onSkipExercise,
  onUpdateWorkSets,
  onRequestRemoveExercise,
}) => {
  const [isAddingExtraSet, setIsAddingExtraSet] = useState(false);

  const exName = item.exercise?.name ?? 'Exercice';
  const isArchived = item.exercise?.archived === true;
  const isSkipped = item.skipped === true;

  // Séparation warmup et work
  const warmupDone = sets.filter((s) => s.type === 'warmup');
  const workDone = sets.filter((s) => s.type === 'work');

  const needsWarmup = warmupDone.length < item.warmupSets;
  const needsWork = workDone.length < item.workSets;

  const isCompleted = !needsWarmup && !needsWork;

  // Détermination de la prochaine série
  let nextSetType: 'warmup' | 'work' | null = null;
  let nextSetLabel = '';

  if (!isSkipped) {
    if (needsWarmup) {
      nextSetType = 'warmup';
      nextSetLabel = item.warmupSets > 1 ? `Échauffement ${warmupDone.length + 1}` : 'Échauffement';
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

  const handleWorkSetsDelta = async (delta: number) => {
    if (!item.id) return;
    const next = item.workSets + delta;
    if (next < 1 || next > 6) return;
    await onUpdateWorkSets(item.id, next);
  };

  return (
    <div
      className={`rounded-xl border p-4 space-y-3.5 transition ${
        isSkipped
          ? 'bg-surface/50 border-line/60 opacity-80'
          : 'bg-surface border-line'
      }`}
    >
      {/* En-tête de l'exercice avec boutons de réordonnancement et actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-mono tabular-nums">#{index + 1}</span>
            <h2 className="text-base font-semibold text-text truncate">
              {exName}
            </h2>
            {isArchived && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                Archivé
              </span>
            )}
            {isSkipped && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                Passé
              </span>
            )}
          </div>
          {item.exercise?.muscleGroup && (
            <p className="text-xs text-muted mt-0.5">
              {item.exercise.muscleGroup}
            </p>
          )}
        </div>

        {/* Contrôles de réordonnancement et actions d'exercice */}
        <div className="flex items-center gap-0.5">
          {/* Monter ↑ */}
          <button
            type="button"
            aria-label={`Monter ${exName}`}
            disabled={index === 0}
            onClick={() => item.id && onMoveExercise(item.id, 'up')}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition ${
              index === 0
                ? 'text-muted/30 cursor-not-allowed'
                : 'text-muted hover:text-text active:bg-surface-2'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>

          {/* Descendre ↓ */}
          <button
            type="button"
            aria-label={`Descendre ${exName}`}
            disabled={index === totalExercises - 1}
            onClick={() => item.id && onMoveExercise(item.id, 'down')}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition ${
              index === totalExercises - 1
                ? 'text-muted/30 cursor-not-allowed'
                : 'text-muted hover:text-text active:bg-surface-2'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Bouton Passer / Rétablir */}
          {item.id && (
            <button
              type="button"
              aria-label={isSkipped ? `Rétablir ${exName}` : `Passer ${exName}`}
              onClick={() => onSkipExercise(item.id!, !isSkipped)}
              className="min-h-[44px] px-2.5 rounded-xl text-xs font-semibold text-muted hover:text-text hover:bg-surface-2 transition flex items-center justify-center"
            >
              {isSkipped ? 'Rétablir' : 'Passer'}
            </button>
          )}

          {/* Bouton Retirer (seulement si 0 série sur cet exercice) */}
          {sets.length === 0 && (
            <button
              type="button"
              aria-label={`Retirer ${exName}`}
              onClick={() => onRequestRemoveExercise(item)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-danger active:bg-surface-2 transition"
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
          )}
        </div>
      </div>

      {/* Réglage des séries de travail (l'échauffement est toujours fixe à 1) */}
      <div className="flex items-center justify-between pt-2 border-t border-line/60">
        <span className="text-xs uppercase tracking-widest text-muted font-medium tabular-nums">
          Échauffement : {item.warmupSets} · Travail : {item.workSets}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Diminuer séries de travail ${exName}`}
            disabled={item.workSets <= 1}
            onClick={() => handleWorkSetsDelta(-1)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 border border-line text-base font-bold transition ${
              item.workSets <= 1
                ? 'text-muted/30 cursor-not-allowed'
                : 'text-text hover:bg-surface active:bg-surface-2'
            }`}
          >
            −
          </button>
          <span className="text-sm font-semibold text-text w-4 text-center tabular-nums">
            {item.workSets}
          </span>
          <button
            type="button"
            aria-label={`Augmenter séries de travail ${exName}`}
            disabled={item.workSets >= 6}
            onClick={() => handleWorkSetsDelta(1)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 border border-line text-base font-bold transition ${
              item.workSets >= 6
                ? 'text-muted/30 cursor-not-allowed'
                : 'text-text hover:bg-surface active:bg-surface-2'
            }`}
          >
            +
          </button>
        </div>
      </div>

      {/* Liste des séries déjà enregistrées (visibles même si passé) */}
      {sets.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {sets.map((s, idx) => {
            const isWarmup = s.type === 'warmup';
            const label = isWarmup
              ? item.warmupSets > 1
                ? `Échauffement ${idx + 1}`
                : 'Échauffement'
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

      {/* Saisie de la prochaine série (uniquement si non passé) */}
      {isSkipped ? (
        <div className="py-2 px-3 rounded-lg bg-surface-2/30 border border-dashed border-line text-center text-xs text-muted flex items-center justify-between">
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
