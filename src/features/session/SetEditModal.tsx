import React, { useState } from 'react';
import type { SetEntry } from '../../db/schema';
import { parseWeight, parseReps } from '../../db/suggestions';

interface SetEditModalProps {
  set: SetEntry;
  label: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (setId: number, changes: { weight: number; reps: number }) => Promise<void>;
}

export const SetEditModal: React.FC<SetEditModalProps> = ({
  set,
  label,
  isOpen,
  onClose,
  onSave,
}) => {
  const [weightInput, setWeightInput] = useState(String(set.weight));
  const [repsInput, setRepsInput] = useState(String(set.reps));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedW = parseWeight(weightInput);
    if (parsedW === null) {
      setError('Poids invalide (nombre positif ou nul attendu).');
      return;
    }

    const parsedR = parseReps(repsInput);
    if (parsedR === null) {
      setError('Répétitions invalides (entier supérieur ou égal à 1 attendu).');
      return;
    }

    if (set.id === undefined) return;

    try {
      setIsSubmitting(true);
      await onSave(set.id, { weight: parsedW, reps: parsedR });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-set-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-surface border border-line p-5 shadow-2xl">
        <h2
          id="edit-set-title"
          className="text-lg font-semibold text-text tracking-tight mb-4"
        >
          Modifier {label}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-weight-input"
              className="block text-xs uppercase tracking-widest text-muted mb-1.5"
            >
              Poids (kg)
            </label>
            <input
              id="edit-weight-input"
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => {
                setWeightInput(e.target.value);
                setError(null);
              }}
              placeholder="Ex: 80 ou 82,5"
              autoFocus
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-3.5 text-sm text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition tabular-nums"
            />
          </div>

          <div>
            <label
              htmlFor="edit-reps-input"
              className="block text-xs uppercase tracking-widest text-muted mb-1.5"
            >
              Répétitions
            </label>
            <input
              id="edit-reps-input"
              type="text"
              inputMode="numeric"
              value={repsInput}
              onChange={(e) => {
                setRepsInput(e.target.value);
                setError(null);
              }}
              placeholder="Ex: 10"
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-3.5 text-sm text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition tabular-nums"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] rounded-xl bg-gold text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
