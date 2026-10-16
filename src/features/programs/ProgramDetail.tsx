import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Exercise } from '../../db/schema';
import {
  getProgramWithExercises,
  addExerciseToProgram,
  updateProgramExercise,
  removeExerciseFromProgram,
  moveProgramExercise,
} from '../../db/programs';
import { getAllExercises } from '../../db/exercises';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface ProgramDetailProps {
  programId: number;
  onBack: () => void;
}

export const ProgramDetail: React.FC<ProgramDetailProps> = ({
  programId,
  onBack,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  useModalScrollLock(isAddModalOpen);

  // Données du programme et ses exercices enrichis emballées
  const programDataQuery = useLiveQuery(
    async () => ({ data: await getProgramWithExercises(programId) }),
    [programId]
  );

  // Tous les exercices actifs de la bibliothèque pour le sélecteur
  const availableExercisesQuery = useLiveQuery(
    async () => ({ list: await getAllExercises() }),
    []
  );

  if (programDataQuery === undefined || availableExercisesQuery === undefined) {
    return null;
  }

  const programData = programDataQuery.data;
  const availableExercises = availableExercisesQuery.list;

  if (!programData || !programData.program) {
    return (
      <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col p-4 items-center justify-center text-center">
        <p className="text-sm text-muted mb-4">Séance type introuvable.</p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] px-4 rounded-xl bg-gold text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
        >
          Retour
        </button>
      </div>
    );
  }

  const { program, exercises } = programData;

  // Filtrer les exercices déjà présents dans le programme (pas de doublons)
  const currentExerciseIds = new Set(exercises.map((pe) => pe.exerciseId));
  const filteredAvailableExercises = (availableExercises || []).filter(
    (ex) => ex.id !== undefined && !currentExerciseIds.has(ex.id)
  );

  const handleAddExercise = async (exercise: Exercise) => {
    if (!exercise.id) return;
    await addExerciseToProgram({
      programId,
      exerciseId: exercise.id,
      warmupSets: 1,
      workSets: 3,
    });
    setIsAddModalOpen(false);
  };

  const handleWorkChange = async (
    programExerciseId: number,
    currentWork: number,
    delta: number
  ) => {
    const next = currentWork + delta;
    if (next < 1 || next > 6) return;
    await updateProgramExercise(programExerciseId, { workSets: next });
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-xl text-gold hover:opacity-80 active:bg-surface-2 transition"
          >
            <span className="text-sm font-semibold">← Retour</span>
          </button>
          <h1 className="text-xl font-semibold text-text tracking-tight truncate max-w-[200px]">
            {program.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
        >
          <span className="text-lg leading-none">+</span>
          <span>Ajouter</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">
            Exercices prévus
          </h2>
          <span className="text-xs font-medium text-muted tabular-nums">
            {exercises.length} {exercises.length > 1 ? 'exercices' : 'exercice'}
          </span>
        </div>

        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 rounded-xl bg-surface border border-dashed border-line">
            <p className="text-sm text-muted mb-3">
              Aucun exercice dans cette séance type.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="min-h-[48px] px-4 rounded-xl bg-gold text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
            >
              Ajouter un exercice
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((pe, index) => {
              const exName = pe.exercise?.name ?? 'Exercice inconnu';
              const isArchived = pe.exercise?.archived === true;

              return (
                <div
                  key={pe.id}
                  className="rounded-xl bg-surface border border-line p-4 shadow-none"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-muted w-5 tabular-nums">
                          #{index + 1}
                        </span>
                        <h3 className="text-base font-semibold text-text truncate">
                          {exName}
                        </h3>
                        {isArchived && (
                          <span className="inline-flex items-center rounded-full bg-surface-2 border border-line px-2 py-0.5 text-xs font-medium text-muted">
                            Archivé
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Bouton Monter ↑ */}
                      <button
                        type="button"
                        aria-label={`Monter ${exName}`}
                        disabled={index === 0}
                        onClick={() => pe.id && moveProgramExercise(pe.id, 'up')}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition ${
                          index === 0
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-muted hover:text-text active:bg-surface-2'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>

                      {/* Bouton Descendre ↓ */}
                      <button
                        type="button"
                        aria-label={`Descendre ${exName}`}
                        disabled={index === exercises.length - 1}
                        onClick={() => pe.id && moveProgramExercise(pe.id, 'down')}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition ${
                          index === exercises.length - 1
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-muted hover:text-text active:bg-surface-2'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      {/* Bouton Retirer */}
                      <button
                        type="button"
                        aria-label={`Retirer ${exName}`}
                        onClick={() => pe.id && removeExerciseFromProgram(pe.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-danger active:bg-surface-2 transition"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Réglage des séries de travail (l'échauffement n'est pas réglable ici, warmupSets = 1 par défaut) */}
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-xs uppercase tracking-widest text-muted font-medium tabular-nums">
                      Travail : {pe.workSets}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Diminuer séries de travail ${exName}`}
                        disabled={pe.workSets <= 1}
                        onClick={() =>
                          pe.id && handleWorkChange(pe.id, pe.workSets, -1)
                        }
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 border border-line text-lg font-bold transition ${
                          pe.workSets <= 1
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-text hover:bg-surface active:bg-surface-2'
                        }`}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label={`Augmenter séries de travail ${exName}`}
                        disabled={pe.workSets >= 6}
                        onClick={() =>
                          pe.id && handleWorkChange(pe.id, pe.workSets, 1)
                        }
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 border border-line text-lg font-bold transition ${
                          pe.workSets >= 6
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-text hover:bg-surface active:bg-surface-2'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal / Sélecteur d'ajout d'exercice */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-exercise-dialog-title"
          className="fixed inset-0 z-50 flex flex-col bg-surface overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2
                id="add-exercise-dialog-title"
                className="text-lg font-semibold text-text tracking-tight"
              >
                Ajouter un exercice
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Fermer"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-text active:bg-surface-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted mb-3 shrink-0">
              Choisissez un exercice à ajouter à la séance type.
            </p>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredAvailableExercises.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  Tous les exercices disponibles sont déjà dans cette séance type.
                </div>
              ) : (
                filteredAvailableExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => handleAddExercise(exercise)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line hover:border-gold/50 text-left flex items-center justify-between transition group"
                  >
                    <div>
                      <span className="text-sm font-semibold text-text">
                        {exercise.name}
                      </span>
                      <span className="block text-xs uppercase tracking-widest text-muted">
                        {exercise.muscleGroup}
                      </span>
                    </div>
                    <span className="text-gold text-sm font-bold">+</span>
                  </button>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-line mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full min-h-[48px] rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
