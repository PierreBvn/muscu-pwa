import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Exercise, MuscleGroup } from '../db/schema';
import {
  filterExercises,
  getExerciseCountsByGroup,
  normalizeSearchText,
} from '../db/exercises';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { Portal } from './Portal';
import { MuscleIcon } from './MuscleIcon';
import { MuscleGroupGrid } from './MuscleGroupGrid';

export interface ExercisePickerProps {
  isOpen: boolean;
  title?: string;
  existingExerciseIds?: number[];
  includeArchived?: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => Promise<void> | void;
}

const ExercisePickerContent: React.FC<ExercisePickerProps> = ({
  title = 'Ajouter un exercice',
  existingExerciseIds,
  includeArchived = false,
  onClose,
  onSelectExercise,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Données emballées dans un objet via useLiveQuery pour distinguer chargement et résultat
  const queryResult = useLiveQuery(
    async () => {
      const counts = await getExerciseCountsByGroup({
        excludeIds: existingExerciseIds,
        includeArchived,
      });
      const available = await filterExercises({
        excludeIds: existingExerciseIds,
        includeArchived,
      });
      return { counts, available };
    },
    [existingExerciseIds ? existingExerciseIds.join(',') : '', String(includeArchived)]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Dès qu'on tape dans la recherche, on quitte le mode groupe pour chercher sur tous les groupes
    if (selectedGroup !== null) {
      setSelectedGroup(null);
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleSelectGroup = (group: MuscleGroup) => {
    setSelectedGroup(group);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleBackToGrid = () => {
    setSelectedGroup(null);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleSelect = async (exercise: Exercise) => {
    if (isAdding) return;
    try {
      setIsAdding(true);
      await onSelectExercise(exercise);
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const normalizedQuery = normalizeSearchText(searchQuery);

  let searchResults: Exercise[] = [];
  let groupExercises: Exercise[] = [];

  if (queryResult) {
    if (isSearching) {
      searchResults = queryResult.available.filter((ex) =>
        normalizeSearchText(ex.name).includes(normalizedQuery)
      );
    } else if (selectedGroup !== null) {
      groupExercises = queryResult.available.filter(
        (ex) => ex.muscleGroup === selectedGroup
      );
    }
  }

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-picker-title"
        className="fixed inset-0 z-modal flex flex-col bg-surface overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col p-4 overflow-hidden">
          {/* En-tête : titre + unique bouton de fermeture */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2
              id="exercise-picker-title"
              className="text-lg font-semibold text-text tracking-tight"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition"
            >
              ✕
            </button>
          </div>

          {/* Champ de recherche en 16px, sans autoFocus */}
          <div className="mb-3 shrink-0">
            <input
              type="text"
              inputMode="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Rechercher un exercice..."
              aria-label="Rechercher un exercice"
              className="w-full min-h-[44px] rounded-xl bg-surface-2 border border-line px-3.5 text-base text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
            />
          </div>

          {/* Zone de contenu défilante */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
            {queryResult === undefined ? null : isSearching ? (
              /* Vue 1 : Résultats de recherche (tous les groupes) */
              searchResults.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Aucun exercice</p>
              ) : (
                searchResults.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    aria-label={exercise.name}
                    onClick={() => handleSelect(exercise)}
                    disabled={isAdding}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-left transition flex items-center justify-between gap-3 group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <MuscleIcon group={exercise.muscleGroup} className="w-10 h-10 shrink-0 object-contain" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-text text-sm block line-clamp-2 break-words">
                          {exercise.name}
                        </span>
                        <span className="text-xs text-muted block truncate">
                          {exercise.muscleGroup}
                        </span>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-xs text-gold font-medium group-hover:translate-x-0.5 transition-transform shrink-0"
                    >
                      + Ajouter
                    </span>
                  </button>
                ))
              )
            ) : selectedGroup === null ? (
              /* Vue 2 : Grille des 11 groupes musculaires */
              <MuscleGroupGrid
                counts={queryResult.counts}
                onSelectGroup={handleSelectGroup}
              />
            ) : (
              /* Vue 3 : Exercices du groupe sélectionné */
              <div>
                <div className="flex items-center gap-3 mb-3">
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
                    <MuscleIcon group={selectedGroup} className="w-10 h-10 shrink-0 object-contain" />
                    <span className="text-base font-semibold text-text truncate">
                      {selectedGroup}
                    </span>
                  </div>
                </div>

                {groupExercises.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">Aucun exercice</p>
                ) : (
                  <div className="space-y-2">
                    {groupExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        aria-label={exercise.name}
                        onClick={() => handleSelect(exercise)}
                        disabled={isAdding}
                        className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-2 border border-line hover:border-gold/50 active:bg-surface text-left transition flex items-center justify-between gap-3 group disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-text text-sm block line-clamp-2 break-words">
                            {exercise.name}
                          </span>
                        </div>
                        <span
                          aria-hidden="true"
                          className="text-xs text-gold font-medium group-hover:translate-x-0.5 transition-transform shrink-0"
                        >
                          + Ajouter
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export const ExercisePicker: React.FC<ExercisePickerProps> = (props) => {
  useModalScrollLock(props.isOpen);
  if (!props.isOpen) return null;

  return <ExercisePickerContent {...props} />;
};
