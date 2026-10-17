import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db } from '../schema';

describe('Dexie v1 to v2 migration', () => {
  beforeEach(async () => {
    await db.close();
    await Dexie.delete('MuscuPWA');
  });

  afterEach(async () => {
    await db.close();
    await Dexie.delete('MuscuPWA');
  });

  it('migrates v1 database to v2 while preserving data and setting correct upgrade values', async () => {
    // 1. Déclarer une instance Dexie UNIQUEMENT en version(1)
    const v1Db = new Dexie('MuscuPWA');
    v1Db.version(1).stores({
      exercises: '++id, name',
      sessions: '++id, date',
      sets: '++id, sessionId, exerciseId, [sessionId+order]',
    });

    await v1Db.open();
    const exId = (await v1Db.table('exercises').add({
      name: 'Développé couché',
      muscleGroup: 'Pectoraux',
    })) as number;

    const sId = (await v1Db.table('sessions').add({
      date: '2026-10-15',
      title: 'Séance v1',
    })) as number;

    await v1Db.table('sets').bulkAdd([
      {
        sessionId: sId,
        exerciseId: exId,
        order: 1,
        reps: 10,
        weight: 80,
      },
      {
        sessionId: sId,
        exerciseId: exId,
        order: 2,
        reps: 8,
        weight: 85,
      },
    ]);

    await v1Db.close();

    // 2. Ouvrir la base avec db (v1 + v2 upgrade)
    await db.open();
    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(3);

    // 3. Vérifier les données migrées
    const exercises = await db.exercises.toArray();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Développé couché');

    const expectedStartedAt = new Date('2026-10-15T00:00:00').toISOString();

    const session = await db.sessions.get(sId);
    expect(session).toBeDefined();
    expect(session?.date).toBe('2026-10-15');
    expect(session?.startedAt).toBe(expectedStartedAt);
    expect(session?.endedAt).toBe(expectedStartedAt);

    const sets = await db.sets.where('sessionId').equals(sId).sortBy('order');
    expect(sets).toHaveLength(2);

    // Série 1 : order 1 -> startedAt + 1 seconde
    expect(sets[0].type).toBe('work');
    expect(sets[0].reps).toBe(10);
    expect(sets[0].weight).toBe(80);
    expect(sets[0].createdAt).toBe(
      new Date(new Date(expectedStartedAt).getTime() + 1000).toISOString()
    );

    // Série 2 : order 2 -> startedAt + 2 secondes
    expect(sets[1].type).toBe('work');
    expect(sets[1].reps).toBe(8);
    expect(sets[1].weight).toBe(85);
    expect(sets[1].createdAt).toBe(
      new Date(new Date(expectedStartedAt).getTime() + 2000).toISOString()
    );

    // Vérifier l'ordre chronologique des createdAt
    expect(new Date(sets[0].createdAt).getTime()).toBeLessThan(
      new Date(sets[1].createdAt).getTime()
    );
  });
});
