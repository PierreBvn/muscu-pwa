import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import type { ProgramWithSummary } from '../../db/programs';
import type { HomeSummary } from '../../db/homeSummary';
import { MuscleIcon } from '../../components/MuscleIcon';
import { ProgramPickerModal } from './ProgramPickerModal';

interface StartSessionViewProps {
  summary: HomeSummary;
  allPrograms: ProgramWithSummary[];
  onStartProgram: (programId: number) => Promise<void>;
  onStartFreeSession: () => Promise<void>;
  onCreateProgram?: () => void;
  onOpenSettings?: () => void;
}

export const StartSessionView: React.FC<StartSessionViewProps> = ({
  summary,
  allPrograms,
  onStartProgram,
  onStartFreeSession,
  onCreateProgram,
  onOpenSettings,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const nextProgram = summary.nextProgram;

  const handleStartMain = async () => {
    if (!nextProgram?.program.id || isStarting) return;
    try {
      setIsStarting(true);
      await onStartProgram(nextProgram.program.id);
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
    <div className="w-full max-w-md mx-auto flex-1 flex flex-col pt-header">
      {/* En-tête fixe avec Séance + date du jour en petit + bouton Paramètres */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <div>
            <h1 className="text-xl font-semibold text-text tracking-tight">
              Séance
            </h1>
            <p className="text-xs text-muted font-medium">
              {summary.headerDate}
            </p>
          </div>
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

      {/* Contenu principal calibré entre l'en-tête et la barre de navigation */}
      <main className="flex-1 px-4 py-3 flex flex-col justify-between">
        <div className="w-full">
          {/* Ligne « Cette semaine : N séances » */}
          <div className="mb-3 flex items-center justify-between text-xs text-muted">
            <span>{summary.weeklySessionsText}</span>
          </div>

          {/* Carte « Prochaine séance » ou État Base vide */}
          {nextProgram ? (
            <section
              aria-label="Prochaine séance"
              className="rounded-2xl bg-surface border border-line p-4 shadow-none"
            >
              <span className="text-[11px] font-semibold text-gold uppercase tracking-wider">
                Prochaine séance
              </span>
              <h2 className="text-lg font-bold text-text mt-0.5 tracking-tight">
                {nextProgram.program.name}
              </h2>

              {/* Groupes musculaires travaillés */}
              {nextProgram.muscleGroups.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {nextProgram.muscleGroups.map((group) => (
                    <span
                      key={group}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-2 border border-line text-xs font-medium text-text"
                    >
                      <MuscleIcon
                        group={group}
                        className="w-4 h-4 object-contain"
                      />
                      <span>{group}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted mt-2">
                  Aucun groupe musculaire
                </p>
              )}

              {/* Métadonnées : nombre d'exercices et dernière fois */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line text-xs text-muted">
                <span>{nextProgram.exerciseCountText}</span>
                <span>{nextProgram.lastDoneText}</span>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl bg-surface border border-line p-5 text-center my-4">
              <p className="text-sm text-muted mb-4">
                Aucune séance type enregistrée
              </p>
              {onCreateProgram && (
                <button
                  type="button"
                  onClick={onCreateProgram}
                  className="w-full min-h-[44px] rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition text-center"
                >
                  Créer une séance type
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bas de l'écran, immédiatement au-dessus de la barre de navigation */}
        <div className="mt-auto pt-3 space-y-2">
          {nextProgram ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  disabled={isStarting}
                  className="w-full min-h-[44px] rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
                >
                  Autre séance
                </button>
                <button
                  type="button"
                  onClick={handleStartFree}
                  disabled={isStarting}
                  className="w-full min-h-[44px] rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
                >
                  Séance libre
                </button>
              </div>

              <button
                type="button"
                onClick={handleStartMain}
                disabled={isStarting}
                className="w-full min-h-[48px] rounded-xl bg-gold px-5 py-3 text-base font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition shadow-lg shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Démarrer {nextProgram.program.name}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartFree}
              disabled={isStarting}
              className="w-full min-h-[44px] rounded-xl bg-surface-2 border border-line px-4 py-2 text-sm font-semibold text-text hover:bg-surface active:opacity-90 transition text-center disabled:opacity-50"
            >
              Séance libre
            </button>
          )}
        </div>
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
