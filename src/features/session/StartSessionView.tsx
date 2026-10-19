import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import type { Program } from '../../db/schema';
import { ProgramPickerModal } from './ProgramPickerModal';

interface StartSessionViewProps {
  suggestedProgram?: Program;
  allPrograms: Program[];
  onStartProgram: (programId: number) => Promise<void>;
  onStartFreeSession: () => Promise<void>;
  onOpenSettings?: () => void;
}

export const StartSessionView: React.FC<StartSessionViewProps> = ({
  suggestedProgram,
  allPrograms,
  onStartProgram,
  onStartFreeSession,
  onOpenSettings,
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
    <div className="w-full max-w-md mx-auto flex flex-col min-h-svh pt-header">
      {/* En-tête fixe avec bouton Paramètres */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <h1 className="text-xl font-semibold text-text tracking-tight">
            Séance
          </h1>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Paramètres"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted hover:text-text active:opacity-80 transition-colors"
            >
              <Settings size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
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
      </main>

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
