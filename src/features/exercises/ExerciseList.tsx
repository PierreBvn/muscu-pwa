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

  // Requête réactive via useLiveQuery
  const groupedExercises = useLiveQuery(
    async () => await getExercisesByGroup(),
    [],
    undefined
  );

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
    <div className="w-full max-w-md mx-auto min-h-svh bg-zinc-950 text-zinc-100 flex flex-col pb-12">
      {/* En-tête */}
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Bibliothèque d’exercices
          </h1>
          <p className="text-xs text-zinc-400">
            Gérez vos exercices par groupe musculaire
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 active:bg-purple-700 transition"
        >
          <span className="text-lg leading-none">+</span>
          <span>Ajouter</span>
        </button>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 px-4 py-5 space-y-6">
        {groupedExercises === undefined ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
            Chargement des exercices...
          </div>
        ) : (
          MUSCLE_GROUPS.map((group) => {
            const list = groupedExercises[group] || [];
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <h2
                    id={`group-${group}`}
                    className="text-sm font-semibold uppercase tracking-wider text-purple-400"
                  >
                    {group}
                  </h2>
                  <span className="text-xs font-medium text-zinc-500">
                    {list.length} {list.length > 1 ? 'exercices' : 'exercice'}
                  </span>
                </div>

                {list.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 p-5 shadow-2xl">
            <h3
              id="delete-dialog-title"
              className="text-lg font-bold text-white mb-2"
            >
              Supprimer l’exercice ?
            </h3>
            <p className="text-sm text-zinc-300 mb-5">
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong className="text-white font-semibold">
                « {exerciseToDelete.name} »
              </strong>{' '}
              ? Il sera retiré de la bibliothèque.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExerciseToDelete(null)}
                className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-700 active:bg-zinc-750"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[44px] items-center justify-center rounded-xl bg-red-600 text-sm font-semibold text-white shadow-md shadow-red-600/30 hover:bg-red-500 active:bg-red-700"
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
