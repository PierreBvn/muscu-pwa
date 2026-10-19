import {
  db,
  MUSCLE_GROUPS,
  type Program,
  type ProgramExercise,
  type Exercise,
  type MuscleGroup,
} from './schema';

/**
 * Valide qu'un tableau de jours contient des entiers valides entre 1 et 7, sans doublons.
 */
function validateWeekdays(weekdays: number[]): number[] {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    throw new Error('Les jours du programme ne peuvent pas être vides.');
  }

  const unique = Array.from(new Set(weekdays));
  for (const day of unique) {
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new Error(
        'Chaque jour doit être un entier compris entre 1 (lundi) et 7 (dimanche).'
      );
    }
  }

  return unique.sort((a, b) => a - b);
}

/**
 * Valide le nom d'un programme.
 */
function validateProgramName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Le nom du programme ne peut pas être vide.');
  }
  return trimmed;
}

/**
 * Valide les séries d'échauffement (0 à 4).
 */
function validateWarmupSets(sets: number): number {
  if (!Number.isInteger(sets) || sets < 0 || sets > 4) {
    throw new Error(
      "Le nombre de séries d'échauffement doit être compris entre 0 et 4."
    );
  }
  return sets;
}

/**
 * Valide les séries de travail (1 à 6).
 */
function validateWorkSets(sets: number): number {
  if (!Number.isInteger(sets) || sets < 1 || sets > 6) {
    throw new Error(
      'Le nombre de séries de travail doit être compris entre 1 et 6.'
    );
  }
  return sets;
}

/**
 * Crée un nouveau programme avec ses jours d'entraînement.
 */
export async function createProgram(data: {
  name: string;
  weekdays: number[];
}): Promise<number> {
  const name = validateProgramName(data.name);
  const weekdays = validateWeekdays(data.weekdays);

  return (await db.programs.add({
    name,
    weekdays,
  })) as number;
}

/**
 * Récupère un programme par son identifiant.
 */
export async function getProgram(id: number): Promise<Program | undefined> {
  return await db.programs.get(id);
}

/**
 * Récupère tous les programmes triés alphabétiquement par nom.
 */
export async function getAllPrograms(): Promise<Program[]> {
  const all = await db.programs.toArray();
  return all.sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );
}

/**
 * Récupère tous les programmes planifiés pour un jour donné (1=lundi … 7=dimanche),
 * triés alphabétiquement par nom.
 */
export async function getProgramsForWeekday(
  weekday: number
): Promise<Program[]> {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new Error('Le jour doit être un entier compris entre 1 et 7.');
  }

  const all = await db.programs.toArray();
  return all
    .filter((p) => p.weekdays.includes(weekday))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );
}

/**
 * Met à jour le nom et/ou les jours d'un programme existant.
 */
export async function updateProgram(
  id: number,
  changes: { name?: string; weekdays?: number[] }
): Promise<void> {
  const existing = await db.programs.get(id);
  if (!existing) {
    throw new Error(`Programme #${id} introuvable.`);
  }

  const updates: Partial<Program> = {};
  if (changes.name !== undefined) {
    updates.name = validateProgramName(changes.name);
  }
  if (changes.weekdays !== undefined) {
    updates.weekdays = validateWeekdays(changes.weekdays);
  }

  await db.programs.update(id, updates);
}

/**
 * Supprime un programme et supprime en cascade ses ProgramExercise associés.
 * Ne supprime aucune séance passée (les tables sessions et sessionExercises restent intactes).
 */
export async function deleteProgram(id: number): Promise<void> {
  await db.transaction('rw', [db.programs, db.programExercises], async () => {
    await db.programExercises.where('programId').equals(id).delete();
    await db.programs.delete(id);
  });
}

/**
 * Ajoute un exercice à un programme.
 * Attribue automatiquement order = max(order) + 1 (ou 0 s'il n'y a aucun exercice).
 * Rejette si le programId ou l'exerciseId n'existe pas.
 */
export async function addExerciseToProgram(data: {
  programId: number;
  exerciseId: number;
  warmupSets?: number;
  workSets?: number;
}): Promise<number> {
  const warmupSets = validateWarmupSets(data.warmupSets ?? 1);
  const workSets = validateWorkSets(data.workSets ?? 3);

  return await db.transaction(
    'rw',
    [db.programs, db.exercises, db.programExercises],
    async () => {
      const program = await db.programs.get(data.programId);
      if (!program) {
        throw new Error(`Programme #${data.programId} introuvable.`);
      }

      const exercise = await db.exercises.get(data.exerciseId);
      if (!exercise) {
        throw new Error(`Exercice #${data.exerciseId} introuvable.`);
      }

      const currentExercises = await db.programExercises
        .where('programId')
        .equals(data.programId)
        .toArray();

      const order =
        currentExercises.length > 0
          ? Math.max(...currentExercises.map((e) => e.order)) + 1
          : 0;

      return (await db.programExercises.add({
        programId: data.programId,
        exerciseId: data.exerciseId,
        order,
        warmupSets,
        workSets,
      })) as number;
    }
  );
}

/**
 * Récupère les exercices d'un programme triés par leur ordre croissant.
 */
export async function getProgramExercises(
  programId: number
): Promise<ProgramExercise[]> {
  const exercises = await db.programExercises
    .where('programId')
    .equals(programId)
    .toArray();

  return exercises.sort((a, b) => a.order - b.order);
}

/**
 * Récupère un programme avec la liste de ses exercices enrichis de leurs détails
 * (nom, muscleGroup, etc.), triés par order.
 */
export async function getProgramWithExercises(programId: number): Promise<
  | {
      program: Program;
      exercises: (ProgramExercise & { exercise?: Exercise })[];
    }
  | undefined
> {
  const program = await db.programs.get(programId);
  if (!program) {
    return undefined;
  }

  const programExercises = await getProgramExercises(programId);
  const exerciseIds = Array.from(
    new Set(programExercises.map((pe) => pe.exerciseId))
  );
  const exercises = await db.exercises.where('id').anyOf(exerciseIds).toArray();
  const exerciseMap = new Map(exercises.map((ex) => [ex.id!, ex]));

  const enriched = programExercises.map((pe) => ({
    ...pe,
    exercise: exerciseMap.get(pe.exerciseId),
  }));

  return {
    program,
    exercises: enriched,
  };
}

/**
 * Met à jour les séries d'échauffement ou de travail d'un exercice de programme.
 */
export async function updateProgramExercise(
  id: number,
  changes: { warmupSets?: number; workSets?: number }
): Promise<void> {
  const existing = await db.programExercises.get(id);
  if (!existing) {
    throw new Error(`Exercice de programme #${id} introuvable.`);
  }

  const updates: Partial<ProgramExercise> = {};
  if (changes.warmupSets !== undefined) {
    updates.warmupSets = validateWarmupSets(changes.warmupSets);
  }
  if (changes.workSets !== undefined) {
    updates.workSets = validateWorkSets(changes.workSets);
  }

  await db.programExercises.update(id, updates);
}

/**
 * Supprime un exercice d'un programme et réindexe de façon contiguë les order des restants.
 */
export async function removeExerciseFromProgram(
  programExerciseId: number
): Promise<void> {
  await db.transaction('rw', db.programExercises, async () => {
    const existing = await db.programExercises.get(programExerciseId);
    if (!existing) {
      return;
    }

    await db.programExercises.delete(programExerciseId);

    const remaining = await db.programExercises
      .where('programId')
      .equals(existing.programId)
      .toArray();

    remaining.sort((a, b) => a.order - b.order);

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i && remaining[i].id !== undefined) {
        await db.programExercises.update(remaining[i].id!, { order: i });
      }
    }
  });
}

/**
 * Déplace un exercice d'un cran vers le haut ('up') ou vers le bas ('down') dans un programme.
 * Déplacer vers le haut le premier ou vers le bas le dernier est sans effet.
 * Garantit que les order restent strictement uniques et contigus (0, 1, 2...).
 */
export async function moveProgramExercise(
  programExerciseId: number,
  direction: 'up' | 'down'
): Promise<void> {
  await db.transaction('rw', db.programExercises, async () => {
    const target = await db.programExercises.get(programExerciseId);
    if (!target) {
      throw new Error(
        `Exercice de programme #${programExerciseId} introuvable.`
      );
    }

    const list = await db.programExercises
      .where('programId')
      .equals(target.programId)
      .toArray();

    list.sort((a, b) => a.order - b.order);

    const currentIndex = list.findIndex((e) => e.id === programExerciseId);
    if (currentIndex === -1) {
      return;
    }

    if (direction === 'up') {
      if (currentIndex === 0) {
        return; // Sans effet
      }
      const targetIndex = currentIndex - 1;
      const temp = list[currentIndex];
      list[currentIndex] = list[targetIndex];
      list[targetIndex] = temp;
    } else if (direction === 'down') {
      if (currentIndex === list.length - 1) {
        return; // Sans effet
      }
      const targetIndex = currentIndex + 1;
      const temp = list[currentIndex];
      list[currentIndex] = list[targetIndex];
      list[targetIndex] = temp;
    }

    // Réassigner des orders uniques et contigus
    for (let i = 0; i < list.length; i++) {
      if (list[i].id !== undefined && list[i].order !== i) {
        await db.programExercises.update(list[i].id!, { order: i });
      }
    }
  });
}

export interface ProgramSummary {
  exerciseCount: number;
  exerciseCountText: string;
  muscleGroups: MuscleGroup[];
  muscleGroupsText: string;
  summaryText: string;
}

export type ProgramWithSummary = Program & ProgramSummary;

/**
 * Calcule purement le résumé d'un programme (nombre d'exercices et groupes musculaires ordonnés).
 * Règle de format : « Dos · Biceps · 5 exos », « Aucun exercice » si vide.
 * Groupes dans l'ordre strict de MUSCLE_GROUPS, sans doublon.
 */
export function calculateProgramSummary(
  programExercises: ProgramExercise[],
  exercises: Exercise[] | Map<number, Exercise>
): ProgramSummary {
  const count = programExercises.length;
  if (count === 0) {
    return {
      exerciseCount: 0,
      exerciseCountText: '0 exercice',
      muscleGroups: [],
      muscleGroupsText: '',
      summaryText: 'Aucun exercice',
    };
  }

  const exerciseMap =
    exercises instanceof Map
      ? exercises
      : new Map<number, Exercise>(
          exercises
            .filter((e) => e.id !== undefined)
            .map((e) => [e.id!, e])
        );

  const presentGroups = new Set<MuscleGroup>();
  for (const pe of programExercises) {
    const ex = exerciseMap.get(pe.exerciseId);
    if (ex?.muscleGroup) {
      presentGroups.add(ex.muscleGroup);
    }
  }

  const muscleGroups = MUSCLE_GROUPS.filter((g) => presentGroups.has(g));
  const muscleGroupsText = muscleGroups.join(', ');
  const exerciseCountText = `${count} ${count > 1 ? 'exercices' : 'exercice'}`;
  const exosSuffix = `${count} ${count > 1 ? 'exos' : 'exo'}`;

  const summaryText =
    muscleGroups.length > 0
      ? [...muscleGroups, exosSuffix].join(' · ')
      : exosSuffix;

  return {
    exerciseCount: count,
    exerciseCountText,
    muscleGroups,
    muscleGroupsText,
    summaryText,
  };
}

/**
 * Récupère tous les programmes enrichis de leur résumé d'exercices,
 * triés alphabétiquement par nom.
 */
export async function getAllProgramsWithSummary(): Promise<ProgramWithSummary[]> {
  const [programs, programExercises, exercises] = await Promise.all([
    db.programs.toArray(),
    db.programExercises.toArray(),
    db.exercises.toArray(),
  ]);

  const exerciseMap = new Map<number, Exercise>();
  for (const ex of exercises) {
    if (ex.id !== undefined) {
      exerciseMap.set(ex.id, ex);
    }
  }

  const peByProgramId = new Map<number, ProgramExercise[]>();
  for (const pe of programExercises) {
    const list = peByProgramId.get(pe.programId) ?? [];
    list.push(pe);
    peByProgramId.set(pe.programId, list);
  }

  const sorted = [...programs].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  return sorted.map((program) => {
    const peList = program.id ? (peByProgramId.get(program.id) ?? []) : [];
    const summary = calculateProgramSummary(peList, exerciseMap);
    return {
      ...program,
      ...summary,
    };
  });
}

