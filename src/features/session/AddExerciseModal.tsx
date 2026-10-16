import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Exercise } from '../../db/schema';
import { getAllExercises } from '../../db/exercises';

interface AddExerciseModalProps {
  isOpen: boolean;
  existingExerciseIds: number[];
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => Promise<void>;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  existingExerciseIds,
  onClose,
  onSelectExercise,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const exercisesQuery = useLiveQuery(
    async () => ({ list: await getAllExercises() }),
    []
  );

  if (!isOpen) return null;

  const currentIds = new Set(existingExerciseIds);
  const availableExercises = (exercisesQuery?.list || []).filter(
    (ex) => ex.id !== undefined && !currentIds.has(ex.id)
  );

  const filteredExercises = availableExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSelect = async (exercise: Exercise) => {
    if (isAdding) return;
    try {
      setIsAdding(true);
      await onSelectExercise(exercise);
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-exercise-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-surface border border-line p-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="add-exercise-modal-title"
            className="text-lg font-semibold text-text tracking-tight"
          >
            Ajouter un exercice
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition"
          >
            ✕
          </button>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un exercice..."
            aria-label="Rechercher un exercice"
            className="w-full min-h-[44px] rounded-xl bg-surface-2 border border-line px-3.5 text-base text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {exercisesQuery === undefined ? null : filteredExercises.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">
              {searchQuery.trim()
                ? 'Aucun exercice trouvé.'
                : 'Tous les exercices disponibles sont déjà dans la séance.'}
            </p>
          ) : (
            filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => handleSelect(exercise)}
                disabled={isAdding}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="font-semibold text-text text-sm block">
                    {exercise.name}
                  </span>
                  <span className="text-xs text-muted">
                    {exercise.muscleGroup}
                  </span>
                </div>
                <span className="text-xs text-gold font-medium group-hover:translate-x-0.5 transition-transform">
                  + Ajouter
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
