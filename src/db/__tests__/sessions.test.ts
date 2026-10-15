import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../schema';
import { addExercise } from '../exercises';
import { createProgram, addExerciseToProgram } from '../programs';
import {
  formatLocalDate,
  getActiveSession,
  getSession,
  getSessionDetails,
  startSession,
  finishSession,
  closeForgottenSession,
  getSessionExercises,
  addExerciseToSession,
  removeExerciseFromSession,
  skipSessionExercise,
  updateSessionExerciseSetsCount,
  moveSessionExercise,
  addSet,
  updateSet,
  deleteSet,
  getSetsForSession,
} from '../sessions';

describe('Sessions data layer (src/db/sessions.ts)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('formatLocalDate', () => {
    it('formats local session date as 2026-10-15 from local date components at 00:30', () => {
      // Mois 9 = octobre en JS (0-indexé)
      const now = new Date(2026, 9, 15, 0, 30);
      expect(formatLocalDate(now)).toBe('2026-10-15');
    });
  });

  describe('startSession and getActiveSession', () => {
    it('starts a free session without program and with 0 initial sessionExercises', async () => {
      const now = new Date(2026, 9, 15, 10, 0);
      const sessionId = await startSession({ now });

      const session = await getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.date).toBe('2026-10-15');
      expect(session?.startedAt).toBe(now.toISOString());
      expect(session?.endedAt).toBeUndefined();
      expect(session?.programId).toBeUndefined();

      const sessionExercises = await getSessionExercises(sessionId);
      expect(sessionExercises).toEqual([]);

      const active = await getActiveSession();
      expect(active?.id).toBe(sessionId);
    });

    it('copies program exercises into sessionExercises without mutating the program', async () => {
      const ex1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      const ex2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

      const progId = await createProgram({ name: 'Push', weekdays: [1, 4] });
      await addExerciseToProgram({ programId: progId, exerciseId: ex1, warmupSets: 2, workSets: 4 });
      await addExerciseToProgram({ programId: progId, exerciseId: ex2, warmupSets: 0, workSets: 3 });

      const now = new Date(2026, 9, 16, 14, 0);
      const sessionId = await startSession({ programId: progId, now });

      const session = await getSession(sessionId);
      expect(session?.programId).toBe(progId);
      expect(session?.date).toBe('2026-10-16');

      const sExercises = await getSessionExercises(sessionId);
      expect(sExercises).toHaveLength(2);
      expect(sExercises[0]).toMatchObject({
        sessionId,
        exerciseId: ex1,
        order: 0,
        warmupSets: 2,
        workSets: 4,
        skipped: false,
      });
      expect(sExercises[1]).toMatchObject({
        sessionId,
        exerciseId: ex2,
        order: 1,
        warmupSets: 0,
        workSets: 3,
        skipped: false,
      });
    });

    it('fails to start a new session if an active session exists, including concurrent startSession via Promise.all', async () => {
      const now = new Date(2026, 9, 15, 10, 0);
      await startSession({ now });

      // Tentative séquentielle
      await expect(startSession({ now })).rejects.toThrow(
        /séance est déjà en cours/i
      );

      // Réinitialisation de la base pour tester la concurrence avec Promise.all
      await db.delete();
      await db.open();

      const results = await Promise.allSettled([
        startSession({ now }),
        startSession({ now }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const allSessions = await db.sessions.toArray();
      expect(allSessions).toHaveLength(1);
    });

    it('returns active session when endedAt is undefined and undefined when completed', async () => {
      expect(await getActiveSession()).toBeUndefined();

      const sid = await startSession({ now: new Date(2026, 9, 15, 9, 0) });
      expect((await getActiveSession())?.id).toBe(sid);

      // Ajouter une série pour permettre la clôture sans suppression
      const exId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 100, type: 'work' });

      await finishSession(sid, { now: new Date(2026, 9, 15, 10, 0) });
      expect(await getActiveSession()).toBeUndefined();
    });
  });

  describe('SessionExercise management and integrity', () => {
    it('adds exercise to session with auto-incremented order without altering program', async () => {
      const ex1 = await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });
      const ex2 = await addExercise({ name: 'Rowing', muscleGroup: 'Dos' });

      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const se1 = await addExerciseToSession({ sessionId: sid, exerciseId: ex1, warmupSets: 1, workSets: 3 });
      const se2 = await addExerciseToSession({ sessionId: sid, exerciseId: ex2, warmupSets: 0, workSets: 4 });

      const exercises = await getSessionExercises(sid);
      expect(exercises).toHaveLength(2);
      expect(exercises[0].id).toBe(se1);
      expect(exercises[0].order).toBe(0);
      expect(exercises[1].id).toBe(se2);
      expect(exercises[1].order).toBe(1);
    });

    it('rejects removing an exercise that already has recorded sets in the session', async () => {
      const exId = await addExercise({ name: 'Développé militaire', muscleGroup: 'Épaules' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const seId = await addExerciseToSession({ sessionId: sid, exerciseId: exId });

      await addSet({
        sessionId: sid,
        exerciseId: exId,
        reps: 8,
        weight: 50,
        type: 'work',
      });

      // La suppression doit être rejetée pour ne pas supprimer les données de l'utilisateur
      await expect(removeExerciseFromSession(seId)).rejects.toThrow(
        /impossible de retirer un exercice ayant déjà des séries/i
      );

      // L'exercice et ses séries sont toujours là
      const exercises = await getSessionExercises(sid);
      expect(exercises).toHaveLength(1);
      const sets = await getSetsForSession(sid);
      expect(sets).toHaveLength(1);
    });

    it('removes sessionExercise when no sets exist and reindexes remaining orders', async () => {
      const ex1 = await addExercise({ name: 'Ex 1', muscleGroup: 'Bras' });
      const ex2 = await addExercise({ name: 'Ex 2', muscleGroup: 'Bras' });
      const ex3 = await addExercise({ name: 'Ex 3', muscleGroup: 'Bras' });

      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      await addExerciseToSession({ sessionId: sid, exerciseId: ex1 });
      const se2 = await addExerciseToSession({ sessionId: sid, exerciseId: ex2 });
      await addExerciseToSession({ sessionId: sid, exerciseId: ex3 });

      await removeExerciseFromSession(se2);

      const remaining = await getSessionExercises(sid);
      expect(remaining).toHaveLength(2);
      expect(remaining[0].exerciseId).toBe(ex1);
      expect(remaining[0].order).toBe(0);
      expect(remaining[1].exerciseId).toBe(ex3);
      expect(remaining[1].order).toBe(1);
    });

    it('toggles skipped flag on session exercise', async () => {
      const exId = await addExercise({ name: 'Curl biceps', muscleGroup: 'Bras' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const seId = await addExerciseToSession({ sessionId: sid, exerciseId: exId });

      expect((await getSessionExercises(sid))[0].skipped).toBe(false);

      await skipSessionExercise(seId, true);
      expect((await getSessionExercises(sid))[0].skipped).toBe(true);

      await skipSessionExercise(seId, false);
      expect((await getSessionExercises(sid))[0].skipped).toBe(false);
    });

    it('updates warmupSets and workSets with validation bounds (0-4 and 1-6)', async () => {
      const exId = await addExercise({ name: 'Dips', muscleGroup: 'Pectoraux' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const seId = await addExerciseToSession({ sessionId: sid, exerciseId: exId });

      await updateSessionExerciseSetsCount(seId, { warmupSets: 3, workSets: 5 });
      const ex = (await getSessionExercises(sid))[0];
      expect(ex.warmupSets).toBe(3);
      expect(ex.workSets).toBe(5);

      await expect(updateSessionExerciseSetsCount(seId, { warmupSets: 5 })).rejects.toThrow();
      await expect(updateSessionExerciseSetsCount(seId, { warmupSets: -1 })).rejects.toThrow();
      await expect(updateSessionExerciseSetsCount(seId, { workSets: 0 })).rejects.toThrow();
      await expect(updateSessionExerciseSetsCount(seId, { workSets: 7 })).rejects.toThrow();
    });

    it('moves session exercise up and down keeping contiguous orders', async () => {
      const ex1 = await addExercise({ name: 'A', muscleGroup: 'Dos' });
      const ex2 = await addExercise({ name: 'B', muscleGroup: 'Dos' });
      const ex3 = await addExercise({ name: 'C', muscleGroup: 'Dos' });

      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const se1 = await addExerciseToSession({ sessionId: sid, exerciseId: ex1 });
      await addExerciseToSession({ sessionId: sid, exerciseId: ex2 });
      const se3 = await addExerciseToSession({ sessionId: sid, exerciseId: ex3 });

      // Monter le premier est sans effet
      await moveSessionExercise(se1, 'up');
      let list = await getSessionExercises(sid);
      expect(list.map((e) => e.exerciseId)).toEqual([ex1, ex2, ex3]);

      // Descendre le dernier est sans effet
      await moveSessionExercise(se3, 'down');
      list = await getSessionExercises(sid);
      expect(list.map((e) => e.exerciseId)).toEqual([ex1, ex2, ex3]);

      // Descendre le premier
      await moveSessionExercise(se1, 'down');
      list = await getSessionExercises(sid);
      expect(list.map((e) => e.exerciseId)).toEqual([ex2, ex1, ex3]);
      expect(list.map((e) => e.order)).toEqual([0, 1, 2]);

      // Monter le dernier
      await moveSessionExercise(se3, 'up');
      list = await getSessionExercises(sid);
      expect(list.map((e) => e.exerciseId)).toEqual([ex2, ex3, ex1]);
      expect(list.map((e) => e.order)).toEqual([0, 1, 2]);
    });
  });

  describe('Sets management (addSet, updateSet, deleteSet)', () => {
    it('adds set with sequential order calculated in transaction and createdAt from now', async () => {
      const exId = await addExercise({ name: 'Presse à cuisses', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const t1 = new Date(2026, 9, 15, 8, 5);
      const setId1 = await addSet({
        sessionId: sid,
        exerciseId: exId,
        reps: 12,
        weight: 150,
        type: 'warmup',
        now: t1,
      });

      const t2 = new Date(2026, 9, 15, 8, 10);
      const setId2 = await addSet({
        sessionId: sid,
        exerciseId: exId,
        reps: 10,
        weight: 200,
        type: 'work',
        now: t2,
      });

      const sets = await getSetsForSession(sid);
      expect(sets).toHaveLength(2);
      expect(sets[0]).toMatchObject({
        id: setId1,
        sessionId: sid,
        exerciseId: exId,
        order: 0,
        reps: 12,
        weight: 150,
        type: 'warmup',
        createdAt: t1.toISOString(),
      });
      expect(sets[1]).toMatchObject({
        id: setId2,
        sessionId: sid,
        exerciseId: exId,
        order: 1,
        reps: 10,
        weight: 200,
        type: 'work',
        createdAt: t2.toISOString(),
      });
    });

    it('rejects adding set if the session is already finished', async () => {
      const exId = await addExercise({ name: 'Presse', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 100, type: 'work' });

      await finishSession(sid, { now: new Date(2026, 9, 15, 9, 0) });

      await expect(
        addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 100, type: 'work' })
      ).rejects.toThrow(/séance terminée/i);
    });

    it('rejects invalid reps (< 1 or decimal) and negative weights (< 0)', async () => {
      const exId = await addExercise({ name: 'Presse', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      await expect(
        addSet({ sessionId: sid, exerciseId: exId, reps: 0, weight: 100, type: 'work' })
      ).rejects.toThrow();

      await expect(
        addSet({ sessionId: sid, exerciseId: exId, reps: 8.5, weight: 100, type: 'work' })
      ).rejects.toThrow();

      await expect(
        addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: -2.5, type: 'work' })
      ).rejects.toThrow();

      // Poids 0 autorisé (poids du corps)
      const setId = await addSet({
        sessionId: sid,
        exerciseId: exId,
        reps: 10,
        weight: 0,
        type: 'work',
      });
      expect(setId).toBeDefined();
    });

    it('allows modifying and deleting sets while active, rejects when session is finished', async () => {
      const exId = await addExercise({ name: 'Dips', muscleGroup: 'Pectoraux' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const set1 = await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 0, type: 'work' });
      const set2 = await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 5, type: 'work' });

      await updateSet(set1, { reps: 12, weight: 2.5 });
      let sets = await getSetsForSession(sid);
      expect(sets[0].reps).toBe(12);
      expect(sets[0].weight).toBe(2.5);

      await deleteSet(set1);
      sets = await getSetsForSession(sid);
      expect(sets).toHaveLength(1);
      expect(sets[0].id).toBe(set2);
      expect(sets[0].order).toBe(0); // Réindexé

      await finishSession(sid, { now: new Date(2026, 9, 15, 9, 0) });

      await expect(updateSet(set2, { reps: 8 })).rejects.toThrow(/séance terminée/i);
      await expect(deleteSet(set2)).rejects.toThrow(/séance terminée/i);
    });
  });

  describe('Session completion and forgotten sessions', () => {
    it('deletes session and its sessionExercises if finished without any set', async () => {
      const exId = await addExercise({ name: 'Fentes', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      await addExerciseToSession({ sessionId: sid, exerciseId: exId });

      const result = await finishSession(sid, { now: new Date(2026, 9, 15, 9, 0) });
      expect(result).toBe('deleted');

      expect(await getSession(sid)).toBeUndefined();
      expect(await getSessionExercises(sid)).toEqual([]);
    });

    it('marks session completed with endedAt ISO timestamp when sets exist', async () => {
      const exId = await addExercise({ name: 'Fentes', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 20, type: 'work' });

      const endNow = new Date(2026, 9, 15, 9, 15);
      const result = await finishSession(sid, { now: endNow });
      expect(result).toBe('completed');

      const session = await getSession(sid);
      expect(session?.endedAt).toBe(endNow.toISOString());
    });

    it('closes forgotten session setting endedAt to the last set createdAt', async () => {
      const exId = await addExercise({ name: 'Fentes', muscleGroup: 'Jambes' });
      const sid = await startSession({ now: new Date(2026, 9, 14, 18, 0) });

      const t1 = new Date(2026, 9, 14, 18, 10);
      const t2 = new Date(2026, 9, 14, 18, 25);
      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 20, type: 'work', now: t1 });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 20, type: 'work', now: t2 });

      const result = await closeForgottenSession(sid);
      expect(result).toBe('completed');

      const session = await getSession(sid);
      expect(session?.endedAt).toBe(t2.toISOString());
    });

    it('closes forgotten session with 0 set by deleting it', async () => {
      const sid = await startSession({ now: new Date(2026, 9, 14, 18, 0) });
      const result = await closeForgottenSession(sid);
      expect(result).toBe('deleted');
      expect(await getSession(sid)).toBeUndefined();
    });
  });

  describe('getSessionDetails', () => {
    it('returns session with enriched sessionExercises and sets', async () => {
      const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      await addExerciseToSession({ sessionId: sid, exerciseId: exId });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 8, weight: 70, type: 'work' });

      const details = await getSessionDetails(sid);
      expect(details).toBeDefined();
      expect(details?.session.id).toBe(sid);
      expect(details?.exercises).toHaveLength(1);
      expect(details?.exercises[0].exercise?.name).toBe('Développé incliné');
      expect(details?.sets).toHaveLength(1);
      expect(details?.sets[0].weight).toBe(70);
    });
  });
});
