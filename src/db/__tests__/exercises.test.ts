import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../schema';
import {
  DEFAULT_EXERCISES,
  seedExercisesIfNeeded,
  getAllExercises,
  getExercisesByGroup,
  addExercise,
  updateExercise,
  deleteExercise,
} from '../exercises';

describe('Exercise database operations', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  describe('seedExercisesIfNeeded', () => {
    it('seeds default exercises when database is empty', async () => {
      const seeded = await seedExercisesIfNeeded();
      expect(seeded).toBe(true);

      const count = await db.exercises.count();
      expect(count).toBe(DEFAULT_EXERCISES.length);
    });

    it('is idempotent and does not re-seed if exercises already exist', async () => {
      await seedExercisesIfNeeded();
      const secondCall = await seedExercisesIfNeeded();
      expect(secondCall).toBe(false);

      const count = await db.exercises.count();
      expect(count).toBe(DEFAULT_EXERCISES.length);
    });

    it('handles concurrent calls via Promise.all without duplicating exercises', async () => {
      const [res1, res2] = await Promise.all([
        seedExercisesIfNeeded(),
        seedExercisesIfNeeded(),
      ]);

      // Exactly one should return true, one should return false
      expect([res1, res2].sort()).toEqual([false, true]);

      const count = await db.exercises.count();
      expect(count).toBe(DEFAULT_EXERCISES.length);
    });
  });

  describe('getAllExercises & getExercisesByGroup', () => {
    it('returns active exercises sorted alphabetically by name', async () => {
      await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Curl biceps', muscleGroup: 'Bras' });

      const exercises = await getAllExercises();
      expect(exercises.map((e) => e.name)).toEqual([
        'Curl biceps',
        'Développé couché',
        'Squat',
      ]);
    });

    it('excludes archived exercises', async () => {
      const id = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await addExercise({ name: 'Fentes', muscleGroup: 'Jambes' });

      await deleteExercise(id);

      const active = await getAllExercises();
      expect(active.map((e) => e.name)).toEqual(['Fentes']);
    });

    it('groups active exercises by muscle group', async () => {
      await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

      const grouped = await getExercisesByGroup();
      expect(grouped.Jambes).toHaveLength(1);
      expect(grouped.Jambes[0].name).toBe('Squat');
      expect(grouped.Pectoraux).toHaveLength(1);
      expect(grouped.Pectoraux[0].name).toBe('Développé couché');
      expect(grouped.Dos).toHaveLength(0);
    });
  });

  describe('addExercise', () => {
    it('adds a valid exercise', async () => {
      const id = await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });
      expect(id).toBeGreaterThan(0);

      const created = await db.exercises.get(id);
      expect(created).toBeDefined();
      expect(created?.name).toBe('Tractions');
      expect(created?.muscleGroup).toBe('Dos');
      expect(created?.archived).toBe(false);
    });

    it('rejects empty name or name containing only whitespace', async () => {
      await expect(addExercise({ name: '', muscleGroup: 'Dos' })).rejects.toThrow(
        /ne peut pas être vide/i
      );
      await expect(addExercise({ name: '   ', muscleGroup: 'Dos' })).rejects.toThrow(
        /ne peut pas être vide/i
      );
    });

    it('rejects duplicate exercise names (case-insensitive and trimmed)', async () => {
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

      await expect(
        addExercise({ name: 'développé couché', muscleGroup: 'Pectoraux' })
      ).rejects.toThrow(/existe déjà/i);

      await expect(
        addExercise({ name: '  DÉVELOPPÉ COUCHÉ  ', muscleGroup: 'Épaules' })
      ).rejects.toThrow(/existe déjà/i);
    });
  });

  describe('updateExercise', () => {
    it('updates name and muscleGroup successfully', async () => {
      const id = await addExercise({ name: 'Curl', muscleGroup: 'Bras' });
      await updateExercise(id, { name: 'Curl barre EZ', muscleGroup: 'Bras' });

      const updated = await db.exercises.get(id);
      expect(updated?.name).toBe('Curl barre EZ');
    });

    it('rejects empty or whitespace-only name update', async () => {
      const id = await addExercise({ name: 'Curl', muscleGroup: 'Bras' });
      await expect(updateExercise(id, { name: '   ' })).rejects.toThrow(
        /ne peut pas être vide/i
      );
    });

    it('rejects renaming to an existing exercise name', async () => {
      const id1 = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await addExercise({ name: 'Presse', muscleGroup: 'Jambes' });

      await expect(updateExercise(id1, { name: '  presse  ' })).rejects.toThrow(
        /existe déjà/i
      );
    });

    it('allows updating without changing name to itself', async () => {
      const id = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
      await expect(
        updateExercise(id, { name: 'Squat', muscleGroup: 'Jambes' })
      ).resolves.not.toThrow();
    });
  });

  describe('deleteExercise (soft delete)', () => {
    it('marks exercise as archived instead of removing it from table', async () => {
      const id = await addExercise({ name: 'Dips', muscleGroup: 'Bras' });
      await deleteExercise(id);

      const record = await db.exercises.get(id);
      expect(record).toBeDefined();
      expect(record?.archived).toBe(true);

      const activeList = await getAllExercises();
      expect(activeList.find((e) => e.id === id)).toBeUndefined();
    });
  });
});
