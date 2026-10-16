import React from 'react';
import type { Program } from '../../db/schema';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface ProgramPickerModalProps {
  isOpen: boolean;
  programs: Program[];
  onClose: () => void;
  onSelect: (programId: number) => void;
}

export const ProgramPickerModal: React.FC<ProgramPickerModalProps> = ({
  isOpen,
  programs,
  onClose,
  onSelect,
}) => {
  useModalScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-picker-title"
      className="fixed inset-0 z-50 flex flex-col bg-surface overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2
            id="program-picker-title"
            className="text-lg font-semibold text-text tracking-tight"
          >
            Choisir une séance type
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

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {programs.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">
              Aucune séance type enregistrée.
            </p>
          ) : (
            programs.map((program) => (
              <button
                key={program.id}
                type="button"
                onClick={() => {
                  if (program.id !== undefined) {
                    onSelect(program.id);
                  }
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-left transition flex items-center justify-between"
              >
                <span className="font-semibold text-text text-sm">
                  {program.name}
                </span>
                <span className="text-xs text-gold">Démarrer →</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-line shrink-0">
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
