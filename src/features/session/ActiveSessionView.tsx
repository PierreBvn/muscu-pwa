import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Session, Program, SetEntry, SessionExercise, Exercise } from '../../db/schema';
import type { SessionDetails } from '../../db/sessions';
import {
  addSet,
  updateSet,
  deleteSet,
  addExerciseToSession,
  removeExerciseFromSession,
  skipSessionExercise,
  moveSessionExercise,
  getSessionProgress,
} from '../../db/sessions';
import { ExerciseCard } from './ExerciseCard';
import { SetEditModal } from './SetEditModal';
import { AddExerciseModal } from './AddExerciseModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ActiveSessionViewProps {
  session: Session;
  details: SessionDetails;
  program: Program | null | undefined;
  onFinishSession: () => Promise<void>;
}

const EXERCISE_HEADER_GAP_PX = 8;
const DEFAULT_HEADER_HEIGHT_PX = 64;

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  session,
  details,
  program,
  onFinishSession,
}) => {
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);

  const [openedSessionExerciseId, setOpenedSessionExerciseId] = useState<number | null>(null);

  // Progrès de la séance depuis Dexie
  const sessionProgress = useLiveQuery(
    async () => (session.id ? await getSessionProgress(session.id) : null),
    [session.id, details.sets.length, details.exercises]
  );

  const [editingSetInfo, setEditingSetInfo] = useState<{
    set: SetEntry;
    label: string;
  } | null>(null);

  const [setToDelete, setSetToDelete] = useState<{
    set: SetEntry;
    label: string;
  } | null>(null);
  const [isDeletingSet, setIsDeletingSet] = useState(false);

  const [exerciseToRemove, setExerciseToRemove] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isRemovingExercise, setIsRemovingExercise] = useState(false);

  const isProgramDeleted = session.programId !== undefined && program === undefined;
  const isFreeSession = session.programId === undefined;

  // L'exercice ouvert par défaut est firstIncompleteSessionExerciseId.
  // Si tous les exercices sont terminés et qu'aucun n'est sélectionné manuellement -> null (aucun ouvert).
  const currentOpenId =
    openedSessionExerciseId ?? sessionProgress?.firstIncompleteSessionExerciseId ?? null;

  const headerRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const spacerRef = useRef<HTMLDivElement>(null);

  // Défilement automatique de l'exercice ouvert en 2e position visible (avec l'exercice précédent au-dessus)
  useEffect(() => {
    if (currentOpenId === null) return;
    const openIndex = details.exercises.findIndex((e) => e.id === currentOpenId);
    if (openIndex === -1) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (openIndex === 0) {
      if (spacerRef.current) {
        spacerRef.current.style.height = '0px';
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior });
      }
    } else {
      const prevExercise = details.exercises[openIndex - 1];
      const prevEl = prevExercise?.id ? cardRefs.current.get(prevExercise.id) : null;
      if (prevEl) {
        const headerHeight =
          headerRef.current?.getBoundingClientRect().height ?? DEFAULT_HEADER_HEIGHT_PX;
        const elementTop = prevEl.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, elementTop - headerHeight - EXERCISE_HEADER_GAP_PX);

        if (typeof window !== 'undefined') {
          const innerHeight = window.innerHeight;
          const scrollHeight = document.documentElement.scrollHeight;
          const currentSpacerHeight = spacerRef.current
            ? parseFloat(spacerRef.current.style.height || '0') || 0
            : 0;
          const missingHeight = Math.max(
            0,
            targetY + innerHeight - (scrollHeight - currentSpacerHeight)
          );

          if (spacerRef.current) {
            spacerRef.current.style.height = `${missingHeight}px`;
          }

          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top: targetY, behavior });
          }
        }
      }
    }
  }, [currentOpenId, details.exercises]);

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
    // Décision (3) : quand l'exercice ouvert devient terminé,
    // il se ferme et le premier non terminé s'ouvre (retour au défaut getSessionProgress).
    setOpenedSessionExerciseId(null);
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

  const handleAddExercise = async (exercise: Exercise) => {
    if (!exercise.id || !session.id) return;

    await addExerciseToSession({
      sessionId: session.id,
      exerciseId: exercise.id,
      warmupSets: 1,
      workSets: 3,
    });
  };

  const handleConfirmRemoveExercise = async () => {
    if (!exerciseToRemove?.id || isRemovingExercise) return;
    try {
      setIsRemovingExercise(true);
      await removeExerciseFromSession(exerciseToRemove.id);
      setExerciseToRemove(null);
    } finally {
      setIsRemovingExercise(false);
    }
  };

  const handleMoveExercise = async (
    sessionExerciseId: number,
    direction: 'up' | 'down'
  ) => {
    await moveSessionExercise(sessionExerciseId, direction);
  };

  const handleSkipExercise = async (
    sessionExerciseId: number,
    skipped: boolean
  ) => {
    await skipSessionExercise(sessionExerciseId, skipped);
    setOpenedSessionExerciseId(null);
  };

  const existingExerciseIds = details.exercises.map((e) => e.exerciseId);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-svh pt-header">
      {/* En-tête de la séance en cours */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]"
      >
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFinishConfirm(true)}
              className="min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:border-danger/60 hover:text-danger active:opacity-90 transition"
            >
              Terminer la séance
            </button>
          </div>
        </div>
      </header>

      {/* Liste des exercices de la séance */}
      <main className="flex-1 px-4 py-4 space-y-3">
        {details.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-6 rounded-xl bg-surface border border-dashed border-line">
            <p className="text-sm text-muted mb-4">
              Aucun exercice dans cette séance.
            </p>
            <button
              type="button"
              onClick={() => setIsAddExerciseModalOpen(true)}
              className="min-h-[48px] px-5 rounded-xl bg-gold text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
            >
              Ajouter un premier exercice
            </button>
          </div>
        ) : (
          details.exercises.map((item, index) => {
            const exerciseSets = details.sets.filter(
              (s) => s.exerciseId === item.exerciseId
            );

            const itemProgress = sessionProgress?.exercises.find(
              (e) => e.sessionExerciseId === item.id
            );

            const isCompleted = itemProgress?.completed ?? false;
            const workSetsDone = itemProgress?.workSetsDone ?? 0;
            const isOpen = currentOpenId === item.id;

            return (
              <div
                key={item.id ?? index}
                ref={(el) => {
                  if (item.id) {
                    if (el) cardRefs.current.set(item.id, el);
                    else cardRefs.current.delete(item.id);
                  }
                }}
                className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]"
              >
                <ExerciseCard
                  item={item}
                  index={index}
                  totalExercises={details.exercises.length}
                  sets={exerciseSets}
                  sessionId={session.id!}
                  isOpen={isOpen}
                  isCompleted={isCompleted}
                  workSetsDone={workSetsDone}
                  onToggleOpen={() => {
                    if (isOpen) {
                      setOpenedSessionExerciseId(null);
                    } else {
                      setOpenedSessionExerciseId(item.id ?? null);
                    }
                  }}
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
                  onMoveExercise={handleMoveExercise}
                  onSkipExercise={handleSkipExercise}
                  onRequestRemoveExercise={(exItem: SessionExercise & { exercise?: Exercise }) =>
                    setExerciseToRemove({
                      id: exItem.id!,
                      name: exItem.exercise?.name ?? 'l’exercice',
                    })
                  }
                />
              </div>
            );
          })
        )}
        {/* Spacer dynamique pour permettre à l'exercice ouvert d'atteindre la 2e position */}
        <div ref={spacerRef} aria-hidden="true" />
      </main>

      {/* Bouton flottant carré 56px « + » (Ajouter un exercice) */}
      {details.exercises.length > 0 && (
        <button
          type="button"
          aria-label="Ajouter un exercice"
          onClick={() => setIsAddExerciseModalOpen(true)}
          className="fixed right-4 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+16px)] w-14 h-14 min-w-[56px] min-h-[56px] rounded-xl bg-gold text-gold-ink font-bold text-2xl flex items-center justify-center shadow-lg active:opacity-90 transition z-fab"
        >
          +
        </button>
      )}

      {/* Modale d'ajout d'exercice */}
      {isAddExerciseModalOpen && (
        <AddExerciseModal
          isOpen={isAddExerciseModalOpen}
          existingExerciseIds={existingExerciseIds}
          onClose={() => setIsAddExerciseModalOpen(false)}
          onSelectExercise={handleAddExercise}
        />
      )}

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
      <ConfirmDialog
        isOpen={setToDelete !== null}
        title="Supprimer la série ?"
        titleId="delete-set-dialog-title"
        message={
          setToDelete ? (
            <p>
              Êtes-vous sûr de vouloir supprimer cette série de{' '}
              <strong className="text-text font-semibold">
                {setToDelete.set.weight} kg × {setToDelete.set.reps} reps
              </strong>{' '}
              ?
            </p>
          ) : null
        }
        confirmLabel={isDeletingSet ? 'Suppression...' : 'Supprimer'}
        confirmVariant="danger"
        isLoading={isDeletingSet}
        onCancel={() => setSetToDelete(null)}
        onConfirm={handleConfirmDeleteSet}
      />

      {/* Dialogue de confirmation de retrait d'un exercice */}
      <ConfirmDialog
        isOpen={exerciseToRemove !== null}
        title="Retirer l’exercice ?"
        titleId="remove-exercise-dialog-title"
        message={
          exerciseToRemove ? (
            <p>
              Êtes-vous sûr de vouloir retirer{' '}
              <strong className="text-text font-semibold">
                « {exerciseToRemove.name} »
              </strong>{' '}
              de cette séance ?
            </p>
          ) : null
        }
        confirmLabel={isRemovingExercise ? 'Retrait...' : 'Retirer'}
        confirmVariant="danger"
        isLoading={isRemovingExercise}
        onCancel={() => setExerciseToRemove(null)}
        onConfirm={handleConfirmRemoveExercise}
      />

      {/* Dialogue de confirmation de fin de séance */}
      <ConfirmDialog
        isOpen={showFinishConfirm}
        title="Terminer la séance ?"
        titleId="finish-dialog-title"
        message={<p>Êtes-vous sûr de vouloir terminer cette séance ?</p>}
        confirmLabel={isFinishing ? 'Clôture...' : 'Terminer'}
        confirmVariant="danger"
        isLoading={isFinishing}
        onCancel={() => setShowFinishConfirm(false)}
        onConfirm={handleConfirmFinish}
      />
    </div>
  );
};
