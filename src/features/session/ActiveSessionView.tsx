import React, { useState } from 'react';
import type { Session, Program } from '../../db/schema';
import type { SessionDetails } from '../../db/sessions';

interface ActiveSessionViewProps {
  session: Session;
  details: SessionDetails;
  program: Program | null | undefined;
  onFinishSession: () => Promise<void>;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  session,
  details,
  program,
  onFinishSession,
}) => {
  const [isFinishing, setIsFinishing] = useState(false);

  const isProgramDeleted = session.programId !== undefined && program === undefined;
  const isFreeSession = session.programId === undefined;

  const handleFinish = async () => {
    if (isFinishing) return;
    try {
      setIsFinishing(true);
      await onFinishSession();
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-svh pb-16">
      {/* En-tête de la séance en cours */}
      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-gold font-semibold block mb-0.5">
            Séance en cours
          </span>
          <h1 className="text-xl font-semibold text-text tracking-tight flex items-center gap-2">
            {isProgramDeleted ? (
              <span className="text-muted italic">Séance type supprimée</span>
            ) : isFreeSession ? (
              <span>Séance libre</span>
            ) : (
              <span>{program?.name}</span>
            )}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={isFinishing}
          className="min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:border-danger/60 hover:text-danger active:opacity-90 transition disabled:opacity-50"
        >
          {isFinishing ? 'Clôture...' : 'Terminer la séance'}
        </button>
      </header>

      {/* Liste des exercices de la séance */}
      <main className="flex-1 px-4 py-4 space-y-3">
        {details.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-center p-6 rounded-xl bg-surface border border-dashed border-line">
            <p className="text-sm text-muted">
              Aucun exercice dans cette séance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {details.exercises.map((item, index) => {
              const isArchived = item.exercise?.archived === true;

              return (
                <div
                  key={item.id ?? index}
                  className="rounded-xl bg-surface border border-line p-4 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted font-mono">
                          #{index + 1}
                        </span>
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
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted pt-2 border-t border-line/60">
                    <span>
                      {item.warmupSets > 0 && (
                        <span>{item.warmupSets} échauffement · </span>
                      )}
                      <span>{item.workSets} travail</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
