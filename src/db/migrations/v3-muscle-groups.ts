import type { Transaction } from 'dexie';

export type LegacyMuscleGroup =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Bras'
  | 'Jambes'
  | 'Abdominaux';

const LEGACY_MUSCLE_GROUPS: readonly LegacyMuscleGroup[] = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes',
  'Abdominaux',
] as const;

export function isLegacyMuscleGroup(value: unknown): value is LegacyMuscleGroup {
  return (
    typeof value === 'string' &&
    (LEGACY_MUSCLE_GROUPS as readonly string[]).includes(value)
  );
}

const AVANT_BRAS_KEYWORDS = [
  'avant-bras',
  'avant bras',
  'poignet',
  'wrist',
  'pince',
  'farmer',
  'bobine',
];

const BICEPS_KEYWORDS = [
  'biceps',
  'curl',
  'marteau',
  'pupitre',
  'traction supination',
  'larry scott',
];

const TRICEPS_KEYWORDS = [
  'triceps',
  'barre au front',
  'extension',
  'dips',
  'pushdown',
  'kickback',
  'skull crusher',
  'serre',
  'corde',
];

const ISCHIOS_KEYWORDS = [
  'ischio',
  'ischios',
  'leg curl',
  'romanian',
  'roumain',
  'rdl',
  'souleve de terre jambes tendues',
  'sdtjt',
  'glute ham',
  'nordic',
];

const MOLLETS_KEYWORDS = [
  'mollet',
  'mollets',
  'calf',
  'mollets debout',
  'mollets assis',
  'soleaire',
];

const FESSIERS_KEYWORDS = [
  'fessier',
  'fessiers',
  'glute',
  'hip thrust',
  'pont',
  'kickback fessier',
  'abduction',
  'fente bulgare',
  'abducteur',
];

const QUADRICEPS_KEYWORDS = [
  'squat',
  'quadriceps',
  'quad',
  'presse',
  'leg extension',
  'fente',
  'hack',
  'sissy',
  'adducteur',
];

function normalizeMigrationString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function migrateMuscleGroupValue(name: string, oldGroup: unknown): unknown {
  if (!isLegacyMuscleGroup(oldGroup)) {
    return oldGroup;
  }

  if (oldGroup === 'Abdominaux') {
    return 'Abdos';
  }

  if (oldGroup === 'Pectoraux' || oldGroup === 'Dos' || oldGroup === 'Épaules') {
    return oldGroup;
  }

  const norm = normalizeMigrationString(name);

  if (oldGroup === 'Bras') {
    for (const kw of AVANT_BRAS_KEYWORDS) {
      if (norm.includes(kw)) return 'Avant-bras';
    }
    for (const kw of BICEPS_KEYWORDS) {
      if (norm.includes(kw)) return 'Biceps';
    }
    for (const kw of TRICEPS_KEYWORDS) {
      if (norm.includes(kw)) return 'Triceps';
    }
    return 'Biceps';
  }

  if (oldGroup === 'Jambes') {
    for (const kw of ISCHIOS_KEYWORDS) {
      if (norm.includes(kw)) return 'Ischios';
    }
    for (const kw of MOLLETS_KEYWORDS) {
      if (norm.includes(kw)) return 'Mollets';
    }
    for (const kw of FESSIERS_KEYWORDS) {
      if (norm.includes(kw)) return 'Fessiers';
    }
    for (const kw of QUADRICEPS_KEYWORDS) {
      if (norm.includes(kw)) return 'Quadriceps';
    }
    return 'Quadriceps';
  }

  return oldGroup;
}

/**
 * Migration autonome et figée Dexie v2 -> v3 pour les groupes musculaires.
 * Modifie tous les exercices (actifs et archivés).
 */
export async function migrateV3MuscleGroups(tx: Transaction): Promise<void> {
  await tx
    .table('exercises')
    .toCollection()
    .modify((exercise: Record<string, unknown>) => {
      if (typeof exercise.name === 'string') {
        exercise.muscleGroup = migrateMuscleGroupValue(
          exercise.name,
          exercise.muscleGroup
        );
      }
    });
}
