import {
  db,
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
  type Session,
  type SetEntry,
} from './schema';

/**
 * Poids moyen par rep pour une séance (sur les séries de travail 'work').
 * Renvoie null si sum(reps) === 0 ou en l'absence de série work (aucune division par zéro).
 * Préserve la précision flottante exacte.
 */
export function calculateAverageWeight(sets: SetEntry[]): number | null {
  const workSets = sets.filter((s) => s.type === 'work');
  if (workSets.length === 0) return null;

  let totalVolume = 0;
  let totalReps = 0;

  for (const s of workSets) {
    totalVolume += s.weight * s.reps;
    totalReps += s.reps;
  }

  if (totalReps === 0) return null;
  return totalVolume / totalReps;
}

/**
 * Volume total (somme de poids × reps) des séries de travail 'work'.
 */
export function calculateSessionVolume(sets: SetEntry[]): number {
  const workSets = sets.filter((s) => s.type === 'work');
  let volume = 0;
  for (const s of workSets) {
    volume += s.weight * s.reps;
  }
  return volume;
}

/**
 * Total de répétitions des séries de travail 'work'.
 */
export function calculateSessionReps(sets: SetEntry[]): number {
  const workSets = sets.filter((s) => s.type === 'work');
  let reps = 0;
  for (const s of workSets) {
    reps += s.reps;
  }
  return reps;
}

/**
 * Série record selon l'ordre strict de départage :
 * 1. Poids maximal ;
 * 2. En cas d'égalité de poids : nombre de répétitions maximal ;
 * 3. En cas d'égalité de poids et de répétitions : série la plus ancienne (createdAt le plus antérieur via <).
 */
export function findPersonalRecord(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;

  for (const s of sets) {
    if (s.type !== 'work') continue;
    if (!best) {
      best = s;
      continue;
    }

    if (s.weight > best.weight) {
      best = s;
    } else if (s.weight === best.weight) {
      if (s.reps > best.reps) {
        best = s;
      } else if (s.reps === best.reps) {
        if (s.createdAt < best.createdAt) {
          best = s;
        }
      }
    }
  }

  return best;
}

/**
 * Formatage du poids (arrondi à 0,5 kg le plus proche avec virgule pour les décimales) :
 * ex. "19\u00A0kg", "18,5\u00A0kg".
 * Formatage manuel sans toLocaleString ni Intl.NumberFormat.
 */
export function formatStatWeight(weight: number): string {
  const rounded = Math.round(weight * 2) / 2;
  const isHalf = rounded % 1 !== 0;
  if (isHalf) {
    return `${Math.floor(rounded)},5\u00A0kg`;
  }
  return `${rounded}\u00A0kg`;
}

/**
 * Formatage du volume (séparateur des milliers avec \u00A0) :
 * ex. "2\u00A0075\u00A0kg", "340\u00A0kg", "0\u00A0kg".
 * Formatage manuel sans toLocaleString ni Intl.NumberFormat.
 */
export function formatStatVolume(volume: number): string {
  const intStr = Math.round(volume).toString();
  const formatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${formatted}\u00A0kg`;
}

/**
 * Formatage du record personnel :
 * ex. "Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08", "Record\u00A0:\u00A00\u00A0kg\u00A0\u00D7\u00A010".
 */
export function formatPersonalRecord(record: SetEntry): string {
  return `Record\u00A0:\u00A0${formatStatWeight(record.weight)}\u00A0\u00D7\u00A0${record.reps}`;
}

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcule l'intervalle hebdomadaire (du lundi au dimanche) en UTC à partir d'une date 'YYYY-MM-DD'.
 */
export function getWeekRangeUtc(referenceDate: string): {
  startOfWeek: string;
  endOfWeek: string;
} {
  const [y, m, d] = referenceDate.split('-').map(Number);
  const timeUtc = Date.UTC(y, m - 1, d);
  const dayOfWeek = new Date(timeUtc).getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysToMonday = isoDay - 1;
  const mondayMs = timeUtc - daysToMonday * 86_400_000;
  const sundayMs = mondayMs + 6 * 86_400_000;

  return {
    startOfWeek: formatUtcDate(mondayMs),
    endOfWeek: formatUtcDate(sundayMs),
  };
}

export interface ExerciseStatPoint {
  sessionId: number;
  date: string;
  averageWeight: number | null;
  totalReps: number;
  volume: number;
  isRecord: boolean;
}

export interface ExerciseProgression {
  mode: 'weight' | 'reps';
  points: ExerciseStatPoint[];
  personalRecord: SetEntry | null;
}

/**
 * Construction de la progression d'un exercice sur les séances terminées (filtre endedAt !== undefined).
 */
export function buildExerciseProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exerciseId: number;
}): ExerciseProgression {
  const { sessions, sets, exerciseId } = params;

  // Filtrer les séances terminées
  const finishedSessions = sessions.filter((s) => s.endedAt !== undefined);
  const finishedSessionIds = new Set(finishedSessions.map((s) => s.id));

  // Séries work de l'exercice dans des séances terminées
  const exerciseWorkSets = sets.filter(
    (s) =>
      s.exerciseId === exerciseId &&
      s.type === 'work' &&
      s.sessionId !== undefined &&
      finishedSessionIds.has(s.sessionId)
  );

  const personalRecord = findPersonalRecord(exerciseWorkSets);

  // Détermination du mode : 'weight' dès qu'au moins une série work a un poids > 0 kg
  const mode: 'weight' | 'reps' = exerciseWorkSets.some((s) => s.weight > 0)
    ? 'weight'
    : 'reps';

  // Tri chronologique des séances terminées
  const sortedSessions = [...finishedSessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.endedAt && b.endedAt && a.endedAt !== b.endedAt) {
      return a.endedAt < b.endedAt ? -1 : 1;
    }
    return (a.id ?? 0) - (b.id ?? 0);
  });

  const points: ExerciseStatPoint[] = [];

  for (const session of sortedSessions) {
    if (session.id === undefined) continue;

    const sessionWorkSets = sets.filter(
      (s) =>
        s.sessionId === session.id &&
        s.exerciseId === exerciseId &&
        s.type === 'work'
    );

    // Aucune série pour cet exercice dans cette séance -> ignorée
    if (sessionWorkSets.length === 0) continue;

    const totalReps = calculateSessionReps(sessionWorkSets);
    if (totalReps === 0) continue;

    // En mode 'weight', les séances entièrement à 0 kg n'ont aucun point tracé
    if (mode === 'weight' && sessionWorkSets.every((s) => s.weight === 0)) {
      continue;
    }

    const averageWeight = calculateAverageWeight(sessionWorkSets);
    const volume = calculateSessionVolume(sessionWorkSets);
    const isRecord =
      personalRecord !== null && session.id === personalRecord.sessionId;

    points.push({
      sessionId: session.id,
      date: session.date,
      averageWeight,
      totalReps,
      volume,
      isRecord,
    });
  }

  return {
    mode,
    points,
    personalRecord,
  };
}

/**
 * Séries de travail hebdomadaires par groupe musculaire (renvoie les 11 groupes, 0 si vide).
 * referenceDate est une chaîne 'YYYY-MM-DD' comparée à sessions.date.
 * Ignore une série dont l'exercice est introuvable ou dont le muscleGroup n'est pas dans MUSCLE_GROUPS.
 */
export function calculateWeeklyWorkSetsByGroup(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, number> {
  const { sessions, sets, exercises, referenceDate } = params;

  const validGroups = new Set<string>(MUSCLE_GROUPS);
  const counts = {} as Record<MuscleGroup, number>;
  for (const group of MUSCLE_GROUPS) {
    counts[group] = 0;
  }

  const { startOfWeek, endOfWeek } = getWeekRangeUtc(referenceDate);

  const finishedSessionsInWeek = sessions.filter(
    (s) =>
      s.endedAt !== undefined &&
      s.date >= startOfWeek &&
      s.date <= endOfWeek &&
      s.id !== undefined
  );
  const sessionIdsInWeek = new Set(finishedSessionsInWeek.map((s) => s.id));

  const exerciseMap = new Map<number, Exercise>();
  for (const ex of exercises) {
    if (ex.id !== undefined) {
      exerciseMap.set(ex.id, ex);
    }
  }

  for (const set of sets) {
    if (set.type !== 'work') continue;
    if (!set.sessionId || !sessionIdsInWeek.has(set.sessionId)) continue;

    const exercise = exerciseMap.get(set.exerciseId);
    if (!exercise) continue; // Exercice introuvable : ignoré
    if (!validGroups.has(exercise.muscleGroup)) continue; // Groupe hors MUSCLE_GROUPS : ignoré

    counts[exercise.muscleGroup]++;
  }

  return counts;
}

/**
 * Charge les séances et les séries associées pour un exercice depuis Dexie.
 * Lecture seule, sans filtrage de endedAt ni de type de série.
 */
export async function loadExerciseStatsData(exerciseId: number): Promise<{
  sessions: Session[];
  sets: SetEntry[];
}> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
  const sessions =
    sessionIds.length > 0
      ? await db.sessions.where('id').anyOf(sessionIds).toArray()
      : [];

  return { sessions, sets };
}

/**
 * Charge les séances, séries et exercices nécessaires pour une semaine donnée depuis Dexie.
 * Lecture seule, sans filtrage de endedAt, ni de type de série, ni d'archivage.
 */
export async function loadWeeklyStatsData(weekDate: string): Promise<{
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
}> {
  const { startOfWeek, endOfWeek } = getWeekRangeUtc(weekDate);

  const sessions = await db.sessions
    .where('date')
    .between(startOfWeek, endOfWeek, true, true)
    .toArray();

  const sessionIds = sessions.map((s) => s.id!).filter(Boolean);
  const sets =
    sessionIds.length > 0
      ? await db.sets.where('sessionId').anyOf(sessionIds).toArray()
      : [];

  const exercises = await db.exercises.toArray();

  return { sessions, sets, exercises };
}
