import React, { useState } from 'react';
import type { Session, Program, SetEntry } from '../../db/schema';
import type { SessionDetails } from '../../db/sessions';
import { addSet, updateSet, deleteSet } from '../../db/sessions';
import { ExerciseCard } from './ExerciseCard';
import { SetEditModal } from './SetEditModal';

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
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const [editingSetInfo, setEditingSetInfo] = useState<{
    set: SetEntry;
    label: string;
  } | null>(null);

  const [setToDelete, setSetToDelete] = useState<{
    set: SetEntry;
    label: string;
  } | null>(null);
  const [isDeletingSet, setIsDeletingSet] = useState(false);

  const isProgramDeleted = session.programId !== undefined && program === undefined;
  const isFreeSession = session.programId === undefined;

  const handleConfirmFinish = async () => {
    if (isFinishing) return;
    try {
      setIsFinishing(true);
      await onFinishSession();
      setShowFinishConfirm(false);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleAddSet = async (data: {
    sessionId: number;
    exerciseId: number;
    weight: number;
    reps: number;
    type: 'warmup' | 'work';
  }) => {
    await addSet(data);
  };

  const handleSaveEditedSet = async (
    setId: number,
    changes: { weight: number; reps: number }
  ) => {
    await updateSet(setId, changes);
  };

  const handleConfirmDeleteSet = async () => {
    if (!setToDelete?.set.id || isDeletingSet) return;
    try {
      setIsDeletingSet(true);
      await deleteSet(setToDelete.set.id);
      setSetToDelete(null);
    } finally {
      setIsDeletingSet(false);
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
          onClick={() => setShowFinishConfirm(true)}
          className="min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:border-danger/60 hover:text-danger active:opacity-90 transition"
        >
          Terminer la séance
        </button>
      </header>

      {/* Liste des exercices de la séance */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {details.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-center p-6 rounded-xl bg-surface border border-dashed border-line">
            <p className="text-sm text-muted">
              Aucun exercice dans cette séance.
            </p>
          </div>
        ) : (
          details.exercises.map((item, index) => {
            const exerciseSets = details.sets.filter(
              (s) => s.exerciseId === item.exerciseId
            );

            return (
              <ExerciseCard
                key={item.id ?? index}
                item={item}
                index={index}
                sets={exerciseSets}
                sessionId={session.id!}
                onAddSet={handleAddSet}
                onEditSet={(s) =>
                  setEditingSetInfo({
                    set: s,
                    label: s.type === 'warmup' ? 'l’échauffement' : 'la série',
                  })
                }
                onDeleteSet={(s) =>
                  setSetToDelete({
                    set: s,
                    label: s.type === 'warmup' ? 'l’échauffement' : 'la série',
                  })
                }
              />
            );
          })
        )}
      </main>

      {/* Modale d'édition d'une série */}
      {editingSetInfo && (
        <SetEditModal
          set={editingSetInfo.set}
          label={editingSetInfo.label}
          isOpen={editingSetInfo !== null}
          onClose={() => setEditingSetInfo(null)}
          onSave={handleSaveEditedSet}
        />
      )}

      {/* Dialogue de suppression de série */}
      {setToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-set-dialog-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-surface border border-line p-5 shadow-2xl">
            <h3
              id="delete-set-dialog-title"
              className="text-lg font-semibold text-text tracking-tight mb-2"
            >
              Supprimer la série ?
            </h3>
            <p className="text-sm text-muted mb-5">
              Êtes-vous sûr de vouloir supprimer cette série de{' '}
              <strong className="text-text font-semibold">
                {setToDelete.set.weight} kg × {setToDelete.set.reps} reps
              </strong>{' '}
              ?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSetToDelete(null)}
                disabled={isDeletingSet}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSet}
                disabled={isDeletingSet}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-danger text-sm font-semibold text-text hover:opacity-95 active:opacity-90 transition disabled:opacity-50"
              >
                {isDeletingSet ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de fin de séance */}
      {showFinishConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="finish-dialog-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-surface border border-line p-5 shadow-2xl">
            <h3
              id="finish-dialog-title"
              className="text-lg font-semibold text-text tracking-tight mb-2"
            >
              Terminer la séance ?
            </h3>
            <p className="text-sm text-muted mb-5">
              Êtes-vous sûr de vouloir terminer cette séance ?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                disabled={isFinishing}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                disabled={isFinishing}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-danger text-sm font-semibold text-text hover:opacity-95 active:opacity-90 transition disabled:opacity-50"
              >
                {isFinishing ? 'Clôture...' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
