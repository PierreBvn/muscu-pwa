import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, type MuscleGroup } from '../schema';
import {
  exportBackup,
  parseBackup,
  importBackup,
  clearAllData,
  type BackupData,
} from '../backup';
import { seedExercisesIfNeeded } from '../exercises';

const EXPECTED_TABLES = [
  'exercises',
  'sessions',
  'sets',
  'programs',
  'programExercises',
  'sessionExercises',
] as const;

describe('Backup & Restore (src/db/backup.ts)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function populateAllTables() {
    const exercise1Id = (await db.exercises.add({
      name: 'Développé couché',
      muscleGroup: 'Pectoraux' as MuscleGroup,
      archived: false,
      weightStep: 2.5,
    })) as number;

    const exercise2Id = (await db.exercises.add({
      name: 'Tractions archivées',
      muscleGroup: 'Dos' as MuscleGroup,
      archived: true,
    })) as number;

    const programId = (await db.programs.add({
      name: 'Programme Push',
      weekdays: [1, 3, 5],
    })) as number;

    const peId = (await db.programExercises.add({
      programId,
      exerciseId: exercise1Id,
      order: 0,
      warmupSets: 2,
      workSets: 3,
    })) as number;

    const sessionId = (await db.sessions.add({
      date: '2026-10-17',
      programId,
      startedAt: '2026-10-17T09:00:00.000Z',
      endedAt: '2026-10-17T10:00:00.000Z',
      title: 'Séance Push Matin',
      notes: 'Bonne séance',
    })) as number;

    const seId = (await db.sessionExercises.add({
      sessionId,
      exerciseId: exercise1Id,
      order: 0,
      warmupSets: 2,
      workSets: 3,
      skipped: false,
    })) as number;

    const set1Id = (await db.sets.add({
      sessionId,
      exerciseId: exercise1Id,
      order: 0,
      reps: 10,
      weight: 60,
      type: 'warmup',
      createdAt: '2026-10-17T09:05:00.000Z',
    })) as number;

    const set2Id = (await db.sets.add({
      sessionId,
      exerciseId: exercise1Id,
      order: 1,
      reps: 8,
      weight: 80,
      type: 'work',
      createdAt: '2026-10-17T09:10:00.000Z',
    })) as number;

    return {
      exercise1Id,
      exercise2Id,
      programId,
      peId,
      sessionId,
      seId,
      set1Id,
      set2Id,
    };
  }

  async function getDatabaseSnapshot(): Promise<Record<string, unknown[]>> {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of db.tables) {
      snapshot[table.name] = await table.toArray();
    }
    return snapshot;
  }

  it('vérifie la liste exacte des 6 tables du schéma et au moins 1 ligne par table', async () => {
    // 1. La liste des tables de db.tables est rigoureusement identique aux 6 attendues
    const currentTableNames = db.tables.map((t) => t.name).sort();
    const expectedSorted = [...EXPECTED_TABLES].sort();
    expect(currentTableNames).toEqual(expectedSorted);

    // 2. Vérifie qu'avec les données de test, chaque table a au moins 1 ligne
    await populateAllTables();
    for (const tableName of EXPECTED_TABLES) {
      const count = await db.table(tableName).count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it('exécute un aller-retour complet via le chemin réel et préserve les données, comptes et types de date', async () => {
    await populateAllTables();

    // 1. Lecture avant export
    const initialSnapshot = await getDatabaseSnapshot();

    // 2. Vrai chemin : exportBackup -> JSON.stringify -> parseBackup -> importBackup
    const exported = await exportBackup();
    expect(exported.app).toBe('muscu-pwa');
    expect(exported.dbVersion).toBe(db.verno);
    expect(typeof exported.exportedAt).toBe('string');

    const jsonString = JSON.stringify(exported);
    const parsed = parseBackup(jsonString);

    // 3. Vidage complet de la base
    await Promise.all(db.tables.map((t) => t.clear()));
    for (const table of db.tables) {
      expect(await table.count()).toBe(0);
    }

    // 4. Import
    await importBackup(parsed);

    // 5. Lecture après import et comparaison
    const restoredSnapshot = await getDatabaseSnapshot();
    expect(restoredSnapshot).toEqual(initialSnapshot);

    // Vérification des comptes identiques
    for (const table of db.tables) {
      expect(restoredSnapshot[table.name].length).toBe(
        initialSnapshot[table.name].length
      );
    }

    // Vérification stricte des types string des champs date
    const restoredSessions = (await db.sessions.toArray()) as Array<{
      date: unknown;
      startedAt: unknown;
      endedAt?: unknown;
    }>;
    expect(restoredSessions.length).toBeGreaterThan(0);
    for (const s of restoredSessions) {
      expect(typeof s.date).toBe('string');
      expect(typeof s.startedAt).toBe('string');
      expect(typeof s.endedAt).toBe('string');
    }

    const restoredSets = (await db.sets.toArray()) as Array<{
      createdAt: unknown;
    }>;
    expect(restoredSets.length).toBeGreaterThan(0);
    for (const set of restoredSets) {
      expect(typeof set.createdAt).toBe('string');
    }
  });

  it('vérifie que seedExercisesIfNeeded renvoie false après un import et ne modifie rien', async () => {
    await populateAllTables();
    const backup = await exportBackup();
    const parsed = parseBackup(JSON.stringify(backup));

    await Promise.all(db.tables.map((t) => t.clear()));
    await importBackup(parsed);

    const snapshotBeforeSeed = await getDatabaseSnapshot();

    // Appel du seed après import
    const seeded = await seedExercisesIfNeeded();
    expect(seeded).toBe(false);

    // Les comptes et contenus sont strictement inchangés
    const snapshotAfterSeed = await getDatabaseSnapshot();
    expect(snapshotAfterSeed).toEqual(snapshotBeforeSeed);
  });

  describe('Fichiers invalides (parseBackup)', () => {
    it('rejette un JSON cassé sans toucher la base', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      expect(() => parseBackup('{"invalid json: ')).toThrow(/JSON/i);

      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette une app non reconnue', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const invalid = {
        app: 'other-fitness-app',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: initialSnapshot,
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /application non reconnue/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette une version de base incompatible', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const invalid = {
        app: 'muscu-pwa',
        dbVersion: db.verno + 1,
        exportedAt: new Date().toISOString(),
        tables: initialSnapshot,
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /version.*différente/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette une table manquante', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const tablesMissingSets = { ...initialSnapshot };
      delete tablesMissingSets.sets;

      const invalid = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: tablesMissingSets,
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /table manquante ou invalide.*sets/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette si une table n’est pas un tableau', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const invalid = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: {
          ...initialSnapshot,
          sets: 'pas un tableau',
        },
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /table manquante ou invalide.*sets/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette si une table contient une ligne qui n’est pas un objet', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const invalid = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: {
          ...initialSnapshot,
          sets: ['chaine au lieu d’un objet'],
        },
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /ligne invalide dans la table sets/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette si une ligne a un id invalide (manquant, 0, négatif ou flottant)', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const testCases = [
        { name: 'manquant', row: { name: 'Test' } },
        { name: 'zéro', row: { id: 0, name: 'Test' } },
        { name: 'négatif', row: { id: -1, name: 'Test' } },
        { name: 'flottant', row: { id: 1.5, name: 'Test' } },
        { name: 'string', row: { id: '1', name: 'Test' } },
      ];

      for (const tc of testCases) {
        const invalid = {
          app: 'muscu-pwa',
          dbVersion: db.verno,
          exportedAt: new Date().toISOString(),
          tables: {
            ...initialSnapshot,
            exercises: [tc.row],
          },
        };

        expect(
          () => parseBackup(JSON.stringify(invalid)),
          `Doit rejeter pour id ${tc.name}`
        ).toThrow(/identifiant invalide dans la table exercises/i);
      }

      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });

    it('rejette si tables contient une table inconnue', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const invalid = {
        app: 'muscu-pwa',
        dbVersion: db.verno,
        exportedAt: new Date().toISOString(),
        tables: {
          ...initialSnapshot,
          tableInconnue: [],
        },
      };

      expect(() => parseBackup(JSON.stringify(invalid))).toThrow(
        /table inconnue.*tableInconnue/i
      );
      expect(await getDatabaseSnapshot()).toEqual(initialSnapshot);
    });
  });

  describe('Rollback de transaction en cas d’erreur d’écriture', () => {
    it('annule toute la transaction si une erreur survient et laisse la base intacte', async () => {
      await populateAllTables();
      const initialSnapshot = await getDatabaseSnapshot();

      const exported = await exportBackup();
      const validBackup: BackupData = {
        ...exported,
        tables: {
          ...exported.tables,
          // Données modifiées pour voir si une table partielle aurait été enregistrée
          exercises: [
            {
              id: 999,
              name: 'Exercice Nouveau qui ne doit pas rester',
              muscleGroup: 'Biceps',
            },
          ],
        },
      };

      // Espion sur db.sets.bulkAdd qui rejette
      const spy = vi
        .spyOn(db.sets, 'bulkAdd')
        .mockRejectedValueOnce(new Error('Erreur écriture simulée'));

      await expect(importBackup(validBackup)).rejects.toThrow(
        'Erreur écriture simulée'
      );

      // Vérifie que l'espion a bien été appelé
      expect(spy).toHaveBeenCalled();

      // Vérifie que la base est rigoureusement identique à l'état initial (rollback complet)
      const afterRollbackSnapshot = await getDatabaseSnapshot();
      expect(afterRollbackSnapshot).toEqual(initialSnapshot);
    });
  });

  describe('clearAllData', () => {
    it('vide l’intégralité de toutes les tables Dexie', async () => {
      await populateAllTables();
      for (const table of db.tables) {
        expect(await table.count()).toBeGreaterThan(0);
      }

      await clearAllData();

      for (const table of db.tables) {
        expect(await table.count()).toBe(0);
      }
    });
  });
});

