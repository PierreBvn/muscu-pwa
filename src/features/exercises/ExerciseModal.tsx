import React, { useState } from 'react';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/schema';

interface ExerciseModalProps {
  isOpen: boolean;
  exercise?: Exercise | null;
  onClose: () => void;
  onSave: (data: { name: string; muscleGroup: MuscleGroup }) => Promise<void>;
}

interface FormProps {
  exercise?: Exercise | null;
  onClose: () => void;
  onSave: (data: { name: string; muscleGroup: MuscleGroup }) => Promise<void>;
}

const ExerciseForm: React.FC<FormProps> = ({ exercise, onClose, onSave }) => {
  const [name, setName] = useState(exercise?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(
    exercise?.muscleGroup ?? 'Pectoraux'
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(exercise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSave({ name, muscleGroup });
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-zinc-700/60 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 id="modal-title" className="text-xl font-bold text-white">
            {isEditing ? 'Modifier l’exercice' : 'Nouvel exercice'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:text-white active:bg-zinc-800 focus:outline-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="exercise-name"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Nom de l’exercice
            </label>
            <input
              id="exercise-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Développé couché"
              autoFocus
              className="w-full min-h-[48px] rounded-xl bg-zinc-800 border border-zinc-700 px-4 text-base text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Groupe musculaire
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map((group) => {
                const isSelected = muscleGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setMuscleGroup(group)}
                    className={`flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-zinc-750'
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-zinc-800 text-base font-medium text-zinc-300 hover:bg-zinc-700 active:bg-zinc-750 focus:outline-none"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-purple-600 text-base font-semibold text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 active:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  exercise,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <ExerciseForm
      key={exercise ? `edit-${exercise.id}` : 'new'}
      exercise={exercise}
      onClose={onClose}
      onSave={onSave}
    />
  );
};
