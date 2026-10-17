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
import { MuscleGroupBadge } from '../../components/MuscleGroupBadge';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseModal } from './ExerciseModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const ExerciseList: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultGroup, setModalDefaultGroup] = useState<MuscleGroup | undefined>(undefined);
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

  const handleSelectGroup = (group: MuscleGroup) => {
    setSelectedGroup(group);
    window.scrollTo(0, 0);
  };

  const handleBackToGrid = () => {
    setSelectedGroup(null);
    window.scrollTo(0, 0);
  };

  const handleOpenAdd = (defaultGroup?: MuscleGroup) => {
    setEditingExercise(null);
    setModalDefaultGroup(defaultGroup);
    setModalOpen(true);
  };

  const handleOpenEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalDefaultGroup(exercise.muscleGroup);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExercise(null);
    setModalDefaultGroup(undefined);
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

  const selectedExercises = selectedGroup && groupedExercises ? groupedExercises[selectedGroup] : [];
  const selectedCount = selectedExercises.length;

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]">
      {/* En-tête */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          {selectedGroup === null ? (
            <>
              <div>
                <h1 className="text-xl font-semibold text-text tracking-tight">
                  Bibliothèque d’exercices
                </h1>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition"
              >
                <span className="text-lg leading-none">+</span>
                <span>Ajouter</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBackToGrid}
                  aria-label="Retour"
                  className="flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-muted hover:text-text active:opacity-80 transition-colors"
                >
                  <span className="text-base mr-1">‹</span>
                  <span>Retour</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <MuscleGroupBadge muscleGroup={selectedGroup} />
                  <div className="min-w-0">
                    <h1 className="text-base font-semibold text-text truncate">
                      {selectedGroup}
                    </h1>
                    <span className="text-xs text-muted tabular-nums">
                      {selectedCount} {selectedCount > 1 ? 'exercices' : 'exercice'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAdd(selectedGroup)}
                className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gold px-3 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition shrink-0"
              >
                <span className="text-lg leading-none">+</span>
                <span>Ajouter</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 px-4 py-5">
        {groupedExercises === undefined ? null : selectedGroup === null ? (
          /* Vue grille 2 colonnes */
          <div className="grid grid-cols-2 gap-3">
            {MUSCLE_GROUPS.map((group) => {
              const list = groupedExercises[group] || [];
              const count = list.length;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => handleSelectGroup(group)}
                  className="min-h-[88px] p-3.5 rounded-xl bg-surface border border-line flex flex-col justify-between items-start text-left hover:border-gold/50 active:bg-surface-2 transition-colors focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <MuscleGroupBadge muscleGroup={group} />
                  <div className="mt-3 w-full">
                    <span className="block font-bold text-text text-sm leading-tight truncate">
                      {group}
                    </span>
                    <span className="block text-xs text-muted tabular-nums mt-0.5">
                      {count} {count > 1 ? 'exercices' : 'exercice'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Vue détaillée d'un groupe musculaire */
          <div>
            {selectedExercises.length === 0 ? (
              <p className="text-center text-sm text-muted py-12">
                Aucun exercice
              </p>
            ) : (
              <div className="space-y-2">
                {selectedExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={handleOpenEdit}
                    onDelete={(ex) => setExerciseToDelete(ex)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal d'ajout / modification */}
      <ExerciseModal
        isOpen={modalOpen}
        exercise={editingExercise}
        defaultMuscleGroup={modalDefaultGroup}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={exerciseToDelete !== null}
        title="Supprimer l’exercice ?"
        titleId="delete-dialog-title"
        message={
          exerciseToDelete ? (
            <>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong className="text-text font-semibold">
                « {exerciseToDelete.name} »
              </strong>{' '}
              ? Il sera retiré de la bibliothèque.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Supprimer"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setExerciseToDelete(null)}
      />
    </div>
  );
};
