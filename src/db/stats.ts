import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
  type Session,
  type SetEntry,
} from './schema';
import { formatLocalDate } from './sessions';

/**
 * Poids moyen par rep pour une séance (sur les séries de travail 'work').
 * Renvoie null si sum(reps) === 0 ou en l'absence de série work (aucune division par zéro).
 * Préserve la précision flottante exacte.
 */
export function calculateAverageWeight(sets: SetEntry[]): number | null {
  const workSets = sets.filter((s) => s.type === 'work');
  if (workSets.length === 0) return null;

  let totalWeightReps = 0;
  let totalReps = 0;

  for (const s of workSets) {
    totalWeightReps += s.weight * s.reps;
    totalReps += s.reps;
  }

  if (totalReps === 0) return null;
  return totalWeightReps / totalReps;
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
 * Formatage du record personnel :
 * ex. "Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08", "Record\u00A0:\u00A00\u00A0kg\u00A0\u00D7\u00A010".
 */
export function formatPersonalRecord(record: SetEntry): string {
  return `Record\u00A0:\u00A0${formatStatWeight(record.weight)}\u00A0\u00D7\u00A0${record.reps}`;
}

/**
 * Formatage des répétitions (pour le mode reps 0 kg) :
 * ex. "25\u00A0reps", "1\u00A0rep", "0\u00A0rep".
 * Formatage manuel sans toLocaleString ni Intl.NumberFormat.
 */
export function formatStatReps(reps: number): string {
  const intStr = Math.round(reps).toString();
  const formatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const unit = Math.abs(reps) <= 1 ? 'rep' : 'reps';
  return `${formatted}\u00A0${unit}`;
}

/**
 * Formatage des séries de travail :
 * ex. "7\u00A0séries", "1\u00A0série", "0\u00A0série".
 * Formatage manuel sans toLocaleString ni Intl.NumberFormat.
 */
export function formatStatSets(sets: number): string {
  const intStr = Math.round(sets).toString();
  const formatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const unit = Math.abs(sets) <= 1 ? 'série' : 'séries';
  return `${formatted}\u00A0${unit}`;
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
    const isRecord =
      personalRecord !== null && session.id === personalRecord.sessionId;

    points.push({
      sessionId: session.id,
      date: session.date,
      averageWeight,
      totalReps,
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
 * Hook de chargement réactif de la progression d'un exercice.
 * Emballe le résultat dans un objet { progression } pour distinguer l'état de chargement (undefined).
 */
export function useExerciseProgression(exerciseId: number | null):
  | { progression: ExerciseProgression | null }
  | undefined {
  return useLiveQuery(
    async () => {
      if (exerciseId === null) {
        return { progression: null };
      }
      const { sessions, sets } = await loadExerciseStatsData(exerciseId);
      const progression = buildExerciseProgression({ sessions, sets, exerciseId });
      return { progression };
    },
    [exerciseId]
  );
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

/**
 * Calcule les 8 plages de semaines calendaires consécutives (du lundi au dimanche) en UTC
 * se terminant par celle de referenceDate.
 * Renvoie un tableau de 8 éléments ordonnés chronologiquement (de la plus ancienne à la courante).
 */
export function getEightWeeksRangeUtc(referenceDate: string): Array<{
  startOfWeek: string;
  endOfWeek: string;
}> {
  const currentWeek = getWeekRangeUtc(referenceDate);
  const [y, m, d] = currentWeek.startOfWeek.split('-').map(Number);
  const currentMondayUtc = Date.UTC(y, m - 1, d);

  const ranges: Array<{ startOfWeek: string; endOfWeek: string }> = [];

  for (let i = 0; i < 8; i++) {
    const mondayMs = currentMondayUtc - (7 - i) * 7 * 86_400_000;
    const sundayMs = mondayMs + 6 * 86_400_000;
    ranges.push({
      startOfWeek: formatUtcDate(mondayMs),
      endOfWeek: formatUtcDate(sundayMs),
    });
  }

  return ranges;
}

/**
 * Formatage de la variation d'indice par rapport à 100 :
 * Écart = index - 100
 * ex. "+5,8\u00A0%", "−2,0\u00A0%", "0,0\u00A0%". Renvoie "—" si index === null.
 * Formatage manuel sans toLocaleString ni Intl.NumberFormat.
 */
export function formatIndexChange(index: number | null): string {
  if (index === null) return '—';

  const diff = index - 100;
  const rounded = Math.round(diff * 10) / 10;

  if (rounded === 0 || Object.is(rounded, -0)) {
    return '0,0\u00A0%';
  }

  if (rounded > 0) {
    return `+${rounded.toFixed(1).replace('.', ',')}\u00A0%`;
  }

  return `\u2212${Math.abs(rounded).toFixed(1).replace('.', ',')}\u00A0%`;
}

export interface WeeklyGeneralStatPoint {
  weekStart: string;
  weekEnd: string;
  index: number | null;
  sessionCount: number;
}

export interface GeneralProgression {
  weeks: WeeklyGeneralStatPoint[];
  currentChange: string;
}

interface ProgressionCoreWeek {
  weekStart: string;
  weekEnd: string;
  index: number | null;
  workSets: number;
  sessionCount: number;
}

/**
 * Moteur interne pur calculant l'indice hebdomadaire et le décompte des séries/séances
 * pour une liste d'exercices cibles sur 8 semaines consécutives.
 */
function computeProgressionCore(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): {
  weeks: ProgressionCoreWeek[];
  currentChange: string;
} {
  const { sessions, sets, exercises, referenceDate } = params;

  const eightWeeks = getEightWeeksRangeUtc(referenceDate);

  // Filtrer les séances terminées
  const finishedSessions = sessions.filter(
    (s) => s.endedAt !== undefined && s.id !== undefined
  );

  // Compter les séances par semaine
  const sessionCountByWeek = new Array<number>(8).fill(0);
  const finishedSessionsByWeek = new Map<number, Set<number>>();

  for (let w = 0; w < 8; w++) {
    finishedSessionsByWeek.set(w, new Set<number>());
  }

  for (const session of finishedSessions) {
    for (let w = 0; w < 8; w++) {
      if (
        session.date >= eightWeeks[w].startOfWeek &&
        session.date <= eightWeeks[w].endOfWeek
      ) {
        sessionCountByWeek[w]++;
        finishedSessionsByWeek.get(w)!.add(session.id!);
        break;
      }
    }
  }

  const validExerciseIds = new Set(
    exercises.map((e) => e.id).filter((id): id is number => id !== undefined)
  );

  const allFinishedSessionIds = new Set<number>();
  for (let w = 0; w < 8; w++) {
    for (const sid of finishedSessionsByWeek.get(w)!) {
      allFinishedSessionIds.add(sid);
    }
  }

  const periodWorkSets = sets.filter(
    (s) =>
      s.type === 'work' &&
      s.sessionId !== undefined &&
      allFinishedSessionIds.has(s.sessionId) &&
      validExerciseIds.has(s.exerciseId)
  );

  // Règle d : exercices dont toutes les séries de la période sont à 0 kg sont exclus
  const exerciseWeightsInPeriod = new Map<number, number[]>();
  for (const s of periodWorkSets) {
    if (!exerciseWeightsInPeriod.has(s.exerciseId)) {
      exerciseWeightsInPeriod.set(s.exerciseId, []);
    }
    exerciseWeightsInPeriod.get(s.exerciseId)!.push(s.weight);
  }

  const eligibleExerciseIds = new Set<number>();
  for (const [exId, weights] of exerciseWeightsInPeriod.entries()) {
    if (weights.some((w) => w > 0)) {
      eligibleExerciseIds.add(exId);
    }
  }

  // Calcul du poids moyen par exercice et par semaine
  const exerciseWeeklyAvg = new Map<number, Map<number, number>>();
  for (const exId of eligibleExerciseIds) {
    exerciseWeeklyAvg.set(exId, new Map<number, number>());
  }

  const workSetsByWeek = new Array<number>(8).fill(0);

  for (let w = 0; w < 8; w++) {
    const sidsInWeek = finishedSessionsByWeek.get(w)!;
    if (sidsInWeek.size === 0) continue;

    const allWeekWorkSets = periodWorkSets.filter((s) => sidsInWeek.has(s.sessionId!));
    workSetsByWeek[w] = allWeekWorkSets.length;

    const weekSets = allWeekWorkSets.filter((s) => eligibleExerciseIds.has(s.exerciseId));

    const setsByEx = new Map<number, SetEntry[]>();
    for (const s of weekSets) {
      if (!setsByEx.has(s.exerciseId)) {
        setsByEx.set(s.exerciseId, []);
      }
      setsByEx.get(s.exerciseId)!.push(s);
    }

    for (const [exId, exSets] of setsByEx.entries()) {
      const avg = calculateAverageWeight(exSets);
      if (avg !== null && avg > 0) {
        exerciseWeeklyAvg.get(exId)!.set(w, avg);
      }
    }
  }

  // Semaine de base pour chaque exercice (première semaine où avg > 0)
  const exerciseBaseValue = new Map<number, number>();
  for (const exId of eligibleExerciseIds) {
    for (let w = 0; w < 8; w++) {
      const avg = exerciseWeeklyAvg.get(exId)!.get(w);
      if (avg !== undefined && avg > 0) {
        exerciseBaseValue.set(exId, avg);
        break;
      }
    }
  }

  // Calcul de l'indice hebdomadaire
  const weeks: ProgressionCoreWeek[] = [];

  for (let w = 0; w < 8; w++) {
    const indicesInWeek: number[] = [];

    for (const exId of eligibleExerciseIds) {
      const avg = exerciseWeeklyAvg.get(exId)!.get(w);
      const base = exerciseBaseValue.get(exId);
      if (avg !== undefined && base !== undefined && base > 0) {
        const exIndex = (avg / base) * 100;
        indicesInWeek.push(exIndex);
      }
    }

    let weekIndex: number | null = null;
    if (indicesInWeek.length > 0) {
      const sum = indicesInWeek.reduce((acc, val) => acc + val, 0);
      weekIndex = sum / indicesInWeek.length;
    }

    weeks.push({
      weekStart: eightWeeks[w].startOfWeek,
      weekEnd: eightWeeks[w].endOfWeek,
      index: weekIndex,
      workSets: workSetsByWeek[w],
      sessionCount: sessionCountByWeek[w],
    });
  }

  const currentChange = formatIndexChange(weeks[7].index);

  return {
    weeks,
    currentChange,
  };
}

/**
 * Calcul de la progression générale sur 8 semaines (indice et nombre de séances).
 */
export function calculateGeneralProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): GeneralProgression {
  const core = computeProgressionCore(params);
  return {
    weeks: core.weeks.map((w) => ({
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      index: w.index,
      sessionCount: w.sessionCount,
    })),
    currentChange: core.currentChange,
  };
}

export interface WeeklyMuscleStatPoint {
  weekStart: string;
  weekEnd: string;
  index: number | null;
  workSets: number;
}

export interface MuscleGroupProgression {
  muscleGroup: MuscleGroup;
  weeks: WeeklyMuscleStatPoint[];
  currentChange: string;
  currentWorkSets: number;
}

/**
 * Calcul de la progression sur 8 semaines pour un groupe musculaire donné.
 * Restreint aux exercices dont muscleGroup correspond.
 */
export function calculateMuscleGroupProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
  muscleGroup: MuscleGroup;
}): MuscleGroupProgression {
  const { sessions, sets, exercises, referenceDate, muscleGroup } = params;
  const groupExercises = exercises.filter((e) => e.muscleGroup === muscleGroup);
  const core = computeProgressionCore({
    sessions,
    sets,
    exercises: groupExercises,
    referenceDate,
  });

  return {
    muscleGroup,
    weeks: core.weeks.map((w) => ({
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      index: w.index,
      workSets: w.workSets,
    })),
    currentChange: core.currentChange,
    currentWorkSets: core.weeks[7].workSets,
  };
}

/**
 * Calcul de la progression sur 8 semaines pour l'ensemble des 11 groupes musculaires.
 * Renvoie un dictionnaire exhaustif de 11 clés.
 */
export function calculateAllMuscleGroupsProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, MuscleGroupProgression> {
  const result = {} as Record<MuscleGroup, MuscleGroupProgression>;
  for (const group of MUSCLE_GROUPS) {
    result[group] = calculateMuscleGroupProgression({
      ...params,
      muscleGroup: group,
    });
  }
  return result;
}

export interface MuscleGroupWeeklyStat {
  workSets: number;
}

/**
 * Séries de travail par groupe musculaire pour la semaine de referenceDate (exactement 11 clés).
 */
export function calculateWeeklyMuscleStats(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, MuscleGroupWeeklyStat> {
  const { sessions, sets, exercises, referenceDate } = params;

  const validGroups = new Set<string>(MUSCLE_GROUPS);
  const result = {} as Record<MuscleGroup, MuscleGroupWeeklyStat>;
  for (const group of MUSCLE_GROUPS) {
    result[group] = { workSets: 0 };
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
    if (!exercise) continue;
    if (!validGroups.has(exercise.muscleGroup)) continue;

    result[exercise.muscleGroup].workSets++;
  }

  return result;
}

export interface WeeklyMuscleGroupHistoryPoint {
  weekStart: string;
  weekEnd: string;
  workSets: number;
}

/**
 * Historique des séries de travail sur 8 semaines pour un groupe musculaire.
 */
export function calculateMuscleGroupHistory(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
  muscleGroup: MuscleGroup;
}): WeeklyMuscleGroupHistoryPoint[] {
  const { sessions, sets, exercises, referenceDate, muscleGroup } = params;

  const eightWeeks = getEightWeeksRangeUtc(referenceDate);

  const finishedSessions = sessions.filter(
    (s) => s.endedAt !== undefined && s.id !== undefined
  );

  const exerciseMap = new Map<number, Exercise>();
  for (const ex of exercises) {
    if (ex.id !== undefined) {
      exerciseMap.set(ex.id, ex);
    }
  }

  const history: WeeklyMuscleGroupHistoryPoint[] = [];

  for (let w = 0; w < 8; w++) {
    const { startOfWeek, endOfWeek } = eightWeeks[w];

    const weekSessionIds = new Set(
      finishedSessions
        .filter((s) => s.date >= startOfWeek && s.date <= endOfWeek)
        .map((s) => s.id!)
    );

    let workSets = 0;

    for (const set of sets) {
      if (set.type !== 'work') continue;
      if (!set.sessionId || !weekSessionIds.has(set.sessionId)) continue;

      const exercise = exerciseMap.get(set.exerciseId);
      if (!exercise || exercise.muscleGroup !== muscleGroup) continue;

      workSets++;
    }

    history.push({
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
      workSets,
    });
  }

  return history;
}

/**
 * Charge les séances, séries et exercices nécessaires sur la période de 8 semaines se terminant à referenceDate.
 * Lecture seule, sans filtrage de endedAt, ni de type de série, ni d'archivage.
 */
export async function loadGeneralStatsData(referenceDate: string): Promise<{
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
}> {
  const eightWeeks = getEightWeeksRangeUtc(referenceDate);
  const startOfPeriod = eightWeeks[0].startOfWeek;
  const endOfPeriod = eightWeeks[7].endOfWeek;

  const sessions = await db.sessions
    .where('date')
    .between(startOfPeriod, endOfPeriod, true, true)
    .toArray();

  const sessionIds = sessions.map((s) => s.id!).filter(Boolean);
  const sets =
    sessionIds.length > 0
      ? await db.sets.where('sessionId').anyOf(sessionIds).toArray()
      : [];

  const exercises = await db.exercises.toArray();

  return { sessions, sets, exercises };
}

/**
 * Hook de chargement réactif de la progression générale sur 8 semaines.
 * Emballe le résultat dans un objet { progression } pour distinguer l'état de chargement (undefined).
 */
export function useGeneralProgression(referenceDate?: string):
  | { progression: GeneralProgression }
  | undefined {
  const today = referenceDate ?? formatLocalDate(new Date());
  return useLiveQuery(
    async () => {
      const { sessions, sets, exercises } = await loadGeneralStatsData(today);
      const progression = calculateGeneralProgression({
        sessions,
        sets,
        exercises,
        referenceDate: today,
      });
      return { progression };
    },
    [today]
  );
}

/**
 * Hook de chargement réactif de la progression des 11 groupes musculaires sur 8 semaines.
 * Emballe le résultat dans un objet { progression } pour distinguer l'état de chargement (undefined).
 */
export function useMusclesProgression(referenceDate?: string):
  | { progression: Record<MuscleGroup, MuscleGroupProgression> }
  | undefined {
  const today = referenceDate ?? formatLocalDate(new Date());
  return useLiveQuery(
    async () => {
      const { sessions, sets, exercises } = await loadGeneralStatsData(today);
      const progression = calculateAllMuscleGroupsProgression({
        sessions,
        sets,
        exercises,
        referenceDate: today,
      });
      return { progression };
    },
    [today]
  );
}
