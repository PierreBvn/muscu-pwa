import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db } from '../schema';

describe('Dexie v2 to v3 migration (groupes musculaires)', () => {
  beforeEach(async () => {
    await db.close();
    await Dexie.delete('MuscuPWA');
  });

  afterEach(async () => {
    await db.close();
    await Dexie.delete('MuscuPWA');
  });

  it('migrates v2 database to v3 preserving all exercises, sessions, and sets with strict keyword priorities', async () => {
    // 1. Déclarer une instance Dexie configurée jusqu'en version 2
    const v2Db = new Dexie('MuscuPWA');
    v2Db.version(1).stores({
      exercises: '++id, name',
      sessions: '++id, date',
      sets: '++id, sessionId, exerciseId, [sessionId+order]',
    });

    v2Db.version(2).stores({
      exercises: '++id, name',
      sessions: '++id, date, programId',
      sets: '++id, sessionId, exerciseId, [exerciseId+createdAt], [sessionId+order]',
      programs: '++id, name',
      programExercises: '++id, programId, [programId+order]',
      sessionExercises: '++id, sessionId, [sessionId+order]',
    });

    await v2Db.open();

    // Insertion des 19 exercices du seed v2
    const seedV2Exercises = [
      { name: 'Développé couché', muscleGroup: 'Pectoraux' },
      { name: 'Développé incliné haltères', muscleGroup: 'Pectoraux' },
      { name: 'Écarté à la poulie', muscleGroup: 'Pectoraux' },
      { name: 'Tractions', muscleGroup: 'Dos' },
      { name: 'Soulevé de terre', muscleGroup: 'Dos' },
      { name: 'Rowing barre', muscleGroup: 'Dos' },
      { name: 'Tirage vertical', muscleGroup: 'Dos' },
      { name: 'Développé militaire', muscleGroup: 'Épaules' },
      { name: 'Élévations latérales', muscleGroup: 'Épaules' },
      { name: 'Oiseau banc incliné', muscleGroup: 'Épaules' },
      { name: 'Squat', muscleGroup: 'Jambes' },
      { name: 'Presse à cuisses', muscleGroup: 'Jambes' },
      { name: 'Fentes', muscleGroup: 'Jambes' },
      { name: 'Leg curl', muscleGroup: 'Jambes' },
      { name: 'Curl biceps barre', muscleGroup: 'Bras' },
      { name: 'Dips', muscleGroup: 'Bras' },
      { name: 'Barre au front', muscleGroup: 'Bras' },
      { name: 'Crunch', muscleGroup: 'Abdominaux' },
      { name: 'Gainage planche', muscleGroup: 'Abdominaux' },
    ];

    await v2Db.table('exercises').bulkAdd(
      seedV2Exercises.map((e) => ({ ...e, archived: false }))
    );

    // Insertion des exercices personnalisés utilisateurs
    const curlPoignetId = (await v2Db.table('exercises').add({
      name: 'Curl poignet',
      muscleGroup: 'Bras',
      archived: false,
      weightStep: 0.5,
    })) as number;

    const fenteBulgareId = (await v2Db.table('exercises').add({
      name: 'Fente bulgare',
      muscleGroup: 'Jambes',
      archived: false,
    })) as number;

    const gluteHamId = (await v2Db.table('exercises').add({
      name: 'Glute ham',
      muscleGroup: 'Jambes',
      archived: false,
    })) as number;

    const sansMotCleId = (await v2Db.table('exercises').add({
      name: 'Mon exercice sans mot-clé',
      muscleGroup: 'Bras',
      archived: false,
    })) as number;

    const autreMystereId = (await v2Db.table('exercises').add({
      name: 'Autre exercice mystère',
      muscleGroup: 'Jambes',
      archived: false,
    })) as number;

    const releveBassinId = (await v2Db.table('exercises').add({
      name: 'Relevé de bassin',
      muscleGroup: 'Abdominaux',
      archived: false,
    })) as number;

    const devCouchePersoId = (await v2Db.table('exercises').add({
      name: 'Développé couché barre olympique',
      muscleGroup: 'Pectoraux',
      archived: false,
    })) as number;

    const inconnuId = (await v2Db.table('exercises').add({
      name: 'Exercice inconnu',
      muscleGroup: 'AutreInconnu',
      archived: false,
    })) as number;

    // Exercice archivé 'Bras' relié à des séries (exigence utilisateur)
    const archivedExId = (await v2Db.table('exercises').add({
      name: 'Barre au front ancienne',
      muscleGroup: 'Bras',
      archived: true,
    })) as number;

    // Insertion de séances et séries
    const s1Id = (await v2Db.table('sessions').add({
      date: '2026-10-16',
      startedAt: '2026-10-16T10:00:00.000Z',
      endedAt: '2026-10-16T11:00:00.000Z',
      title: 'Séance bras',
    })) as number;

    await v2Db.table('sessionExercises').bulkAdd([
      { sessionId: s1Id, exerciseId: curlPoignetId, order: 1, warmupSets: 1, workSets: 3 },
      { sessionId: s1Id, exerciseId: archivedExId, order: 2, warmupSets: 0, workSets: 2 },
    ]);

    await v2Db.table('sets').bulkAdd([
      {
        sessionId: s1Id,
        exerciseId: curlPoignetId,
        order: 1,
        reps: 15,
        weight: 12.5,
        type: 'work',
        createdAt: '2026-10-16T10:05:00.000Z',
      },
      {
        sessionId: s1Id,
        exerciseId: curlPoignetId,
        order: 2,
        reps: 15,
        weight: 12.5,
        type: 'work',
        createdAt: '2026-10-16T10:08:00.000Z',
      },
      {
        sessionId: s1Id,
        exerciseId: archivedExId,
        order: 3,
        reps: 10,
        weight: 30,
        type: 'work',
        createdAt: '2026-10-16T10:15:00.000Z',
      },
    ]);

    // Comptages pré-migration
    const totalExercisesBefore = await v2Db.table('exercises').count();
    const totalSessionsBefore = await v2Db.table('sessions').count();
    const totalSetsBefore = await v2Db.table('sets').count();

    expect(totalExercisesBefore).toBe(19 + 9); // 19 seed + 9 custom/archivé
    expect(totalSessionsBefore).toBe(1);
    expect(totalSetsBefore).toBe(3);

    await v2Db.close();

    // 2. Ouvrir la base avec l'instance db de l'application (qui contient la version 3)
    await db.open();

    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(3);

    // 3. Vérification de conservation stricte des quantités (aucun ajout, aucune suppression)
    const totalExercisesAfter = await db.exercises.count();
    const totalSessionsAfter = await db.sessions.count();
    const totalSetsAfter = await db.sets.count();

    expect(totalExercisesAfter).toBe(totalExercisesBefore);
    expect(totalSessionsAfter).toBe(totalSessionsBefore);
    expect(totalSetsAfter).toBe(totalSetsBefore);

    // 4. Vérification des 19 exercices du seed v2 migrés
    const exercisesByName = new Map(
      (await db.exercises.toArray()).map((ex) => [ex.name, ex])
    );

    expect(exercisesByName.get('Développé couché')?.muscleGroup).toBe('Pectoraux');
    expect(exercisesByName.get('Développé incliné haltères')?.muscleGroup).toBe('Pectoraux');
    expect(exercisesByName.get('Écarté à la poulie')?.muscleGroup).toBe('Pectoraux');
    expect(exercisesByName.get('Tractions')?.muscleGroup).toBe('Dos');
    expect(exercisesByName.get('Soulevé de terre')?.muscleGroup).toBe('Dos');
    expect(exercisesByName.get('Rowing barre')?.muscleGroup).toBe('Dos');
    expect(exercisesByName.get('Tirage vertical')?.muscleGroup).toBe('Dos');
    expect(exercisesByName.get('Développé militaire')?.muscleGroup).toBe('Épaules');
    expect(exercisesByName.get('Élévations latérales')?.muscleGroup).toBe('Épaules');
    expect(exercisesByName.get('Oiseau banc incliné')?.muscleGroup).toBe('Épaules');
    expect(exercisesByName.get('Squat')?.muscleGroup).toBe('Quadriceps');
    expect(exercisesByName.get('Presse à cuisses')?.muscleGroup).toBe('Quadriceps');
    expect(exercisesByName.get('Fentes')?.muscleGroup).toBe('Quadriceps');
    expect(exercisesByName.get('Leg curl')?.muscleGroup).toBe('Ischios');
    expect(exercisesByName.get('Curl biceps barre')?.muscleGroup).toBe('Biceps');
    expect(exercisesByName.get('Dips')?.muscleGroup).toBe('Triceps');
    expect(exercisesByName.get('Barre au front')?.muscleGroup).toBe('Triceps');
    expect(exercisesByName.get('Crunch')?.muscleGroup).toBe('Abdos');
    expect(exercisesByName.get('Gainage planche')?.muscleGroup).toBe('Abdos');

    // 5. Vérification des exercices personnalisés et priorités
    const curlPoignet = await db.exercises.get(curlPoignetId);
    expect(curlPoignet).toBeDefined();
    expect(curlPoignet?.muscleGroup).toBe('Avant-bras'); // poignet prioritaire sur curl
    expect(curlPoignet?.weightStep).toBe(0.5); // weightStep préservé
    expect(curlPoignet?.archived).toBe(false);

    const fenteBulgare = await db.exercises.get(fenteBulgareId);
    expect(fenteBulgare?.muscleGroup).toBe('Fessiers'); // fente bulgare prioritaire sur fente

    const gluteHam = await db.exercises.get(gluteHamId);
    expect(gluteHam?.muscleGroup).toBe('Ischios'); // glute ham prioritaire sur glute

    const sansMotCle = await db.exercises.get(sansMotCleId);
    expect(sansMotCle?.muscleGroup).toBe('Biceps'); // Bras -> défaut Biceps

    const autreMystere = await db.exercises.get(autreMystereId);
    expect(autreMystere?.muscleGroup).toBe('Quadriceps'); // Jambes -> défaut Quadriceps

    const releveBassin = await db.exercises.get(releveBassinId);
    expect(releveBassin?.muscleGroup).toBe('Abdos'); // Abdominaux -> Abdos

    const devCouchePerso = await db.exercises.get(devCouchePersoId);
    expect(devCouchePerso?.muscleGroup).toBe('Pectoraux');

    const inconnu = await db.exercises.get(inconnuId);
    expect(inconnu?.muscleGroup).toBe('AutreInconnu'); // Valeur inconnue non modifiée

    // 6. Exercice archivé migré et préservé
    const archivedEx = await db.exercises.get(archivedExId);
    expect(archivedEx).toBeDefined();
    expect(archivedEx?.muscleGroup).toBe('Triceps'); // barre au front -> Triceps
    expect(archivedEx?.archived).toBe(true); // reste archivé

    // 7. Séries et session préservées
    const sets = await db.sets.where('sessionId').equals(s1Id).sortBy('order');
    expect(sets).toHaveLength(3);
    expect(sets[0].exerciseId).toBe(curlPoignetId);
    expect(sets[0].weight).toBe(12.5);
    expect(sets[1].exerciseId).toBe(curlPoignetId);
    expect(sets[2].exerciseId).toBe(archivedExId);
    expect(sets[2].weight).toBe(30);
  });
});
