import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../schema';
import {
  createProgram,
  getProgram,
  getAllPrograms,
  getProgramsForWeekday,
  updateProgram,
  deleteProgram,
  addExerciseToProgram,
  getProgramExercises,
  getProgramWithExercises,
  updateProgramExercise,
  removeExerciseFromProgram,
  moveProgramExercise,
} from '../programs';

describe('Programs CRUD operations', () => {
  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.close();
    await db.delete();
  });

  describe('Program management', () => {
    it('creates a program and retrieves it by id', async () => {
      const id = await createProgram({
        name: 'Full Body',
        weekdays: [1, 3, 5],
      });

      expect(id).toBeTypeOf('number');

      const program = await getProgram(id);
      expect(program).toBeDefined();
      expect(program?.name).toBe('Full Body');
      expect(program?.weekdays).toEqual([1, 3, 5]);
    });

    it('rejects program creation with empty or whitespace-only name', async () => {
      await expect(
        createProgram({ name: '', weekdays: [1] })
      ).rejects.toThrow();

      await expect(
        createProgram({ name: '   ', weekdays: [1] })
      ).rejects.toThrow();
    });

    it('rejects program creation with invalid weekdays', async () => {
      // Tableau vide
      await expect(
        createProgram({ name: 'Push', weekdays: [] })
      ).rejects.toThrow();

      // Jour < 1
      await expect(
        createProgram({ name: 'Push', weekdays: [0] })
      ).rejects.toThrow();

      // Jour > 7
      await expect(
        createProgram({ name: 'Push', weekdays: [8] })
      ).rejects.toThrow();

      // Flottants ou non entiers
      await expect(
        createProgram({ name: 'Push', weekdays: [2.5] })
      ).rejects.toThrow();
    });

    it('retrieves all programs sorted alphabetically by name', async () => {
      await createProgram({ name: 'Legs', weekdays: [4] });
      await createProgram({ name: 'Bras & Épaules', weekdays: [2] });
      await createProgram({ name: 'Dos & Pecs', weekdays: [1] });

      const all = await getAllPrograms();
      expect(all.map((p) => p.name)).toEqual([
        'Bras & Épaules',
        'Dos & Pecs',
        'Legs',
      ]);
    });

    it('getProgramsForWeekday filters by weekday and sorts results by name', async () => {
      await createProgram({ name: 'Push B', weekdays: [1, 4] });
      await createProgram({ name: 'Pull A', weekdays: [2, 5] });
      await createProgram({ name: 'Legs A', weekdays: [1, 6] });

      // Lundi = 1 -> 'Push B' et 'Legs A', triés alphabétiquement -> 'Legs A', 'Push B'
      const mondayPrograms = await getProgramsForWeekday(1);
      expect(mondayPrograms.map((p) => p.name)).toEqual(['Legs A', 'Push B']);

      // Dimanche = 7 -> aucun
      const sundayPrograms = await getProgramsForWeekday(7);
      expect(sundayPrograms).toEqual([]);
    });

    it('updates program name and weekdays with validation', async () => {
      const id = await createProgram({ name: 'Push', weekdays: [1] });

      await updateProgram(id, { name: 'Push Lourd', weekdays: [1, 4] });
      const updated = await getProgram(id);
      expect(updated?.name).toBe('Push Lourd');
      expect(updated?.weekdays).toEqual([1, 4]);

      // Rejette la mise à jour avec un nom vide
      await expect(updateProgram(id, { name: '  ' })).rejects.toThrow();

      // Rejette la mise à jour avec des jours invalides
      await expect(updateProgram(id, { weekdays: [0] })).rejects.toThrow();

      // Rejette pour un id inexistant
      await expect(updateProgram(9999, { name: 'Test' })).rejects.toThrow();
    });

    it('deleteProgram deletes the program and cascades to its programExercises without deleting sessions', async () => {
      const exId = (await db.exercises.add({
        name: 'Développé couché',
        muscleGroup: 'Pectoraux',
      })) as number;

      const progId = await createProgram({ name: 'Pectoraux', weekdays: [1] });

      await addExerciseToProgram({
        programId: progId,
        exerciseId: exId,
      });

      // Créer une session liée à ce programme pour vérifier qu'elle n'est pas supprimée
      const sessionId = (await db.sessions.add({
        date: '2026-10-15',
        programId: progId,
        startedAt: '2026-10-15T10:00:00.000Z',
        endedAt: '2026-10-15T11:00:00.000Z',
      })) as number;

      // Supprimer le programme
      await deleteProgram(progId);

      // Le programme n'existe plus
      expect(await getProgram(progId)).toBeUndefined();

      // Les exercices de ce programme sont supprimés en cascade
      const exercises = await db.programExercises
        .where('programId')
        .equals(progId)
        .toArray();
      expect(exercises).toHaveLength(0);

      // La session passée existe toujours (avec son programId conservé)
      const session = await db.sessions.get(sessionId);
      expect(session).toBeDefined();
      expect(session?.programId).toBe(progId);
    });
  });

  describe('Program exercises management', () => {
    let progId: number;
    let ex1Id: number;
    let ex2Id: number;
    let ex3Id: number;

    beforeEach(async () => {
      progId = await createProgram({ name: 'Pecs & Dos', weekdays: [1] });
      ex1Id = (await db.exercises.add({
        name: 'Développé couché',
        muscleGroup: 'Pectoraux',
      })) as number;
      ex2Id = (await db.exercises.add({
        name: 'Tractions',
        muscleGroup: 'Dos',
      })) as number;
      ex3Id = (await db.exercises.add({
        name: 'Dips',
        muscleGroup: 'Biceps',
      })) as number;
    });

    it('addExerciseToProgram calculates order = max(order)+1 in a transaction with default sets', async () => {
      const pe1Id = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
      });

      const pe2Id = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex2Id,
      });

      const pe1 = await db.programExercises.get(pe1Id);
      const pe2 = await db.programExercises.get(pe2Id);

      expect(pe1?.order).toBe(0);
      expect(pe1?.warmupSets).toBe(1);
      expect(pe1?.workSets).toBe(3);

      expect(pe2?.order).toBe(1);
      expect(pe2?.warmupSets).toBe(1);
      expect(pe2?.workSets).toBe(3);
    });

    it('addExerciseToProgram rejects if programId or exerciseId does not exist', async () => {
      await expect(
        addExerciseToProgram({ programId: 9999, exerciseId: ex1Id })
      ).rejects.toThrow();

      await expect(
        addExerciseToProgram({ programId: progId, exerciseId: 9999 })
      ).rejects.toThrow();
    });

    it('addExerciseToProgram validates warmupSets (0..4) and workSets (1..6)', async () => {
      // Valide
      const id = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
        warmupSets: 0,
        workSets: 6,
      });
      const pe = await db.programExercises.get(id);
      expect(pe?.warmupSets).toBe(0);
      expect(pe?.workSets).toBe(6);

      // warmupSets négatif
      await expect(
        addExerciseToProgram({
          programId: progId,
          exerciseId: ex2Id,
          warmupSets: -1,
        })
      ).rejects.toThrow();

      // warmupSets > 4
      await expect(
        addExerciseToProgram({
          programId: progId,
          exerciseId: ex2Id,
          warmupSets: 5,
        })
      ).rejects.toThrow();

      // workSets < 1
      await expect(
        addExerciseToProgram({
          programId: progId,
          exerciseId: ex2Id,
          workSets: 0,
        })
      ).rejects.toThrow();

      // workSets > 6
      await expect(
        addExerciseToProgram({
          programId: progId,
          exerciseId: ex2Id,
          workSets: 7,
        })
      ).rejects.toThrow();
    });

    it('getProgramWithExercises returns the program with enriched exercise details sorted by order', async () => {
      await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
        warmupSets: 2,
        workSets: 4,
      });
      await addExerciseToProgram({
        programId: progId,
        exerciseId: ex2Id,
        warmupSets: 0,
        workSets: 5,
      });

      const result = await getProgramWithExercises(progId);
      expect(result).toBeDefined();
      expect(result?.program.name).toBe('Pecs & Dos');
      expect(result?.exercises).toHaveLength(2);
      expect(result?.exercises[0].exercise?.name).toBe('Développé couché');
      expect(result?.exercises[0].warmupSets).toBe(2);
      expect(result?.exercises[1].exercise?.name).toBe('Tractions');
      expect(result?.exercises[1].warmupSets).toBe(0);
    });

    it('updateProgramExercise updates sets and validates bounds', async () => {
      const peId = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
      });

      await updateProgramExercise(peId, { warmupSets: 3, workSets: 5 });
      const pe = await db.programExercises.get(peId);
      expect(pe?.warmupSets).toBe(3);
      expect(pe?.workSets).toBe(5);

      await expect(
        updateProgramExercise(peId, { warmupSets: 5 })
      ).rejects.toThrow();

      await expect(
        updateProgramExercise(peId, { workSets: 0 })
      ).rejects.toThrow();
    });

    it('moveProgramExercise: up on first or down on last is a no-op', async () => {
      const pe1Id = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
      });
      const pe2Id = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex2Id,
      });

      // Up sur le premier -> sans effet
      await moveProgramExercise(pe1Id, 'up');
      let exercises = await getProgramExercises(progId);
      expect(exercises[0].id).toBe(pe1Id);
      expect(exercises[0].order).toBe(0);
      expect(exercises[1].id).toBe(pe2Id);
      expect(exercises[1].order).toBe(1);

      // Down sur le dernier -> sans effet
      await moveProgramExercise(pe2Id, 'down');
      exercises = await getProgramExercises(progId);
      expect(exercises[0].id).toBe(pe1Id);
      expect(exercises[0].order).toBe(0);
      expect(exercises[1].id).toBe(pe2Id);
      expect(exercises[1].order).toBe(1);
    });

    it('guarantees unique and contiguous orders after additions, moves, and deletions', async () => {
      // 1. Ajouter 3 exercices (ex1=0, ex2=1, ex3=2)
      const pe1 = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
      });
      const pe2 = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex2Id,
      });
      const pe3 = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex3Id,
      });

      // 2. Déplacer pe2 vers le bas (intervertit avec pe3 : ex1, ex3, ex2)
      await moveProgramExercise(pe2, 'down');

      let list = await getProgramExercises(progId);
      expect(list.map((e) => e.id)).toEqual([pe1, pe3, pe2]);
      expect(list.map((e) => e.order)).toEqual([0, 1, 2]);

      // 3. Déplacer pe3 vers le haut (intervertit avec pe1 : ex3, ex1, ex2)
      await moveProgramExercise(pe3, 'up');

      list = await getProgramExercises(progId);
      expect(list.map((e) => e.id)).toEqual([pe3, pe1, pe2]);
      expect(list.map((e) => e.order)).toEqual([0, 1, 2]);

      // 4. Supprimer l'élément au milieu (pe1)
      await removeExerciseFromProgram(pe1);

      list = await getProgramExercises(progId);
      expect(list.map((e) => e.id)).toEqual([pe3, pe2]);
      // Les orders doivent rester strictement uniques et contigus : [0, 1]
      expect(list.map((e) => e.order)).toEqual([0, 1]);

      // 5. Rajouter un nouvel exercice (ex1 de nouveau)
      const pe1Bis = await addExerciseToProgram({
        programId: progId,
        exerciseId: ex1Id,
      });

      list = await getProgramExercises(progId);
      expect(list.map((e) => e.id)).toEqual([pe3, pe2, pe1Bis]);
      expect(list.map((e) => e.order)).toEqual([0, 1, 2]);
    });
  });
});
