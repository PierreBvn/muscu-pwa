import {
  db,
  type Session,
  type SessionExercise,
  type SetEntry,
  type Exercise,
} from './schema';

/**
 * Formate un objet Date en date locale au format YYYY-MM-DD
 * en utilisant ses composants calendaires locaux.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * Valide les répétitions d'une série (entier ≥ 1).
 */
function validateReps(reps: number): number {
  if (!Number.isInteger(reps) || reps < 1) {
    throw new Error(
      'Le nombre de répétitions doit être un entier supérieur ou égal à 1.'
    );
  }
  return reps;
}

/**
 * Valide le poids d'une série (nombre ≥ 0, 0 autorisé pour le poids du corps).
 */
function validateWeight(weight: number): number {
  if (typeof weight !== 'number' || Number.isNaN(weight) || weight < 0) {
    throw new Error(
      'Le poids doit être un nombre supérieur ou égal à 0.'
    );
  }
  return Math.round(weight * 100) / 100;
}

/**
 * Récupère la séance en cours (non terminée, endedAt absent).
 * Note : IndexedDB n'indexe pas les propriétés undefined / absentes,
 * un parcours de table via filter() est donc nécessaire.
 */
export async function getActiveSession(): Promise<Session | undefined> {
  return await db.sessions.filter((s) => s.endedAt === undefined).first();
}

/**
 * Récupère une séance par son identifiant.
 */
export async function getSession(id: number): Promise<Session | undefined> {
  return await db.sessions.get(id);
}

export interface SessionDetails {
  session: Session;
  exercises: (SessionExercise & { exercise?: Exercise })[];
  sets: SetEntry[];
}

/**
 * Récupère une séance avec ses exercices ordonnés enrichis des données d'exercice,
 * ainsi que ses séries ordonnées.
 */
export async function getSessionDetails(
  id: number
): Promise<SessionDetails | undefined> {
  const session = await db.sessions.get(id);
  if (!session) {
    return undefined;
  }

  const sessionExercises = await getSessionExercises(id);
  const exerciseIds = Array.from(
    new Set(sessionExercises.map((se) => se.exerciseId))
  );
  const exercisesList = await db.exercises.where('id').anyOf(exerciseIds).toArray();
  const exerciseMap = new Map(exercisesList.map((e) => [e.id!, e]));

  const enrichedExercises = sessionExercises.map((se) => ({
    ...se,
    exercise: exerciseMap.get(se.exerciseId),
  }));

  const sets = await getSetsForSession(id);

  return {
    session,
    exercises: enrichedExercises,
    sets,
  };
}

/**
 * Démarre une nouvelle séance (libre ou basée sur un programme).
 * S'exécute dans une transaction pour garantir atomiquement qu'une seule
 * séance en cours ne peut exister à la fois.
 */
export async function startSession(options?: {
  programId?: number;
  now?: Date;
}): Promise<number> {
  const now = options?.now ?? new Date();
  const date = formatLocalDate(now);
  const startedAt = now.toISOString();

  return await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.programs, db.programExercises],
    async () => {
      const activeSession = await db.sessions
        .filter((s) => s.endedAt === undefined)
        .first();

      if (activeSession) {
        throw new Error('Une séance est déjà en cours.');
      }

      const sessionId = (await db.sessions.add({
        date,
        startedAt,
        programId: options?.programId,
      })) as number;

      if (options?.programId !== undefined) {
        const program = await db.programs.get(options.programId);
        if (!program) {
          throw new Error(`Programme #${options.programId} introuvable.`);
        }

        const programExercises = await db.programExercises
          .where('programId')
          .equals(options.programId)
          .toArray();

        programExercises.sort((a, b) => a.order - b.order);

        for (let i = 0; i < programExercises.length; i++) {
          const pe = programExercises[i];
          await db.sessionExercises.add({
            sessionId,
            exerciseId: pe.exerciseId,
            order: i,
            warmupSets: pe.warmupSets,
            workSets: pe.workSets,
            skipped: false,
          });
        }
      }

      return sessionId;
    }
  );
}

/**
 * Termine une séance en cours.
 * Si la séance ne contient aucune série, elle est automatiquement supprimée
 * ainsi que ses exercices de séance associés.
 */
export async function finishSession(
  sessionId: number,
  options?: { now?: Date }
): Promise<'deleted' | 'completed'> {
  const now = options?.now ?? new Date();

  return await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.sets],
    async () => {
      const session = await db.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Séance #${sessionId} introuvable.`);
      }

      if (session.endedAt !== undefined) {
        throw new Error('Cette séance est déjà terminée.');
      }

      const setsCount = await db.sets
        .where('sessionId')
        .equals(sessionId)
        .count();

      if (setsCount === 0) {
        await db.sessionExercises.where('sessionId').equals(sessionId).delete();
        await db.sessions.delete(sessionId);
        return 'deleted';
      }

      await db.sessions.update(sessionId, {
        endedAt: now.toISOString(),
      });
      return 'completed';
    }
  );
}

/**
 * Clôture une séance oubliée.
 * Définit endedAt au createdAt de la dernière série de la séance.
 * Si la séance ne comporte aucune série, elle est supprimée.
 */
export async function closeForgottenSession(
  sessionId: number
): Promise<'deleted' | 'completed'> {
  return await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.sets],
    async () => {
      const session = await db.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Séance #${sessionId} introuvable.`);
      }

      if (session.endedAt !== undefined) {
        throw new Error('Cette séance est déjà terminée.');
      }

      const sets = await db.sets
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      if (sets.length === 0) {
        await db.sessionExercises.where('sessionId').equals(sessionId).delete();
        await db.sessions.delete(sessionId);
        return 'deleted';
      }

      sets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const lastSet = sets[sets.length - 1];

      await db.sessions.update(sessionId, {
        endedAt: lastSet.createdAt,
      });

      return 'completed';
    }
  );
}

/**
 * Récupère les exercices d'une séance triés par ordre croissant.
 */
export async function getSessionExercises(
  sessionId: number
): Promise<SessionExercise[]> {
  const list = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  return list.sort((a, b) => a.order - b.order);
}

/**
 * Détermine si un exercice de séance est considéré comme terminé :
 * au moins workSets vraies séries (type 'work') enregistrées, ou exercice passé (skipped).
 * Les séries d'échauffement ne comptent pas.
 */
export function isExerciseCompleted(
  exercise: Pick<SessionExercise, 'workSets' | 'skipped'>,
  sets: Pick<SetEntry, 'type'>[]
): boolean {
  if (exercise.skipped) {
    return true;
  }
  const workSetsCount = sets.filter((s) => s.type === 'work').length;
  return workSetsCount >= exercise.workSets;
}

export interface SessionExerciseProgress {
  sessionExerciseId: number;
  exerciseId: number;
  order: number;
  completed: boolean;
  workSetsDone: number;
  workSets: number;
  skipped: boolean;
}

export interface SessionProgress {
  exercises: SessionExerciseProgress[];
  firstIncompleteSessionExerciseId: number | null;
  firstIncompleteExerciseId: number | null;
}

/**
 * Donne l'état de chaque exercice d'une séance dans l'ordre croissant :
 * terminé ou non, nombre de vraies séries faites / workSets,
 * et l'id du premier exercice non terminé (null si tous sont terminés ou séance vide).
 */
export async function getSessionProgress(
  sessionId: number
): Promise<SessionProgress> {
  const sessionExercises = await getSessionExercises(sessionId);
  const sets = await getSetsForSession(sessionId);

  const exercisesProgress: SessionExerciseProgress[] = [];
  let firstIncompleteSessionExerciseId: number | null = null;
  let firstIncompleteExerciseId: number | null = null;

  for (const se of sessionExercises) {
    const exerciseSets = sets.filter((s) => s.exerciseId === se.exerciseId);
    const workSetsDone = exerciseSets.filter((s) => s.type === 'work').length;
    const completed = isExerciseCompleted(se, exerciseSets);

    if (!completed && firstIncompleteSessionExerciseId === null && se.id !== undefined) {
      firstIncompleteSessionExerciseId = se.id;
      firstIncompleteExerciseId = se.exerciseId;
    }

    exercisesProgress.push({
      sessionExerciseId: se.id!,
      exerciseId: se.exerciseId,
      order: se.order,
      completed,
      workSetsDone,
      workSets: se.workSets,
      skipped: Boolean(se.skipped),
    });
  }

  return {
    exercises: exercisesProgress,
    firstIncompleteSessionExerciseId,
    firstIncompleteExerciseId,
  };
}

/**
 * Ajoute un exercice à une séance en cours.
 * Règle d'insertion (v2) :
 * - Si aucune série (ni échauffement ni travail) n'a encore été enregistrée dans la séance :
 *   l'exercice est ajouté à la fin (order = max(order) + 1 ou 0).
 * - Sinon : inséré juste avant le premier exercice non terminé (ou à la fin si tous sont terminés).
 * Le réordonnancement se fait de façon atomique dans une transaction Dexie.
 */
export async function addExerciseToSession(data: {
  sessionId: number;
  exerciseId: number;
  warmupSets?: number;
  workSets?: number;
}): Promise<number> {
  const warmupSets = validateWarmupSets(data.warmupSets ?? 1);
  const workSets = validateWorkSets(data.workSets ?? 3);

  return await db.transaction(
    'rw',
    [db.sessions, db.exercises, db.sessionExercises, db.sets],
    async () => {
      const session = await db.sessions.get(data.sessionId);
      if (!session) {
        throw new Error(`Séance #${data.sessionId} introuvable.`);
      }
      if (session.endedAt !== undefined) {
        throw new Error(
          'Impossible d’ajouter un exercice à une séance terminée.'
        );
      }

      const exercise = await db.exercises.get(data.exerciseId);
      if (!exercise) {
        throw new Error(`Exercice #${data.exerciseId} introuvable.`);
      }

      const current = await db.sessionExercises
        .where('sessionId')
        .equals(data.sessionId)
        .toArray();
      current.sort((a, b) => a.order - b.order);

      const alreadyPresent = current.some((e) => e.exerciseId === data.exerciseId);
      if (alreadyPresent) {
        throw new Error('Cet exercice est déjà présent dans cette séance.');
      }

      const existingSets = await db.sets
        .where('sessionId')
        .equals(data.sessionId)
        .toArray();

      let insertOrder: number;

      // Si aucune série n'a encore été enregistrée dans la séance : ajouté à la fin
      if (existingSets.length === 0) {
        insertOrder = current.length > 0 ? Math.max(...current.map((e) => e.order)) + 1 : 0;
      } else {
        // Sinon, trouver le premier exercice non terminé
        const firstIncomplete = current.find((se) => {
          const seSets = existingSets.filter((s) => s.exerciseId === se.exerciseId);
          return !isExerciseCompleted(se, seSets);
        });

        if (firstIncomplete) {
          insertOrder = firstIncomplete.order;
          // Décaler tous les exercices avec order >= insertOrder
          for (const se of current) {
            if (se.order >= insertOrder && se.id !== undefined) {
              await db.sessionExercises.update(se.id, { order: se.order + 1 });
            }
          }
        } else {
          // Tous les exercices sont terminés : ajouter à la fin
          insertOrder = current.length > 0 ? Math.max(...current.map((e) => e.order)) + 1 : 0;
        }
      }

      return (await db.sessionExercises.add({
        sessionId: data.sessionId,
        exerciseId: data.exerciseId,
        order: insertOrder,
        warmupSets,
        workSets,
        skipped: false,
      })) as number;
    }
  );
}

/**
 * Supprime un exercice d'une séance.
 * Règle stricte d'intégrité : rejette si l'exercice a déjà des séries enregistrées
 * dans la séance (l'utilisateur doit utiliser 'sauter').
 * Réindexe les order restants de façon contiguë.
 */
export async function removeExerciseFromSession(
  sessionExerciseId: number
): Promise<void> {
  await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.sets],
    async () => {
      const existing = await db.sessionExercises.get(sessionExerciseId);
      if (!existing) {
        return;
      }

      const session = await db.sessions.get(existing.sessionId);
      if (session && session.endedAt !== undefined) {
        throw new Error(
          'Impossible de modifier les exercices d’une séance terminée.'
        );
      }

      const setsCount = await db.sets
        .where('sessionId')
        .equals(existing.sessionId)
        .filter((s) => s.exerciseId === existing.exerciseId)
        .count();

      if (setsCount > 0) {
        throw new Error(
          'Impossible de retirer un exercice ayant déjà des séries enregistrées. Utilisez l’option pour le sauter.'
        );
      }

      await db.sessionExercises.delete(sessionExerciseId);

      const remaining = await db.sessionExercises
        .where('sessionId')
        .equals(existing.sessionId)
        .toArray();

      remaining.sort((a, b) => a.order - b.order);

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].id !== undefined && remaining[i].order !== i) {
          await db.sessionExercises.update(remaining[i].id!, { order: i });
        }
      }
    }
  );
}

/**
 * Marque un exercice de séance comme sauté (ou non sauté).
 */
export async function skipSessionExercise(
  sessionExerciseId: number,
  skipped: boolean = true
): Promise<void> {
  const existing = await db.sessionExercises.get(sessionExerciseId);
  if (!existing) {
    throw new Error(`Exercice de séance #${sessionExerciseId} introuvable.`);
  }

  await db.sessionExercises.update(sessionExerciseId, { skipped });
}

/**
 * Met à jour le nombre de séries prévues (échauffement ou travail) pour un exercice de séance.
 */
export async function updateSessionExerciseSetsCount(
  sessionExerciseId: number,
  changes: { warmupSets?: number; workSets?: number }
): Promise<void> {
  const existing = await db.sessionExercises.get(sessionExerciseId);
  if (!existing) {
    throw new Error(`Exercice de séance #${sessionExerciseId} introuvable.`);
  }

  const updates: Partial<SessionExercise> = {};
  if (changes.warmupSets !== undefined) {
    updates.warmupSets = validateWarmupSets(changes.warmupSets);
  }
  if (changes.workSets !== undefined) {
    updates.workSets = validateWorkSets(changes.workSets);
  }

  await db.sessionExercises.update(sessionExerciseId, updates);
}

/**
 * Déplace un exercice d'un cran vers le haut ('up') ou vers le bas ('down') dans la séance.
 */
export async function moveSessionExercise(
  sessionExerciseId: number,
  direction: 'up' | 'down'
): Promise<void> {
  await db.transaction('rw', db.sessionExercises, async () => {
    const target = await db.sessionExercises.get(sessionExerciseId);
    if (!target) {
      throw new Error(`Exercice de séance #${sessionExerciseId} introuvable.`);
    }

    const list = await db.sessionExercises
      .where('sessionId')
      .equals(target.sessionId)
      .toArray();

    list.sort((a, b) => a.order - b.order);

    const currentIndex = list.findIndex((e) => e.id === sessionExerciseId);
    if (currentIndex === -1) {
      return;
    }

    if (direction === 'up') {
      if (currentIndex === 0) return;
      const targetIndex = currentIndex - 1;
      const temp = list[currentIndex];
      list[currentIndex] = list[targetIndex];
      list[targetIndex] = temp;
    } else if (direction === 'down') {
      if (currentIndex === list.length - 1) return;
      const targetIndex = currentIndex + 1;
      const temp = list[currentIndex];
      list[currentIndex] = list[targetIndex];
      list[targetIndex] = temp;
    }

    for (let i = 0; i < list.length; i++) {
      if (list[i].id !== undefined && list[i].order !== i) {
        await db.sessionExercises.update(list[i].id!, { order: i });
      }
    }
  });
}

/**
 * Ajoute une série immédiatement en base.
 * S'exécute dans une transaction et attribue atomiquement order = max(order) + 1.
 * Rejette si la séance associée est déjà terminée.
 */
export async function addSet(data: {
  sessionId: number;
  exerciseId: number;
  reps: number;
  weight: number;
  type: 'warmup' | 'work';
  now?: Date;
}): Promise<number> {
  const reps = validateReps(data.reps);
  const weight = validateWeight(data.weight);
  const type = data.type;
  if (type !== 'warmup' && type !== 'work') {
    throw new Error('Le type de série doit être "warmup" ou "work".');
  }

  const now = data.now ?? new Date();
  const createdAt = now.toISOString();

  return await db.transaction('rw', [db.sessions, db.sets], async () => {
    const session = await db.sessions.get(data.sessionId);
    if (!session) {
      throw new Error(`Séance #${data.sessionId} introuvable.`);
    }
    if (session.endedAt !== undefined) {
      throw new Error('Impossible d’ajouter une série à une séance terminée.');
    }

    const currentSets = await db.sets
      .where('sessionId')
      .equals(data.sessionId)
      .toArray();

    const order =
      currentSets.length > 0
        ? Math.max(...currentSets.map((s) => s.order)) + 1
        : 0;

    return (await db.sets.add({
      sessionId: data.sessionId,
      exerciseId: data.exerciseId,
      order,
      reps,
      weight,
      type,
      createdAt,
    })) as number;
  });
}

/**
 * Modifie une série existante pendant la séance en cours.
 * Rejette si la séance associée est terminée.
 */
export async function updateSet(
  id: number,
  changes: { reps?: number; weight?: number; type?: 'warmup' | 'work' }
): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sets], async () => {
    const existing = await db.sets.get(id);
    if (!existing) {
      throw new Error(`Série #${id} introuvable.`);
    }

    const session = await db.sessions.get(existing.sessionId);
    if (!session || session.endedAt !== undefined) {
      throw new Error(
        'Impossible de modifier une série d’une séance terminée.'
      );
    }

    const updates: Partial<SetEntry> = {};
    if (changes.reps !== undefined) {
      updates.reps = validateReps(changes.reps);
    }
    if (changes.weight !== undefined) {
      updates.weight = validateWeight(changes.weight);
    }
    if (changes.type !== undefined) {
      if (changes.type !== 'warmup' && changes.type !== 'work') {
        throw new Error('Le type de série doit être "warmup" ou "work".');
      }
      updates.type = changes.type;
    }

    await db.sets.update(id, updates);
  });
}

/**
 * Supprime une série pendant la séance en cours et réindexe les order restants.
 * Rejette si la séance associée est terminée.
 */
export async function deleteSet(id: number): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sets], async () => {
    const existing = await db.sets.get(id);
    if (!existing) {
      return;
    }

    const session = await db.sessions.get(existing.sessionId);
    if (!session || session.endedAt !== undefined) {
      throw new Error(
        'Impossible de supprimer une série d’une séance terminée.'
      );
    }

    await db.sets.delete(id);

    const remaining = await db.sets
      .where('sessionId')
      .equals(existing.sessionId)
      .toArray();

    remaining.sort((a, b) => a.order - b.order);

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].id !== undefined && remaining[i].order !== i) {
        await db.sets.update(remaining[i].id!, { order: i });
      }
    }
  });
}

/**
 * Récupère les séries d'une séance triées par leur ordre croissant.
 */
export async function getSetsForSession(
  sessionId: number
): Promise<SetEntry[]> {
  const sets = await db.sets
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  return sets.sort((a, b) => a.order - b.order);
}
