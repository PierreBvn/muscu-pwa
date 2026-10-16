import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/schema';
import {
  seedExercisesIfNeeded,
  getExercisesByGroup,
  addExercise,
  updateExercise,
  deleteExercise,
} from '../../db/exercises';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseModal } from './ExerciseModal';

export const ExerciseList: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  // Initialisation du seed au premier chargement
  useEffect(() => {
    seedExercisesIfNeeded().catch((err) => {
      console.error('Erreur lors du seed initial des exercices :', err);
    });
  }, []);

  // Requête réactive via useLiveQuery emballée
  const groupedExercisesQuery = useLiveQuery(
    async () => ({ groups: await getExercisesByGroup() }),
    []
  );
  const groupedExercises = groupedExercisesQuery?.groups;

  const handleOpenAdd = () => {
    setEditingExercise(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExercise(null);
  };

  const handleSave = async (data: { name: string; muscleGroup: MuscleGroup }) => {
    if (editingExercise?.id) {
      await updateExercise(editingExercise.id, data);
    } else {
      await addExercise(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (exerciseToDelete?.id) {
      await deleteExercise(exerciseToDelete.id);
      setExerciseToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header">
      {/* En-tête */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <div>
            <h1 className="text-xl font-semibold text-text tracking-tight">
              Bibliothèque d’exercices
            </h1>
            <p className="text-xs text-muted">
              Gérez vos exercices par groupe musculaire
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
          >
            <span className="text-lg leading-none">+</span>
            <span>Ajouter</span>
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 px-4 py-5 space-y-6">
        {groupedExercises === undefined ? null : (
          MUSCLE_GROUPS.map((group) => {
            const list = groupedExercises[group] || [];
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <h2
                    id={`group-${group}`}
                    className="text-xs uppercase tracking-widest text-muted font-semibold"
                  >
                    {group}
                  </h2>
                  <span className="text-xs font-medium text-muted tabular-nums">
                    {list.length} {list.length > 1 ? 'exercices' : 'exercice'}
                  </span>
                </div>

                {list.length === 0 ? (
                  <p className="text-xs text-muted italic py-2">
                    Aucun exercice dans ce groupe.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {list.map((exercise) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onEdit={handleOpenEdit}
                        onDelete={(ex) => setExerciseToDelete(ex)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>

      {/* Modal d'ajout / modification */}
      <ExerciseModal
        isOpen={modalOpen}
        exercise={editingExercise}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      {/* Dialogue de confirmation de suppression */}
      {exerciseToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-surface border border-line p-5 shadow-2xl">
            <h3
              id="delete-dialog-title"
              className="text-lg font-semibold text-text tracking-tight mb-2"
            >
              Supprimer l’exercice ?
            </h3>
            <p className="text-sm text-muted mb-5">
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong className="text-text font-semibold">
                « {exerciseToDelete.name} »
              </strong>{' '}
              ? Il sera retiré de la bibliothèque.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExerciseToDelete(null)}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-text hover:bg-surface active:opacity-90 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[48px] items-center justify-center rounded-xl bg-danger text-sm font-semibold text-text hover:opacity-95 active:opacity-90 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
