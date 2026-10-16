import React, { useState } from 'react';
import type { Program } from '../../db/schema';

const WEEKDAYS = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
  { value: 7, label: 'Dimanche', short: 'Dim' },
] as const;

interface ProgramModalProps {
  isOpen: boolean;
  program: Program | null;
  onClose: () => void;
  onSave: (data: { name: string; weekdays: number[] }) => Promise<void>;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({
  isOpen,
  program,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(program ? program.name : '');
  const [weekdays, setWeekdays] = useState<number[]>(
    program ? program.weekdays : [1]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Le nom du programme ne peut pas être vide.');
      return;
    }
    if (weekdays.length === 0) {
      setError('Sélectionnez au moins un jour pour ce programme.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({ name: trimmed, weekdays });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700/60 p-5 shadow-2xl">
        <h2
          id="program-modal-title"
          className="text-lg font-bold text-white mb-4"
        >
          {program ? 'Modifier le programme' : 'Nouveau programme'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="program-name"
              className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Nom du programme
            </label>
            <input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: PPL Push, Upper, Jambes..."
              autoFocus
              className="w-full min-h-[44px] rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Jours d’entraînement
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const isSelected = weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={day.label}
                    onClick={() => toggleDay(day.value)}
                    className={`min-h-[44px] rounded-xl px-2 py-2 text-xs font-semibold transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-400 font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-700 active:bg-zinc-750 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-purple-600 text-sm font-semibold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 active:bg-purple-700 transition"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
