import { db, toWeekday, type Program } from './schema';
import { getProgramsForWeekday } from './programs';

/**
 * Parse une saisie de poids (ex: "82,5", "82.5", "0").
 * Rejette formellement les chaînes non numériques ("82abc"), négatives ("-5"),
 * vides ou mal formées.
 * Arrondit au centième.
 */
export function parseWeight(input: string): number | null {
  const match = input.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (!match) {
    return null;
  }
  const normalized = match[1].replace(',', '.');
  const num = Number(normalized);
  if (Number.isNaN(num) || num < 0) {
    return null;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Parse une saisie de répétitions (entier ≥ 1).
 * Rejette formellement les décimaux, 0, négatifs et chaînes non numériques.
 */
export function parseReps(input: string): number | null {
  const match = input.match(/^\s*(\d+)\s*$/);
  if (!match) {
    return null;
  }
  const num = Number(match[1]);
  if (!Number.isInteger(num) || num < 1) {
    return null;
  }
  return num;
}

/**
 * Détermine le programme suggéré pour un jour donné.
 * Si plusieurs programmes sont prévus ce jour-là, sélectionne le premier par ordre alphabétique de nom.
 */
export async function getSuggestedProgramForDate(
  now: Date = new Date()
): Promise<Program | undefined> {
  const weekday = toWeekday(now);
  const programs = await getProgramsForWeekday(weekday);
  return programs.length > 0 ? programs[0] : undefined;
}

export interface WeightSuggestions {
  mode: number | null; // Poids de référence (nommé mode pour compatibilité de structure)
  step: number;
  buttons: number[];
  preselectedWeight: number | null;
  manualOnly: boolean;
}

export interface RepSuggestions {
  buttons: number[];
  preselectedReps: number | null;
}

export interface ExerciseSuggestions {
  weight: WeightSuggestions;
  reps: RepSuggestions;
}

/**
 * Calcule le poids de référence pour les vraies séries ('work') :
 * 1. Séance en cours contenant déjà une vraie série de cet exercice
 *    → poids de la dernière de ces séries.
 * 2. Sinon → poids le plus lourd parmi les vraies séries de la séance
 *    terminée la plus récente contenant au moins une vraie série de cet exercice.
 * 3. Sinon → null (saisie manuelle uniquement).
 *
 * Utilise l'historique indexé pour remonter les séries chronologiquement.
 */
export async function getReferenceWeight(
  exerciseId: number,
  currentSessionId?: number
): Promise<number | null> {
  const allSets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  allSets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 1. Séance en cours contenant déjà une vraie série
  if (currentSessionId !== undefined) {
    const currentWorkSets = allSets.filter(
      (s) => s.sessionId === currentSessionId && s.type === 'work'
    );
    if (currentWorkSets.length > 0) {
      // currentWorkSets[0] est la plus récente par createdAt
      return currentWorkSets[0].weight;
    }
  }

  // 2. Recherche de la séance terminée la plus récente contenant au moins une vraie série
  const workSets = allSets.filter((s) => s.type === 'work');
  if (workSets.length === 0) {
    return null;
  }

  const sessionIds = Array.from(
    new Set(
      workSets
        .map((s) => s.sessionId)
        .filter((sid) => sid !== currentSessionId)
    )
  );

  if (sessionIds.length === 0) {
    return null;
  }

  const sessions = await db.sessions
    .where('id')
    .anyOf(sessionIds)
    .toArray();

  const completedSessions = sessions.filter((s) => s.endedAt !== undefined);
  if (completedSessions.length === 0) {
    return null;
  }

  completedSessions.sort((a, b) => {
    const dateA = a.endedAt ?? a.startedAt;
    const dateB = b.endedAt ?? b.startedAt;
    return dateB.localeCompare(dateA);
  });

  const mostRecentSessionId = completedSessions[0].id!;

  const sessionWorkSets = workSets.filter(
    (s) => s.sessionId === mostRecentSessionId
  );

  if (sessionWorkSets.length === 0) {
    return null;
  }

  const maxWeight = Math.max(...sessionWorkSets.map((s) => s.weight));
  return Math.round(maxWeight * 100) / 100;
}

/**
 * Calcule le dernier poids d'échauffement utilisé sur cet exercice.
 */
async function getLastWarmupWeight(exerciseId: number): Promise<number | null> {
  const warmupSets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.type === 'warmup')
    .toArray();

  if (warmupSets.length === 0) {
    return null;
  }

  warmupSets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return warmupSets[0].weight;
}

/**
 * Fournit les suggestions de poids pour un exercice donné (série de travail ou échauffement).
 */
export async function getWeightSuggestions(
  exerciseId: number,
  options: { isWarmup: boolean; currentSessionId?: number }
): Promise<WeightSuggestions> {
  const exercise = await db.exercises.get(exerciseId);
  const step = exercise?.weightStep ?? 2.5;

  if (options.isWarmup) {
    const lastWarmup = await getLastWarmupWeight(exerciseId);
    if (lastWarmup === null) {
      return {
        mode: null,
        step,
        buttons: [],
        preselectedWeight: null,
        manualOnly: true,
      };
    }
    return {
      mode: lastWarmup,
      step,
      buttons: [lastWarmup],
      preselectedWeight: lastWarmup,
      manualOnly: false,
    };
  }

  // Vraie série
  const refWeight = await getReferenceWeight(
    exerciseId,
    options.currentSessionId
  );

  if (refWeight === null) {
    return {
      mode: null,
      step,
      buttons: [],
      preselectedWeight: null,
      manualOnly: true,
    };
  }

  const rawButtons = [
    refWeight - step,
    refWeight,
    refWeight + step,
    refWeight + 2 * step,
  ];

  const buttons = rawButtons
    .map((w) => Math.round(w * 100) / 100)
    .filter((w) => w >= 0);

  return {
    mode: refWeight,
    step,
    buttons,
    preselectedWeight: refWeight,
    manualOnly: false,
  };
}

/**
 * Fournit les suggestions de répétitions pour un exercice donné.
 * Présélection :
 * 1. Série précédente de cet exercice dans la séance en cours (warmup ou work).
 * 2. Sinon -> dernière vraie série ('work') de la séance terminée précédente.
 * 3. Sinon -> null.
 */
export async function getRepSuggestions(
  exerciseId: number,
  options: { currentSessionId: number }
): Promise<RepSuggestions> {
  const buttons = [6, 8, 10, 12];

  // 1. Série précédente dans la séance en cours
  const currentSets = await db.sets
    .where('sessionId')
    .equals(options.currentSessionId)
    .filter((s) => s.exerciseId === exerciseId)
    .toArray();

  if (currentSets.length > 0) {
    currentSets.sort((a, b) => b.order - a.order);
    return {
      buttons,
      preselectedReps: currentSets[0].reps,
    };
  }

  // 2. Dernière vraie série de la séance terminée précédente
  const allSets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  const pastWorkSets = allSets.filter(
    (s) => s.sessionId !== options.currentSessionId && s.type === 'work'
  );

  if (pastWorkSets.length > 0) {
    const pastSessionIds = Array.from(new Set(pastWorkSets.map((s) => s.sessionId)));
    const sessions = await db.sessions.where('id').anyOf(pastSessionIds).toArray();
    const completedSessions = sessions.filter((s) => s.endedAt !== undefined);

    if (completedSessions.length > 0) {
      completedSessions.sort((a, b) => {
        const dateA = a.endedAt ?? a.startedAt;
        const dateB = b.endedAt ?? b.startedAt;
        return dateB.localeCompare(dateA);
      });

      const mostRecentSessionId = completedSessions[0].id!;
      const sessionSets = pastWorkSets.filter((s) => s.sessionId === mostRecentSessionId);
      sessionSets.sort((a, b) => b.order - a.order);

      if (sessionSets.length > 0) {
        return {
          buttons,
          preselectedReps: sessionSets[0].reps,
        };
      }
    }
  }

  return {
    buttons,
    preselectedReps: null,
  };
}

/**
 * Combine suggestions de poids et de reps en une seule structure.
 */
export async function getExerciseSuggestions(
  exerciseId: number,
  options: { isWarmup: boolean; currentSessionId: number }
): Promise<ExerciseSuggestions> {
  const weight = await getWeightSuggestions(exerciseId, options);
  const reps = await getRepSuggestions(exerciseId, {
    currentSessionId: options.currentSessionId,
  });

  return {
    weight,
    reps,
  };
}
