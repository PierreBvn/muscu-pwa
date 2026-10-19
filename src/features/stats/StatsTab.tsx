import React, { useState } from 'react';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/schema';
import {
  useExerciseProgression,
  useGeneralProgression,
  useMusclesProgression,
  formatStatWeight,
  formatStatReps,
  formatStatSets,
  formatPersonalRecord,
} from '../../db/stats';
import { ExercisePicker } from '../../components/ExercisePicker';
import { MuscleGroupGrid } from '../../components/MuscleGroupGrid';
import { MuscleIcon } from '../../components/MuscleIcon';
import { LineChart } from './LineChart';

type StatsView = 'general' | 'muscles' | 'exercises';

export const StatsTab: React.FC = () => {
  const [view, setView] = useState<StatsView>('general');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Vue Général
  const generalResult = useGeneralProgression();
  const generalProgression = generalResult?.progression;
  const generalHasData = Boolean(
    generalProgression?.weeks.some((w) => w.index !== null)
  );

  // Vue Muscles
  const musclesResult = useMusclesProgression();
  const musclesProgression = musclesResult?.progression;

  const muscleSubtitles: Partial<Record<MuscleGroup, string>> = {};
  if (musclesProgression) {
    for (const group of MUSCLE_GROUPS) {
      muscleSubtitles[group] = musclesProgression[group]?.currentChange ?? '—';
    }
  }

  const selectedMuscleProg = selectedMuscle
    ? musclesProgression?.[selectedMuscle]
    : null;
  const selectedMuscleHasData = Boolean(
    selectedMuscleProg?.weeks.some((w) => w.index !== null || w.workSets > 0)
  );

  // Vue Exercices
  const exerciseResult = useExerciseProgression(selectedExercise?.id ?? null);
  const exerciseProgression = exerciseResult?.progression;
  const exercisePoints = exerciseProgression?.points ?? [];
  const exerciseLastPoint =
    exercisePoints.length > 0 ? exercisePoints[exercisePoints.length - 1] : null;

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
        {/* Contrôle segmenté : Général | Muscles | Exercices */}
        <div
          role="tablist"
          aria-label="Vues des statistiques"
          className="grid grid-cols-3 p-1 rounded-xl bg-surface-2 border border-line"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'general'}
            onClick={() => setView('general')}
            className={`min-h-[44px] py-2 px-3 text-sm rounded-lg font-semibold transition-all ${
              view === 'general'
                ? 'bg-surface text-gold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Général
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'muscles'}
            onClick={() => setView('muscles')}
            className={`min-h-[44px] py-2 px-3 text-sm rounded-lg font-semibold transition-all ${
              view === 'muscles'
                ? 'bg-surface text-gold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Muscles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'exercises'}
            onClick={() => setView('exercises')}
            className={`min-h-[44px] py-2 px-3 text-sm rounded-lg font-semibold transition-all ${
              view === 'exercises'
                ? 'bg-surface text-gold shadow-xs'
                : 'text-muted hover:text-text'
            }`}
          >
            Exercices
          </button>
        </div>

        {/* 1. VUE GÉNÉRAL */}
        {view === 'general' && (
          generalResult === undefined ? null : !generalHasData ? (
            <p className="text-center text-sm text-muted py-12">Aucune séance</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface border border-line p-4 space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                  Progression
                </span>
                <span className="text-2xl font-bold text-text tabular-nums tracking-tight">
                  {generalProgression?.currentChange}
                </span>
              </div>

              <LineChart
                points={
                  generalProgression?.weeks.map((w) => ({
                    date: w.weekStart,
                    value: w.index,
                  })) ?? []
                }
                mode="index"
                exerciseName="Général"
              />
            </div>
          )
        )}

        {/* 2. VUE MUSCLES */}
        {view === 'muscles' && (
          musclesResult === undefined ? null : selectedMuscle === null ? (
            /* Grille des 11 groupes musculaires */
            <MuscleGroupGrid
              subtitles={muscleSubtitles}
              onSelectGroup={(group) => setSelectedMuscle(group)}
            />
          ) : (
            /* Vue de détail d'un groupe musculaire */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedMuscle(null)}
                aria-label="Retour à la grille des muscles"
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-text min-h-[44px] transition"
              >
                <span aria-hidden="true">←</span>
                <span>Tous les muscles</span>
              </button>

              <div className="flex items-center gap-3">
                <MuscleIcon
                  group={selectedMuscle}
                  className="w-10 h-10 shrink-0 object-contain"
                />
                <h2 className="text-xl font-bold text-text truncate">{selectedMuscle}</h2>
              </div>

              {!selectedMuscleHasData ? (
                <p className="text-center text-sm text-muted py-12">Aucune séance</p>
              ) : (
                <div className="space-y-4">
                  {/* Cartouche résumé */}
                  <div className="rounded-2xl bg-surface border border-line p-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                        Progression
                      </span>
                      <span className="text-2xl font-bold text-text tabular-nums tracking-tight">
                        {selectedMuscleProg?.currentChange}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                        Cette semaine
                      </span>
                      <span className="text-lg font-bold text-text tabular-nums tracking-tight">
                        {formatStatSets(selectedMuscleProg?.currentWorkSets ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Courbe sur 8 semaines */}
                  {selectedMuscleProg?.weeks.some((w) => w.index !== null) && (
                    <LineChart
                      points={selectedMuscleProg.weeks.map((w) => ({
                        date: w.weekStart,
                        value: w.index,
                      }))}
                      mode="index"
                      exerciseName={selectedMuscle}
                    />
                  )}

                  {/* Historique des séries de travail par semaine */}
                  <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
                    {selectedMuscleProg?.weeks.map((w) => (
                      <div
                        key={w.weekStart}
                        className="flex items-center justify-between px-4 py-3 min-h-[44px]"
                      >
                        <span className="text-xs text-muted tabular-nums">
                          Du {w.weekStart} au {w.weekEnd}
                        </span>
                        <span className="text-sm font-semibold text-text tabular-nums">
                          {formatStatSets(w.workSets)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* 3. VUE EXERCICES (inchangée) */}
        {view === 'exercises' && (
          <div className="space-y-4">
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
            {selectedExercise === null ? null : exerciseResult === undefined ? null : exercisePoints.length === 0 ? (
              <p className="text-center text-sm text-muted py-12">Aucune séance</p>
            ) : (
              <div className="space-y-4">
                {/* Résumé au-dessus de la courbe */}
                <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                      {exerciseProgression?.mode === 'weight' ? 'Poids moyen' : 'Répétitions'}
                    </span>
                    <span className="text-2xl font-bold text-text tabular-nums tracking-tight">
                      {exerciseProgression?.mode === 'weight'
                        ? formatStatWeight(exerciseLastPoint?.averageWeight ?? 0)
                        : formatStatReps(exerciseLastPoint?.totalReps ?? 0)}
                    </span>
                  </div>

                  {exerciseProgression?.personalRecord && (
                    <div className="pt-2 border-t border-line flex items-center justify-between">
                      <span className="text-sm font-semibold text-gold">
                        {formatPersonalRecord(exerciseProgression.personalRecord)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Courbe de progression */}
                <LineChart
                  points={exercisePoints}
                  mode={exerciseProgression?.mode ?? 'weight'}
                  exerciseName={selectedExercise.name}
                />
              </div>
            )}
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
