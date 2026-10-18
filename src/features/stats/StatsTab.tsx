import React, { useState } from 'react';
import type { Exercise } from '../../db/schema';
import {
  useExerciseProgression,
  formatStatWeight,
  formatStatReps,
  formatPersonalRecord,
} from '../../db/stats';
import { ExercisePicker } from '../../components/ExercisePicker';
import { MuscleIcon } from '../../components/MuscleIcon';
import { LineChart } from './LineChart';

export const StatsTab: React.FC = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const progressionResult = useExerciseProgression(selectedExercise?.id ?? null);
  const progression = progressionResult?.progression;

  const points = progression?.points ?? [];
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="w-full max-w-md mx-auto min-h-svh bg-bg text-text flex flex-col pt-header pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]">
      {/* En-tête fixe avec safe-area-inset-top */}
      <header className="fixed top-0 left-0 right-0 z-header bg-bg/95 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between h-[var(--header-height)]">
          <h1 className="text-xl font-semibold text-text tracking-tight">Progrès</h1>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Bouton de choix / changement d'exercice */}
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          aria-label={
            selectedExercise
              ? `Changer d'exercice, sélectionné : ${selectedExercise.name}`
              : 'Choisir un exercice'
          }
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-surface border border-line flex items-center justify-between hover:border-gold/50 active:bg-surface-2 transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedExercise && (
              <MuscleIcon
                group={selectedExercise.muscleGroup}
                className="w-8 h-8 shrink-0 object-contain"
              />
            )}
            <span className="font-semibold text-base text-text truncate">
              {selectedExercise ? selectedExercise.name : 'Choisir un exercice'}
            </span>
          </div>
          <span className="text-sm font-medium text-gold shrink-0">
            {selectedExercise ? 'Changer' : 'Sélectionner'}
          </span>
        </button>

        {/* Aucun exercice choisi : uniquement le bouton */}
        {selectedExercise === null ? null : progressionResult === undefined ? null : points.length === 0 ? (
          /* Exercice sans séance terminée : « Aucune séance ». Aucun autre texte. */
          <p className="text-center text-sm text-muted py-12">Aucune séance</p>
        ) : (
          /* Exercice avec séances terminées */
          <div className="space-y-4">
            {/* Résumé au-dessus de la courbe : poids moyen de la dernière séance terminée, puis le record */}
            <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
              {/* Métrique principale : Poids moyen ou Répétitions de la dernière séance */}
              <div>
                <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                  {progression?.mode === 'weight' ? 'Poids moyen' : 'Répétitions'}
                </span>
                <span className="text-2xl font-bold text-text tabular-nums tracking-tight">
                  {progression?.mode === 'weight'
                    ? formatStatWeight(lastPoint?.averageWeight ?? 0)
                    : formatStatReps(lastPoint?.totalReps ?? 0)}
                </span>
              </div>

              {/* Record personnel */}
              {progression?.personalRecord && (
                <div className="pt-2 border-t border-line flex items-center justify-between">
                  <span className="text-sm font-semibold text-gold">
                    {formatPersonalRecord(progression.personalRecord)}
                  </span>
                </div>
              )}
            </div>

            {/* Courbe de progression */}
            <LineChart
              points={points}
              mode={progression?.mode ?? 'weight'}
              exerciseName={selectedExercise.name}
            />
          </div>
        )}
      </main>

      {/* ExercisePicker partagé avec support des archivés */}
      <ExercisePicker
        isOpen={isPickerOpen}
        title="Choisir un exercice"
        includeArchived={true}
        onClose={() => setIsPickerOpen(false)}
        onSelectExercise={(exercise) => {
          setSelectedExercise(exercise);
          setIsPickerOpen(false);
        }}
      />
    </div>
  );
};
