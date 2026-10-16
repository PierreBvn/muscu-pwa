import React, { useState } from 'react';
import type { Program } from '../../db/schema';
import { ProgramPickerModal } from './ProgramPickerModal';

interface StartSessionViewProps {
  suggestedProgram?: Program;
  allPrograms: Program[];
  onStartProgram: (programId: number) => Promise<void>;
  onStartFreeSession: () => Promise<void>;
}

export const StartSessionView: React.FC<StartSessionViewProps> = ({
  suggestedProgram,
  allPrograms,
  onStartProgram,
  onStartFreeSession,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartMain = async () => {
    if (!suggestedProgram?.id || isStarting) return;
    try {
      setIsStarting(true);
      await onStartProgram(suggestedProgram.id);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectProgram = async (programId: number) => {
    if (isStarting) return;
    try {
      setIsStarting(true);
      setIsPickerOpen(false);
      await onStartProgram(programId);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartFree = async () => {
    if (isStarting) return;
    try {
      setIsStarting(true);
      await onStartFreeSession();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-16 h-16 rounded-xl bg-surface border border-line flex items-center justify-center mb-6 text-gold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8"
          aria-hidden="true"
        >
          <path d="M6 4v16" />
          <path d="M18 4v16" />
          <path d="M2 9h4" />
          <path d="M2 15h4" />
          <path d="M18 9h4" />
          <path d="M18 15h4" />
          <path d="M6 12h12" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-text tracking-tight mb-2 text-center">
        Séance
      </h1>

      {suggestedProgram ? (
        <div className="w-full mt-4 space-y-4">
          <button
            type="button"
            onClick={handleStartMain}
            disabled={isStarting}
            className="w-full min-h-[52px] rounded-xl bg-gold px-5 py-3 text-base font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition shadow-lg shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>Démarrer {suggestedProgram.name}</span>
          </button>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              disabled={isStarting}
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
            >
              Choisir une séance type
            </button>
            <button
              type="button"
              onClick={handleStartFree}
              disabled={isStarting}
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
            >
              Séance libre
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full mt-4 flex flex-col items-center text-center">
          <p className="text-sm text-muted mb-6 max-w-xs">
            Aucune séance type prévue aujourd’hui
          </p>

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              disabled={isStarting}
              className="w-full min-h-[48px] rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition text-center disabled:opacity-50"
            >
              Choisir une séance type
            </button>
            <button
              type="button"
              onClick={handleStartFree}
              disabled={isStarting}
              className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
            >
              Séance libre
            </button>
          </div>
        </div>
      )}

      {isPickerOpen && (
        <ProgramPickerModal
          isOpen={isPickerOpen}
          programs={allPrograms}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleSelectProgram}
        />
      )}
    </div>
  );
};
