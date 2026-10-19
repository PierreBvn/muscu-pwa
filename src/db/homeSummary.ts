import {
  db,
  toWeekday,
  type Program,
  type ProgramExercise,
  type Exercise,
  type Session,
  type MuscleGroup,
  type Weekday,
} from './schema';
import { formatLocalDate } from './sessions';
import { getWeekRangeUtc } from './stats';

const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'lundi',
  2: 'mardi',
  3: 'mercredi',
  4: 'jeudi',
  5: 'vendredi',
  6: 'samedi',
  7: 'dimanche',
};

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Formate manuellement la date du jour pour l'en-tête (sans Intl ni toLocaleDateString).
 * Ex: "lundi 19 octobre"
 */
export function formatHeaderDate(date: Date): string {
  const weekday = WEEKDAY_NAMES[toWeekday(date)];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  return `${weekday} ${day} ${month}`;
}

/**
 * Calcule l'écart en jours calendaires entre deux dates ISO (YYYY-MM-DD).
 */
export function calculateDaysBetweenDates(
  earlierIsoDate: string,
  laterIsoDate: string
): number {
  const [yA, mA, dA] = earlierIsoDate.split('-').map(Number);
  const [yB, mB, dB] = laterIsoDate.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Trouve la prochaine séance type planifiée :
 * - Programme prévu aujourd'hui (le premier par ordre alphabétique de nom).
 * - Sinon le programme prévu le plus proche dans les jours suivants (offset 1..6).
 * - Si aucun jour associé à aucun programme, le premier programme par ordre alphabétique.
 * - null si aucun programme dans la base (base vide).
 */
export function findNextProgram(
  programs: Program[],
  now: Date
): Program | null {
  if (programs.length === 0) {
    return null;
  }

  const currentWeekday = toWeekday(now);

  for (let offset = 0; offset < 7; offset++) {
    const targetWeekday = (((currentWeekday - 1 + offset) % 7) + 1) as Weekday;
    const matching = programs
      .filter((p) => p.weekdays.includes(targetWeekday))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      );

    if (matching.length > 0) {
      return matching[0];
    }
  }

  const sortedAll = [...programs].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );
  return sortedAll[0];
}

export interface NextProgramSummary {
  program: Program;
  exerciseCount: number;
  exerciseCountText: string;
  muscleGroups: MuscleGroup[];
  muscleGroupsText: string;
  daysAgo: number | null;
  lastDoneText: string;
}

export interface HomeSummary {
  headerDate: string;
  weeklySessionsCount: number;
  weeklySessionsText: string;
  nextProgram: NextProgramSummary | null;
}

export interface HomeSummaryData {
  allPrograms: Program[];
  allProgramExercises: ProgramExercise[];
  allExercises: Exercise[];
  allSessions: Session[];
}

/**
 * Fonction pure de calcul pour le résumé de l'écran d'accueil Séance.
 */
export function calculateHomeSummary(
  data: HomeSummaryData,
  now: Date
): HomeSummary {
  const headerDate = formatHeaderDate(now);
  const todayDate = formatLocalDate(now);

  // Semaine UTC (du lundi au dimanche)
  const { startOfWeek, endOfWeek } = getWeekRangeUtc(todayDate);
  const weekSessions = data.allSessions.filter(
    (s) =>
      s.endedAt !== undefined &&
      s.date >= startOfWeek &&
      s.date <= endOfWeek
  );
  const weeklySessionsCount = weekSessions.length;
  const weeklySessionsText = `Cette semaine : ${weeklySessionsCount} ${
    weeklySessionsCount > 1 ? 'séances' : 'séance'
  }`;

  const nextProg = findNextProgram(data.allPrograms, now);

  if (!nextProg) {
    return {
      headerDate,
      weeklySessionsCount,
      weeklySessionsText,
      nextProgram: null,
    };
  }

  // Exercices du programme
  const peList = data.allProgramExercises
    .filter((pe) => pe.programId === nextProg.id)
    .sort((a, b) => a.order - b.order);

  const exerciseCount = peList.length;
  const exerciseCountText = `${exerciseCount} ${
    exerciseCount > 1 ? 'exercices' : 'exercice'
  }`;

  // Groupes musculaires uniques préservant l'ordre
  const exerciseMap = new Map<number, Exercise>();
  for (const ex of data.allExercises) {
    if (ex.id !== undefined) {
      exerciseMap.set(ex.id, ex);
    }
  }

  const rawGroups: MuscleGroup[] = [];
  for (const pe of peList) {
    const ex = exerciseMap.get(pe.exerciseId);
    if (ex?.muscleGroup) {
      rawGroups.push(ex.muscleGroup);
    }
  }
  const muscleGroups = Array.from(new Set(rawGroups));
  const muscleGroupsText = muscleGroups.join(', ');

  // Dernière fois terminée
  const completedForProgram = data.allSessions.filter(
    (s) => s.programId === nextProg.id && s.endedAt !== undefined
  );

  let daysAgo: number | null = null;
  let lastDoneText = 'Jamais faite';

  if (completedForProgram.length > 0) {
    completedForProgram.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      const bTime = b.endedAt ?? b.startedAt;
      const aTime = a.endedAt ?? a.startedAt;
      return bTime.localeCompare(aTime);
    });

    const mostRecent = completedForProgram[0];
    daysAgo = calculateDaysBetweenDates(mostRecent.date, todayDate);
    lastDoneText = `Dernière fois : il y a ${daysAgo} j`;
  }

  return {
    headerDate,
    weeklySessionsCount,
    weeklySessionsText,
    nextProgram: {
      program: nextProg,
      exerciseCount,
      exerciseCountText,
      muscleGroups,
      muscleGroupsText,
      daysAgo,
      lastDoneText,
    },
  };
}

/**
 * Fonction mince de chargement des données Dexie pour l'accueil Séance.
 */
export async function loadHomeSummaryData(): Promise<HomeSummaryData> {
  const [allPrograms, allProgramExercises, allExercises, allSessions] =
    await Promise.all([
      db.programs.toArray(),
      db.programExercises.toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
    ]);

  return {
    allPrograms,
    allProgramExercises,
    allExercises,
    allSessions,
  };
}

/**
 * Récupère le résumé complet pour l'écran d'accueil Séance.
 */
export async function getHomeSummary(
  now: Date = new Date()
): Promise<HomeSummary> {
  const data = await loadHomeSummaryData();
  return calculateHomeSummary(data, now);
}
