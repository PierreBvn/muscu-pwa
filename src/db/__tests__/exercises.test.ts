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
  normalizeSearchText,
  filterExercises,
  getExerciseCountsByGroup,
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
      await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Curl biceps', muscleGroup: 'Biceps' });

      const exercises = await getAllExercises();
      expect(exercises.map((e) => e.name)).toEqual([
        'Curl biceps',
        'Développé couché',
        'Squat',
      ]);
    });

    it('excludes archived exercises', async () => {
      const id = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await addExercise({ name: 'Fentes', muscleGroup: 'Quadriceps' });

      await deleteExercise(id);

      const active = await getAllExercises();
      expect(active.map((e) => e.name)).toEqual(['Fentes']);
    });

    it('groups active exercises by muscle group', async () => {
      await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

      const grouped = await getExercisesByGroup();
      expect(grouped.Quadriceps).toHaveLength(1);
      expect(grouped.Quadriceps[0].name).toBe('Squat');
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
      const id = await addExercise({ name: 'Curl', muscleGroup: 'Biceps' });
      await updateExercise(id, { name: 'Curl barre EZ', muscleGroup: 'Biceps' });

      const updated = await db.exercises.get(id);
      expect(updated?.name).toBe('Curl barre EZ');
    });

    it('rejects empty or whitespace-only name update', async () => {
      const id = await addExercise({ name: 'Curl', muscleGroup: 'Biceps' });
      await expect(updateExercise(id, { name: '   ' })).rejects.toThrow(
        /ne peut pas être vide/i
      );
    });

    it('rejects renaming to an existing exercise name', async () => {
      const id1 = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await addExercise({ name: 'Presse', muscleGroup: 'Quadriceps' });

      await expect(updateExercise(id1, { name: '  presse  ' })).rejects.toThrow(
        /existe déjà/i
      );
    });

    it('allows updating without changing name to itself', async () => {
      const id = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await expect(
        updateExercise(id, { name: 'Squat', muscleGroup: 'Quadriceps' })
      ).resolves.not.toThrow();
    });
  });

  describe('deleteExercise (soft delete)', () => {
    it('marks exercise as archived instead of removing it from table', async () => {
      const id = await addExercise({ name: 'Dips', muscleGroup: 'Triceps' });
      await deleteExercise(id);

      const record = await db.exercises.get(id);
      expect(record).toBeDefined();
      expect(record?.archived).toBe(true);

      const activeList = await getAllExercises();
      expect(activeList.find((e) => e.id === id)).toBeUndefined();
    });
  });

  describe('normalizeSearchText', () => {
    it('normalizes accents, converts to lowercase and trims whitespace', () => {
      expect(normalizeSearchText('  ÉLÉVATIONS LATÉRALES  ')).toBe('elevations laterales');
      expect(normalizeSearchText('Développé Couché')).toBe('developpe couche');
      expect(normalizeSearchText('Tirage à la poulie')).toBe('tirage a la poulie');
    });
  });

  describe('filterExercises', () => {
    it('filters exercises by query case and accent insensitively', async () => {
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });

      // Recherche sans accent en minuscules
      const res1 = await filterExercises({ query: 'developpe' });
      expect(res1.map((e) => e.name)).toEqual(['Développé couché', 'Développé incliné']);

      // Recherche avec accent et majuscules
      const res2 = await filterExercises({ query: 'ÉCARTÉ' });
      expect(res2.map((e) => e.name)).toEqual(['Écarté poulie']);
    });

    it('filters exercises by muscleGroup', async () => {
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });

      const res = await filterExercises({ muscleGroup: 'Quadriceps' });
      expect(res.map((e) => e.name)).toEqual(['Squat']);
    });

    it('excludes specified excludeIds', async () => {
      const id1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });

      const res = await filterExercises({ excludeIds: [id1] });
      expect(res.map((e) => e.name)).toEqual(['Écarté poulie']);
    });

    it('excludes archived exercises', async () => {
      const id = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });
      await deleteExercise(id);

      const res = await filterExercises();
      expect(res.map((e) => e.name)).toEqual(['Écarté poulie']);
    });

    it('includes archived exercises when includeArchived is true', async () => {
      const id = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });
      await deleteExercise(id);

      const res = await filterExercises({ includeArchived: true });
      expect(res.map((e) => e.name)).toEqual(['Développé couché', 'Écarté poulie']);
    });

    it('combines query, muscleGroup and excludeIds', async () => {
      const id1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Développé militaire', muscleGroup: 'Épaules' });

      const res = await filterExercises({
        query: 'developpe',
        muscleGroup: 'Pectoraux',
        excludeIds: [id1],
      });
      expect(res.map((e) => e.name)).toEqual(['Développé incliné']);
    });
  });

  describe('getExerciseCountsByGroup', () => {
    it('returns counts of available exercises per muscle group', async () => {
      const idBench = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });
      const idSquat = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await deleteExercise(idSquat); // archivé

      // Sans exclusion
      const countsAll = await getExerciseCountsByGroup();
      expect(countsAll.Pectoraux).toBe(2);
      expect(countsAll.Quadriceps).toBe(0); // archivé exclu
      expect(countsAll.Dos).toBe(0);

      // Avec exclusion de l'idBench
      const countsExcluded = await getExerciseCountsByGroup({ excludeIds: [idBench] });
      expect(countsExcluded.Pectoraux).toBe(1);
      expect(countsExcluded.Quadriceps).toBe(0);
    });

    it('includes archived exercises in counts when includeArchived is true', async () => {
      await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      const idSquat = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
      await deleteExercise(idSquat); // archivé

      const counts = await getExerciseCountsByGroup({ includeArchived: true });
      expect(counts.Pectoraux).toBe(1);
      expect(counts.Quadriceps).toBe(1);
    });
  });
});
