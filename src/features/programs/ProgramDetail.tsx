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
import { ExercisePicker } from '../../components/ExercisePicker';
import { MuscleIcon } from '../../components/MuscleIcon';

interface ProgramDetailProps {
  programId: number;
  onBack: () => void;
}

export const ProgramDetail: React.FC<ProgramDetailProps> = ({
  programId,
  onBack,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Données du programme et ses exercices enrichis emballées
  const programDataQuery = useLiveQuery(
    async () => ({ data: await getProgramWithExercises(programId) }),
    [programId]
  );

  if (programDataQuery === undefined) {
    return null;
  }

  const programData = programDataQuery.data;

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
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
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
        </div>
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
                    <div className="flex items-center gap-3 min-w-0">
                      {pe.exercise?.muscleGroup && (
                        <MuscleIcon
                          group={pe.exercise.muscleGroup}
                          alt={pe.exercise.muscleGroup}
                          className="w-10 h-10 shrink-0 object-contain"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-muted tabular-nums">
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
      <ExercisePicker
        isOpen={isAddModalOpen}
        title="Ajouter un exercice"
        existingExerciseIds={exercises.map((pe) => pe.exerciseId)}
        onClose={() => setIsAddModalOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </div>
  );
};
