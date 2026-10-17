import React, { useState } from 'react';
import type { Program } from '../../db/schema';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { Portal } from '../../components/Portal';

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
  useModalScrollLock(isOpen);
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
      setError('Le nom de la séance type ne peut pas être vide.');
      return;
    }
    if (weekdays.length === 0) {
      setError('Sélectionnez au moins un jour pour cette séance type.');
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
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-modal-title"
        className="fixed inset-0 z-modal flex flex-col bg-surface overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2
            id="program-modal-title"
            className="text-lg font-semibold text-text tracking-tight"
          >
            {program ? 'Modifier la séance type' : 'Nouvelle séance type'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          <div>
            <label
              htmlFor="program-name"
              className="block text-xs uppercase tracking-widest text-muted mb-1.5"
            >
              Nom de la séance type
            </label>
            <input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: PPL Push, Upper, Jambes..."
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-3.5 text-base text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
            />
          </div>

          <div>
            <span className="block text-xs uppercase tracking-widest text-muted mb-2">
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
                    className={`min-h-[44px] rounded-full px-2 py-2 text-xs font-semibold transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-gold text-gold-ink font-semibold'
                        : 'bg-surface-2 border border-line text-muted hover:text-text active:bg-surface'
                    }`}
                  >
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>
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
              className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-gold text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
};
