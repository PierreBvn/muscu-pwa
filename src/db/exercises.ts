import { db, type Exercise, type MuscleGroup } from './schema';

export const DEFAULT_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Pectoraux (3)
  { name: 'Développé couché', muscleGroup: 'Pectoraux' },
  { name: 'Développé incliné haltères', muscleGroup: 'Pectoraux' },
  { name: 'Écarté à la poulie', muscleGroup: 'Pectoraux' },

  // Dos (4)
  { name: 'Tractions', muscleGroup: 'Dos' },
  { name: 'Soulevé de terre', muscleGroup: 'Dos' },
  { name: 'Rowing barre', muscleGroup: 'Dos' },
  { name: 'Tirage vertical', muscleGroup: 'Dos' },

  // Épaules (3)
  { name: 'Développé militaire', muscleGroup: 'Épaules' },
  { name: 'Élévations latérales', muscleGroup: 'Épaules' },
  { name: 'Oiseau banc incliné', muscleGroup: 'Épaules' },

  // Quadriceps (3)
  { name: 'Squat', muscleGroup: 'Quadriceps' },
  { name: 'Presse à cuisses', muscleGroup: 'Quadriceps' },
  { name: 'Fentes', muscleGroup: 'Quadriceps' },

  // Ischios (1)
  { name: 'Leg curl', muscleGroup: 'Ischios' },

  // Biceps (1)
  { name: 'Curl biceps barre', muscleGroup: 'Biceps' },

  // Triceps (2)
  { name: 'Dips', muscleGroup: 'Triceps' },
  { name: 'Barre au front', muscleGroup: 'Triceps' },

  // Avant-bras (1)
  { name: 'Tirage poulie avant-bras', muscleGroup: 'Avant-bras' },

  // Abdos (2)
  { name: 'Crunch', muscleGroup: 'Abdos' },
  { name: 'Gainage planche', muscleGroup: 'Abdos' },

  // Fessiers (1)
  { name: 'Hip thrust', muscleGroup: 'Fessiers' },

  // Mollets (1)
  { name: 'Extension mollets', muscleGroup: 'Mollets' },
];

/**
 * Pré-remplit les exercices par défaut si la table est vide.
 * Exécuté de manière atomique dans une transaction pour éviter le double seed.
 */
export async function seedExercisesIfNeeded(): Promise<boolean> {
  return await db.transaction('rw', db.exercises, async () => {
    const count = await db.exercises.count();
    if (count === 0) {
      await db.exercises.bulkAdd(
        DEFAULT_EXERCISES.map((ex) => ({ ...ex, archived: false }))
      );
      return true;
    }
    return false;
  });
}

/**
 * Récupère tous les exercices actifs (non archivés) triés alphabétiquement par nom.
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  return all
    .filter((ex) => !ex.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

/**
 * Récupère les exercices actifs regroupés par groupe musculaire.
 */
export async function getExercisesByGroup(): Promise<Record<MuscleGroup, Exercise[]>> {
  const active = await getAllExercises();
  const grouped: Record<MuscleGroup, Exercise[]> = {
    Pectoraux: [],
    Dos: [],
    Épaules: [],
    Biceps: [],
    Triceps: [],
    'Avant-bras': [],
    Abdos: [],
    Quadriceps: [],
    Ischios: [],
    Fessiers: [],
    Mollets: [],
  };

  for (const ex of active) {
    if (grouped[ex.muscleGroup]) {
      grouped[ex.muscleGroup].push(ex);
    }
  }

  return grouped;
}

/**
 * Normalise un texte pour la recherche : minuscules, suppression des accents, suppression des espaces superflus.
 */
export function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface FilterExercisesOptions {
  query?: string;
  muscleGroup?: MuscleGroup;
  excludeIds?: number[];
}

/**
 * Recherche et filtre les exercices :
 * - Exclut les exercices archivés
 * - Exclut les IDs spécifiés dans excludeIds (exercices déjà présents)
 * - Filtre par groupe musculaire si spécifié
 * - Filtre par recherche textuelle insensible à la casse et aux accents si spécifiée
 * - Trie alphabétiquement par nom
 */
export async function filterExercises(
  options?: FilterExercisesOptions
): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  const excludeSet =
    options?.excludeIds && options.excludeIds.length > 0
      ? new Set(options.excludeIds)
      : null;
  const normalizedQuery = options?.query
    ? normalizeSearchText(options.query)
    : '';

  return all
    .filter((ex) => {
      if (ex.archived) return false;
      if (ex.id !== undefined && excludeSet?.has(ex.id)) return false;
      if (options?.muscleGroup && ex.muscleGroup !== options.muscleGroup) return false;
      if (normalizedQuery && !normalizeSearchText(ex.name).includes(normalizedQuery)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

/**
 * Calcule le nombre d'exercices disponibles par groupe musculaire :
 * - Exclut les exercices archivés
 * - Exclut les IDs spécifiés dans excludeIds
 */
export async function getExerciseCountsByGroup(options?: {
  excludeIds?: number[];
}): Promise<Record<MuscleGroup, number>> {
  const available = await filterExercises({ excludeIds: options?.excludeIds });
  const counts: Record<MuscleGroup, number> = {
    Pectoraux: 0,
    Dos: 0,
    Épaules: 0,
    Biceps: 0,
    Triceps: 0,
    'Avant-bras': 0,
    Abdos: 0,
    Quadriceps: 0,
    Ischios: 0,
    Fessiers: 0,
    Mollets: 0,
  };

  for (const ex of available) {
    if (counts[ex.muscleGroup] !== undefined) {
      counts[ex.muscleGroup]++;
    }
  }

  return counts;
}

/**
 * Ajoute un nouvel exercice.
 * Rejette si le nom est vide ou si un exercice du même nom (insensible à la casse) existe déjà.
 */
export async function addExercise(data: {
  name: string;
  muscleGroup: MuscleGroup;
}): Promise<number> {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("Le nom de l'exercice ne peut pas être vide.");
  }

  const normalized = trimmedName.toLowerCase();
  const all = await db.exercises.toArray();
  const duplicate = all.some(
    (ex) => !ex.archived && ex.name.trim().toLowerCase() === normalized
  );

  if (duplicate) {
    throw new Error(`Un exercice nommé "${trimmedName}" existe déjà.`);
  }

  return (await db.exercises.add({
    name: trimmedName,
    muscleGroup: data.muscleGroup,
    archived: false,
  })) as number;
}

/**
 * Met à jour un exercice existant.
 * Rejette si le nom est vide ou si un autre exercice actif possède déjà ce nom.
 */
export async function updateExercise(
  id: number,
  changes: { name?: string; muscleGroup?: MuscleGroup }
): Promise<void> {
  if (changes.name !== undefined) {
    const trimmed = changes.name.trim();
    if (!trimmed) {
      throw new Error("Le nom de l'exercice ne peut pas être vide.");
    }

    const normalized = trimmed.toLowerCase();
    const all = await db.exercises.toArray();
    const duplicate = all.some(
      (ex) =>
        ex.id !== id &&
        !ex.archived &&
        ex.name.trim().toLowerCase() === normalized
    );

    if (duplicate) {
      throw new Error(`Un exercice nommé "${trimmed}" existe déjà.`);
    }

    changes.name = trimmed;
  }

  await db.exercises.update(id, changes);
}

/**
 * Suppression douce (soft delete) : marque l'exercice comme archivé.
 */
export async function deleteExercise(id: number): Promise<void> {
  await db.exercises.update(id, { archived: true });
}
