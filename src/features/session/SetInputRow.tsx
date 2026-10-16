import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getWeightSuggestions,
  getRepSuggestions,
  parseWeight,
  parseReps,
} from '../../db/suggestions';

interface SetInputRowProps {
  sessionId: number;
  exerciseId: number;
  isWarmup: boolean;
  setLabel: string;
  onAddSet: (data: {
    weight: number;
    reps: number;
    type: 'warmup' | 'work';
  }) => Promise<void>;
}

export const SetInputRow: React.FC<SetInputRowProps> = ({
  sessionId,
  exerciseId,
  isWarmup,
  setLabel,
  onAddSet,
}) => {
  // Suggestions réactives de Dexie emballées
  const weightSuggestionsQuery = useLiveQuery(
    async () => ({
      data: await getWeightSuggestions(exerciseId, {
        isWarmup,
        currentSessionId: sessionId,
      }),
    }),
    [exerciseId, isWarmup, sessionId]
  );

  const repSuggestionsQuery = useLiveQuery(
    async () => ({
      data: await getRepSuggestions(exerciseId, {
        currentSessionId: sessionId,
        isWarmup,
      }),
    }),
    [exerciseId, isWarmup, sessionId]
  );

  // État local de personnalisation
  const [chosenWeight, setChosenWeight] = useState<number | null>(null);
  const [isCustomWeightMode, setIsCustomWeightMode] = useState<boolean | null>(null);
  const [customWeightInput, setCustomWeightInput] = useState<string>('');

  const [chosenReps, setChosenReps] = useState<number | null>(null);
  const [isCustomRepsMode, setIsCustomRepsMode] = useState<boolean | null>(null);
  const [customRepsInput, setCustomRepsInput] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (weightSuggestionsQuery === undefined || repSuggestionsQuery === undefined) {
    return null;
  }

  const weightSuggestions = weightSuggestionsQuery.data;
  const repSuggestions = repSuggestionsQuery.data;

  const hasWeightSuggestions =
    !weightSuggestions.manualOnly && weightSuggestions.buttons.length > 0;

  // Dérivation directe sans dépendre de useEffect asynchrone
  const isCustomWeight =
    !hasWeightSuggestions ||
    (isCustomWeightMode ??
      (weightSuggestions.manualOnly || weightSuggestions.preselectedWeight === null));

  const effectiveSelectedWeight = isCustomWeight
    ? null
    : (chosenWeight ?? weightSuggestions.preselectedWeight);

  const isCustomReps = isCustomRepsMode ?? false;

  const effectiveSelectedReps = isCustomReps
    ? null
    : (chosenReps ?? repSuggestions.preselectedReps);

  const handleWeightBtnClick = (val: number) => {
    setChosenWeight(val);
    setIsCustomWeightMode(false);
    setError(null);
  };

  const handleCustomWeightBtnClick = () => {
    setIsCustomWeightMode(true);
    setChosenWeight(null);
    setError(null);
  };

  const handleRepBtnClick = (val: number) => {
    setChosenReps(val);
    setIsCustomRepsMode(false);
    setError(null);
  };

  const handleCustomRepsBtnClick = () => {
    setIsCustomRepsMode(true);
    setChosenReps(null);
    setError(null);
  };

  const handleValidate = async () => {
    if (isSubmitting) return;
    setError(null);

    // Résolution du poids
    let finalWeight: number | null;
    if (isCustomWeight) {
      const parsed = parseWeight(customWeightInput);
      if (parsed === null) {
        setError('Poids invalide (nombre positif ou nul attendu).');
        return;
      }
      finalWeight = parsed;
    } else {
      finalWeight = effectiveSelectedWeight;
    }

    if (finalWeight === null) {
      setError('Veuillez sélectionner ou saisir un poids.');
      return;
    }

    // Résolution des répétitions
    let finalReps: number | null;
    if (isCustomReps) {
      const parsed = parseReps(customRepsInput);
      if (parsed === null) {
        setError('Répétitions invalides (entier supérieur ou égal à 1 attendu).');
        return;
      }
      finalReps = parsed;
    } else {
      finalReps = effectiveSelectedReps;
    }

    if (finalReps === null) {
      setError('Veuillez sélectionner ou saisir le nombre de répétitions.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddSet({
        weight: finalWeight,
        reps: finalReps,
        type: isWarmup ? 'warmup' : 'work',
      });
      setError(null);
      // Réinitialiser les choix pour la prochaine série
      setChosenWeight(null);
      setIsCustomWeightMode(null);
      setCustomWeightInput('');
      setChosenReps(null);
      setIsCustomRepsMode(null);
      setCustomRepsInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl bg-surface-2/40 border border-line p-3.5 space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-gold font-semibold">
          {setLabel}
        </h3>
      </div>

      {/* Sélection du poids */}
      <div>
        <span className="block text-xs uppercase tracking-widest text-muted mb-1.5">
          Poids (kg)
        </span>

        {hasWeightSuggestions ? (
          <>
            <div className="w-full flex items-center justify-between gap-1.5">
              {weightSuggestions.buttons.map((btnWeight) => {
                const isSelected = !isCustomWeight && effectiveSelectedWeight === btnWeight;
                const isRef = weightSuggestions.mode === btnWeight;

                return (
                  <button
                    key={btnWeight}
                    type="button"
                    onClick={() => handleWeightBtnClick(btnWeight)}
                    aria-label={`${btnWeight} kg`}
                    className={`min-h-[44px] flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold tabular-nums transition flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-gold text-gold-ink shadow-sm'
                        : 'bg-surface-2 border border-line text-text hover:bg-surface'
                    }`}
                  >
                    <span>{btnWeight}</span>
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isRef
                          ? isSelected
                            ? 'bg-gold-ink'
                            : 'bg-gold'
                          : 'bg-transparent'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleCustomWeightBtnClick}
                aria-label="Autre poids"
                className={`min-h-[44px] flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold transition flex flex-col items-center justify-center gap-0.5 ${
                  isCustomWeight
                    ? 'bg-gold text-gold-ink shadow-sm'
                    : 'bg-surface-2 border border-line text-text hover:bg-surface'
                }`}
              >
                <span>Autre</span>
                <span className="w-1 h-1 rounded-full bg-transparent" aria-hidden="true" />
              </button>
            </div>

            {isCustomWeight && (
              <div className="mt-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customWeightInput}
                  onChange={(e) => {
                    setCustomWeightInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ex: 82,5"
                  aria-label="Poids personnalisé"
                  className="w-full min-h-[44px] rounded-xl bg-surface border border-line px-3 text-sm text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold tabular-nums transition"
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-1">
            <input
              type="text"
              inputMode="decimal"
              value={customWeightInput}
              onChange={(e) => {
                setCustomWeightInput(e.target.value);
                setError(null);
              }}
              placeholder="Ex: 82,5"
              aria-label="Poids personnalisé"
              autoFocus
              className="w-full min-h-[44px] rounded-xl bg-surface border border-line px-3 text-sm text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold tabular-nums transition"
            />
          </div>
        )}
      </div>

      {/* Sélection des répétitions */}
      <div>
        <span className="block text-xs uppercase tracking-widest text-muted mb-1.5">
          Répétitions
        </span>
        <div className="w-full flex items-center justify-between gap-1.5">
          {repSuggestions.buttons.map((btnReps) => {
            const isSelected = !isCustomReps && effectiveSelectedReps === btnReps;

            return (
              <button
                key={btnReps}
                type="button"
                onClick={() => handleRepBtnClick(btnReps)}
                aria-label={`${btnReps} reps`}
                className={`min-h-[44px] flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold tabular-nums transition flex items-center justify-center ${
                  isSelected
                    ? 'bg-gold text-gold-ink shadow-sm'
                    : 'bg-surface-2 border border-line text-text hover:bg-surface'
                }`}
              >
                {btnReps}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleCustomRepsBtnClick}
            aria-label="Autres répétitions"
            className={`min-h-[44px] flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold transition flex items-center justify-center ${
              isCustomReps
                ? 'bg-gold text-gold-ink shadow-sm'
                : 'bg-surface-2 border border-line text-text hover:bg-surface'
            }`}
          >
            Autre
          </button>
        </div>

        {isCustomReps && (
          <div className="mt-2">
            <input
              type="text"
              inputMode="numeric"
              value={customRepsInput}
              onChange={(e) => {
                setCustomRepsInput(e.target.value);
                setError(null);
              }}
              placeholder="Ex: 10"
              aria-label="Répétitions personnalisées"
              className="w-full min-h-[44px] rounded-xl bg-surface border border-line px-3 text-sm text-text placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold tabular-nums transition"
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger font-medium">
          {error}
        </p>
      )}

      {/* Bouton de validation (1 seul tap si rien ne change) */}
      <button
        type="button"
        onClick={handleValidate}
        disabled={isSubmitting}
        className="w-full min-h-[48px] rounded-xl bg-gold px-4 text-sm font-semibold text-gold-ink hover:opacity-95 active:opacity-90 transition shadow-md shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>
          {isSubmitting ? 'Enregistrement...' : `Valider ${setLabel}`}
        </span>
      </button>
    </div>
  );
};
