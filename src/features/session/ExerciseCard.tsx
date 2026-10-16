import React, { useState } from 'react';
import type { SessionExercise, Exercise, SetEntry } from '../../db/schema';
import { SetRow } from './SetRow';
import { SetInputRow } from './SetInputRow';

interface ExerciseCardProps {
  item: SessionExercise & { exercise?: Exercise };
  index: number;
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
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  index,
  sets,
  sessionId,
  onAddSet,
  onEditSet,
  onDeleteSet,
}) => {
  const [isAddingExtraSet, setIsAddingExtraSet] = useState(false);

  const isArchived = item.exercise?.archived === true;

  // Séparation warmup et work
  const warmupDone = sets.filter((s) => s.type === 'warmup');
  const workDone = sets.filter((s) => s.type === 'work');

  const needsWarmup = warmupDone.length < item.warmupSets;
  const needsWork = workDone.length < item.workSets;

  const isCompleted = !needsWarmup && !needsWork;

  // Détermination de la prochaine série
  let nextSetType: 'warmup' | 'work' | null = null;
  let nextSetLabel = '';

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

  return (
    <div className="rounded-xl bg-surface border border-line p-4 space-y-3.5 transition">
      {/* En-tête de l'exercice */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-mono">#{index + 1}</span>
            <h2 className="text-base font-semibold text-text">
              {item.exercise?.name ?? 'Exercice'}
            </h2>
            {isArchived && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                Archivé
              </span>
            )}
          </div>
          {item.exercise?.muscleGroup && (
            <p className="text-xs text-muted mt-0.5">
              {item.exercise.muscleGroup}
            </p>
          )}
        </div>

        <div className="text-xs text-muted text-right">
          <span>
            {item.warmupSets > 0 && `${item.warmupSets} échauff. · `}
            {item.workSets} travail
          </span>
        </div>
      </div>

      {/* Liste des séries déjà enregistrées */}
      {sets.length > 0 && (
        <div className="space-y-1.5">
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

      {/* Saisie de la prochaine série */}
      {nextSetType !== null ? (
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
