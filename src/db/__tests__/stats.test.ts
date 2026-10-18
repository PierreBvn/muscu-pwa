import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, MUSCLE_GROUPS, type Exercise, type MuscleGroup, type Session, type SetEntry } from '../schema';
import {
  calculateAverageWeight,
  calculateSessionReps,
  findPersonalRecord,
  formatStatWeight,
  formatPersonalRecord,
  formatStatReps,
  getWeekRangeUtc,
  formatIndexChange,
  buildExerciseProgression,
  calculateWeeklyWorkSetsByGroup,
  calculateGeneralProgression,
  calculateWeeklyMuscleStats,
  calculateMuscleGroupHistory,
  loadExerciseStatsData,
  loadWeeklyStatsData,
  loadGeneralStatsData,
} from '../stats';

describe('src/db/stats.ts - Calculs des statistiques', () => {
  describe('2. Règles métier & exemples chiffrés de la spec', () => {
    it('2.1 exemple chiffré : séries de travail uniquement (warmup ignoré)', () => {
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 10,
          order: 1,
          weight: 40,
          reps: 10,
          type: 'warmup',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 2,
          sessionId: 1,
          exerciseId: 10,
          order: 2,
          weight: 80,
          reps: 10,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
        {
          id: 3,
          sessionId: 1,
          exerciseId: 10,
          order: 3,
          weight: 85,
          reps: 8,
          type: 'work',
          createdAt: '2026-10-10T10:10:00.000Z',
        },
      ];

      // Seules les séries de 80 kg et 85 kg sont prises en compte ; la série à 40 kg est ignorée.
      const avg = calculateAverageWeight(sets);
      expect(avg).toBeCloseTo((80 * 10 + 85 * 8) / (10 + 8));

      const reps = calculateSessionReps(sets);
      expect(reps).toBe(18); // 10 + 8 (pas le 10 de warmup)

      const pr = findPersonalRecord(sets);
      expect(pr).toEqual(sets[2]); // 85 kg x 8
    });

    it('2.2 exemple chiffré : séances terminées uniquement (séance en cours ignorée)', () => {
      // Séance 1 (terminée le 10/10/2026, endedAt: '2026-10-10T11:00:00.000Z') : 100 kg × 5 reps (type: 'work').
      // Séance 2 (en cours le 12/10/2026, endedAt: undefined) : 110 kg × 5 reps (type: 'work').
      const sessions: Session[] = [
        {
          id: 1,
          date: '2026-10-10',
          startedAt: '2026-10-10T10:00:00.000Z',
          endedAt: '2026-10-10T11:00:00.000Z',
        },
        {
          id: 2,
          date: '2026-10-12',
          startedAt: '2026-10-12T10:00:00.000Z',
          endedAt: undefined,
        },
      ];

      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 100,
          reps: 5,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
        {
          id: 2,
          sessionId: 2,
          exerciseId: 1,
          order: 1,
          weight: 110,
          reps: 5,
          type: 'work',
          createdAt: '2026-10-12T10:05:00.000Z',
        },
      ];

      const progression = buildExerciseProgression({
        sessions,
        sets,
        exerciseId: 1,
      });

      // Record personnel calculé : 100 kg × 5 reps. La séance 2 est ignorée tant qu'elle n'est pas terminée.
      expect(progression.personalRecord).not.toBeNull();
      expect(progression.personalRecord?.weight).toBe(100);
      expect(progression.personalRecord?.reps).toBe(5);
      expect(progression.personalRecord?.sessionId).toBe(1);

      // La courbe ne contient que le point de la séance 1 terminée
      expect(progression.points).toHaveLength(1);
      expect(progression.points[0].sessionId).toBe(1);
    });

    it('2.3 exemple a : 20 kg × 8 reps, 18 kg × 10 reps', () => {
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 20,
          reps: 8,
          type: 'work',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 2,
          sessionId: 1,
          exerciseId: 1,
          order: 2,
          weight: 18,
          reps: 10,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
      ];

      const avg = calculateAverageWeight(sets);
      expect(avg).not.toBeNull();
      expect(avg!).toBeCloseTo(340 / 18, 4); // 18.8888...
      expect(formatStatWeight(avg!)).toBe('19\u00A0kg');
    });

    it('2.3 exemple b : 80 kg × 10 reps, 85 kg × 8 reps, 85 kg × 7 reps', () => {
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 80,
          reps: 10,
          type: 'work',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 2,
          sessionId: 1,
          exerciseId: 1,
          order: 2,
          weight: 85,
          reps: 8,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
        {
          id: 3,
          sessionId: 1,
          exerciseId: 1,
          order: 3,
          weight: 85,
          reps: 7,
          type: 'work',
          createdAt: '2026-10-10T10:10:00.000Z',
        },
      ];

      const avg = calculateAverageWeight(sets);
      expect(avg).toBe(83);
      expect(formatStatWeight(avg!)).toBe('83\u00A0kg');
    });

    it('2.3 exemple c : 20 kg × 8 reps, 18 kg × 14 reps', () => {
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 20,
          reps: 8,
          type: 'work',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 2,
          sessionId: 1,
          exerciseId: 1,
          order: 2,
          weight: 18,
          reps: 14,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
      ];

      const avg = calculateAverageWeight(sets);
      expect(avg).not.toBeNull();
      expect(avg!).toBeCloseTo(412 / 22, 4); // 18.7272...
      expect(formatStatWeight(avg!)).toBe('18,5\u00A0kg');
    });

    it('formatage des répétitions (formatStatReps)', () => {
      expect(formatStatReps(25)).toBe('25\u00A0reps');
      expect(formatStatReps(1)).toBe('1\u00A0rep');
      expect(formatStatReps(0)).toBe('0\u00A0rep');
      expect(formatStatReps(1000)).toBe('1\u00A0000\u00A0reps');
    });

    it('2.5 exemple back-off : 3 séries lourdes à 100 kg × 5 et 1 back-off à 70 kg × 12', () => {
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 100,
          reps: 5,
          type: 'work',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 2,
          sessionId: 1,
          exerciseId: 1,
          order: 2,
          weight: 100,
          reps: 5,
          type: 'work',
          createdAt: '2026-10-10T10:05:00.000Z',
        },
        {
          id: 3,
          sessionId: 1,
          exerciseId: 1,
          order: 3,
          weight: 100,
          reps: 5,
          type: 'work',
          createdAt: '2026-10-10T10:10:00.000Z',
        },
        {
          id: 4,
          sessionId: 1,
          exerciseId: 1,
          order: 4,
          weight: 70,
          reps: 12,
          type: 'work',
          createdAt: '2026-10-10T10:15:00.000Z',
        },
      ];

      const avg = calculateAverageWeight(sets);
      expect(avg).not.toBeNull();
      expect(avg!).toBeCloseTo(2340 / 27, 4); // 86.666...
      expect(formatStatWeight(avg!)).toBe('86,5\u00A0kg');
    });

    it('2.6 exemple départage record (égalité) : chronologiquement antérieur retenu', () => {
      const setOld: SetEntry = {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        order: 1,
        weight: 85,
        reps: 8,
        type: 'work',
        createdAt: '2026-10-10T10:05:00.000Z',
      };
      const setNew: SetEntry = {
        id: 2,
        sessionId: 2,
        exerciseId: 1,
        order: 1,
        weight: 85,
        reps: 8,
        type: 'work',
        createdAt: '2026-10-15T10:05:00.000Z',
      };

      const record = findPersonalRecord([setNew, setOld]);
      expect(record).toEqual(setOld);
      expect(formatPersonalRecord(record!)).toBe('Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08');
    });

    it('2.7 exemple complet avec exclusion hors-semaine : semaine du 12/10/2026 au 18/10/2026', () => {
      const sessions: Session[] = [
        {
          id: 1,
          date: '2026-10-13', // Mardi
          startedAt: '2026-10-13T10:00:00.000Z',
          endedAt: '2026-10-13T11:00:00.000Z',
        },
        {
          id: 2,
          date: '2026-10-16', // Vendredi
          startedAt: '2026-10-16T10:00:00.000Z',
          endedAt: '2026-10-16T11:00:00.000Z',
        },
        {
          id: 3,
          date: '2026-10-19', // Lundi suivant (doit être exclu)
          startedAt: '2026-10-19T10:00:00.000Z',
          endedAt: '2026-10-19T11:00:00.000Z',
        },
      ];

      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
        { id: 2, name: 'Barre au front', muscleGroup: 'Triceps', archived: false },
        { id: 3, name: 'Écarté haltères', muscleGroup: 'Pectoraux', archived: false },
        { id: 4, name: 'Développé incliné', muscleGroup: 'Pectoraux', archived: false },
      ];

      const sets: SetEntry[] = [
        // Séance 1 (mardi 13/10) : 3 Pec + 3 Triceps
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:05:00.000Z' },
        { id: 2, sessionId: 1, exerciseId: 1, order: 2, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:10:00.000Z' },
        { id: 3, sessionId: 1, exerciseId: 1, order: 3, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:15:00.000Z' },
        { id: 4, sessionId: 1, exerciseId: 2, order: 4, weight: 30, reps: 12, type: 'work', createdAt: '2026-10-13T10:20:00.000Z' },
        { id: 5, sessionId: 1, exerciseId: 2, order: 5, weight: 30, reps: 12, type: 'work', createdAt: '2026-10-13T10:25:00.000Z' },
        { id: 6, sessionId: 1, exerciseId: 2, order: 6, weight: 30, reps: 12, type: 'work', createdAt: '2026-10-13T10:30:00.000Z' },
        // Séance 2 (vendredi 16/10) : 4 Pec
        { id: 7, sessionId: 2, exerciseId: 3, order: 1, weight: 20, reps: 12, type: 'work', createdAt: '2026-10-16T10:05:00.000Z' },
        { id: 8, sessionId: 2, exerciseId: 3, order: 2, weight: 20, reps: 12, type: 'work', createdAt: '2026-10-16T10:10:00.000Z' },
        { id: 9, sessionId: 2, exerciseId: 3, order: 3, weight: 20, reps: 12, type: 'work', createdAt: '2026-10-16T10:15:00.000Z' },
        { id: 10, sessionId: 2, exerciseId: 3, order: 4, weight: 20, reps: 12, type: 'work', createdAt: '2026-10-16T10:20:00.000Z' },
        // Séance 3 (lundi 19/10) : 3 Pec (exclus)
        { id: 11, sessionId: 3, exerciseId: 4, order: 1, weight: 70, reps: 10, type: 'work', createdAt: '2026-10-19T10:05:00.000Z' },
        { id: 12, sessionId: 3, exerciseId: 4, order: 2, weight: 70, reps: 10, type: 'work', createdAt: '2026-10-19T10:10:00.000Z' },
        { id: 13, sessionId: 3, exerciseId: 4, order: 3, weight: 70, reps: 10, type: 'work', createdAt: '2026-10-19T10:15:00.000Z' },
      ];

      const counts = calculateWeeklyWorkSetsByGroup({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-18', // Dimanche de la semaine du 12 au 18
      });

      expect(counts.Pectoraux).toBe(7); // 3 + 4
      expect(counts.Triceps).toBe(3); // 3
      expect(counts.Dos).toBe(0);
      expect(counts.Épaules).toBe(0);
      expect(counts.Biceps).toBe(0);
      expect(counts['Avant-bras']).toBe(0);
      expect(counts.Abdos).toBe(0);
      expect(counts.Quadriceps).toBe(0);
      expect(counts.Ischios).toBe(0);
      expect(counts.Fessiers).toBe(0);
      expect(counts.Mollets).toBe(0);
    });

    it('calculateWeeklyWorkSetsByGroup ignore une série dont exercice est introuvable et conserve exactement 11 clés', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' },
      ];
      const exercises: Exercise[] = [
        { id: 1, name: 'Squat', muscleGroup: 'Quadriceps', archived: false },
      ];
      const sets: SetEntry[] = [
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 100, reps: 5, type: 'work', createdAt: '2026-10-14T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 999, order: 2, weight: 50, reps: 10, type: 'work', createdAt: '2026-10-14T10:10:00Z' }, // introuvable
      ];

      const counts = calculateWeeklyWorkSetsByGroup({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-14',
      });

      expect(Object.keys(counts)).toHaveLength(11);
      expect(counts.Quadriceps).toBe(1);
    });

    it('calculateWeeklyWorkSetsByGroup ignore une série dont muscleGroup est invalide et conserve exactement 11 clés', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' },
      ];
      const exercises: Exercise[] = [
        { id: 1, name: 'Squat', muscleGroup: 'Quadriceps', archived: false },
        { id: 2, name: 'Inconnu', muscleGroup: 'Inconnu' as unknown as MuscleGroup, archived: false },
      ];
      const sets: SetEntry[] = [
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 100, reps: 5, type: 'work', createdAt: '2026-10-14T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 2, order: 2, weight: 50, reps: 10, type: 'work', createdAt: '2026-10-14T10:10:00Z' },
      ];

      const counts = calculateWeeklyWorkSetsByGroup({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-14',
      });

      expect(Object.keys(counts)).toHaveLength(11);
      expect(counts.Quadriceps).toBe(1);
    });

    it('2.8 exemple obligatoire : indice de progression en poids S1 et S2 (couché, curl, presse)', () => {
      // S1 : couché 80, curl 15, presse 200
      // S2 : couché 84, curl 16, presse absente
      const sessions: Session[] = [
        { id: 1, date: '2026-10-07', startedAt: '2026-10-07T10:00:00Z', endedAt: '2026-10-07T11:00:00Z' }, // S1
        { id: 2, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' }, // S2
      ];

      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
        { id: 2, name: 'Curl biceps', muscleGroup: 'Biceps', archived: false },
        { id: 3, name: 'Presse à cuisses', muscleGroup: 'Quadriceps', archived: false },
      ];

      const sets: SetEntry[] = [
        // S1
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-07T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 2, order: 2, weight: 15, reps: 10, type: 'work', createdAt: '2026-10-07T10:10:00Z' },
        { id: 3, sessionId: 1, exerciseId: 3, order: 3, weight: 200, reps: 10, type: 'work', createdAt: '2026-10-07T10:15:00Z' },
        // S2
        { id: 4, sessionId: 2, exerciseId: 1, order: 1, weight: 84, reps: 10, type: 'work', createdAt: '2026-10-14T10:05:00Z' },
        { id: 5, sessionId: 2, exerciseId: 2, order: 2, weight: 16, reps: 10, type: 'work', createdAt: '2026-10-14T10:10:00Z' },
      ];

      const prog = calculateGeneralProgression({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-15',
      });

      // S1 (index 6) : couché (100), curl (100), presse (100) -> indice = 100
      expect(prog.weeks[6].index).toBe(100);
      expect(formatIndexChange(prog.weeks[6].index)).toBe('0,0\u00A0%');

      // S2 (index 7) : couché (84/80*100 = 105), curl (16/15*100 = 106.666...), presse absente
      // Indice S2 = (105 + 106.666...) / 2 = 105.833...
      expect(prog.weeks[7].index).not.toBeNull();
      expect(prog.weeks[7].index!).toBeCloseTo(105.8333, 3);
      expect(prog.currentChange).toBe('+5,8\u00A0%');

      // Comparaison avec la moyenne brute montrant pourquoi elle est rejetée dans la spec
      const rawAvgS1 = (80 + 15 + 200) / 3;
      const rawAvgS2 = (84 + 16) / 2;
      expect(rawAvgS1).toBeCloseTo(98.3333, 2);
      expect(rawAvgS2).toBe(50.0);
    });

    it('2.8 exemple séances : décompte des séances terminées par semaine', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-06', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T11:00:00Z' }, // S1 terminée
        { id: 2, date: '2026-10-08', startedAt: '2026-10-08T10:00:00Z', endedAt: '2026-10-08T11:00:00Z' }, // S1 terminée
        { id: 3, date: '2026-10-09', startedAt: '2026-10-09T10:00:00Z', endedAt: undefined }, // S1 NON terminée
        { id: 4, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' }, // S2 terminée
      ];

      const prog = calculateGeneralProgression({
        sessions,
        sets: [],
        exercises: [],
        referenceDate: '2026-10-15',
      });

      expect(prog.weeks).toHaveLength(8);
      // S1 (index 6) : 2 terminées (la 3e sans endedAt est ignorée)
      expect(prog.weeks[6].sessionCount).toBe(2);
      // S2 (index 7) : 1 terminée
      expect(prog.weeks[7].sessionCount).toBe(1);
      // Les semaines antérieures : 0
      for (let i = 0; i < 6; i++) {
        expect(prog.weeks[i].sessionCount).toBe(0);
      }
    });

    it('2.8 exemple exclusion : exercice uniquement à 0 kg exclu de l\'indice', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-07', startedAt: '2026-10-07T10:00:00Z', endedAt: '2026-10-07T11:00:00Z' },
        { id: 2, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' },
      ];

      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
        { id: 2, name: 'Tractions', muscleGroup: 'Dos', archived: false },
      ];

      const sets: SetEntry[] = [
        // S1 : couché 80 kg + tractions 0 kg
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-07T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 2, order: 2, weight: 0, reps: 10, type: 'work', createdAt: '2026-10-07T10:10:00Z' },
        // S2 : couché 88 kg + tractions 0 kg
        { id: 3, sessionId: 2, exerciseId: 1, order: 1, weight: 88, reps: 10, type: 'work', createdAt: '2026-10-14T10:05:00Z' },
        { id: 4, sessionId: 2, exerciseId: 2, order: 2, weight: 0, reps: 12, type: 'work', createdAt: '2026-10-14T10:10:00Z' },
      ];

      const prog = calculateGeneralProgression({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-15',
      });

      // L'exercice de tractions est exclu car toutes ses séries sur la période sont à 0 kg.
      // L'indice général repose uniquement sur le développé couché (88/80 = 110).
      expect(prog.weeks[6].index).toBe(100);
      expect(prog.weeks[7].index).toBeCloseTo(110);
      expect(prog.currentChange).toBe('+10,0\u00A0%');
    });

    it('2.8 exemple semaine sans exercice : indice null', () => {
      const sessions: Session[] = [];
      const prog = calculateGeneralProgression({
        sessions,
        sets: [],
        exercises: [],
        referenceDate: '2026-10-15',
      });

      for (let i = 0; i < 8; i++) {
        expect(prog.weeks[i].index).toBeNull();
      }
      expect(prog.currentChange).toBe('—');
    });

    it('2.9 exemple chiffré : séries work pour les 11 groupes sur la semaine de référence', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-14', startedAt: '2026-10-14T10:00:00Z', endedAt: '2026-10-14T11:00:00Z' },
        { id: 2, date: '2026-10-21', startedAt: '2026-10-21T10:00:00Z', endedAt: '2026-10-21T11:00:00Z' }, // hors semaine
      ];

      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
        { id: 2, name: 'Barre au front', muscleGroup: 'Triceps', archived: false },
      ];

      const sets: SetEntry[] = [
        // Pectoraux : 3 séries
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-14T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 1, order: 2, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-14T10:10:00Z' },
        { id: 3, sessionId: 1, exerciseId: 1, order: 3, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-14T10:15:00Z' },
        // Triceps : 3 séries
        { id: 4, sessionId: 1, exerciseId: 2, order: 4, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-14T10:20:00Z' },
        { id: 5, sessionId: 1, exerciseId: 2, order: 5, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-14T10:25:00Z' },
        { id: 6, sessionId: 1, exerciseId: 2, order: 6, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-14T10:30:00Z' },
        // Hors semaine
        { id: 7, sessionId: 2, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-21T10:05:00Z' },
      ];

      const stats = calculateWeeklyMuscleStats({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-15',
      });

      expect(Object.keys(stats)).toHaveLength(11);
      expect(stats.Pectoraux).toEqual({ workSets: 3 });
      expect(stats.Triceps).toEqual({ workSets: 3 });
      expect(stats.Dos).toEqual({ workSets: 0 });
      expect(stats.Épaules).toEqual({ workSets: 0 });
      expect(stats.Biceps).toEqual({ workSets: 0 });
      expect(stats['Avant-bras']).toEqual({ workSets: 0 });
      expect(stats.Abdos).toEqual({ workSets: 0 });
      expect(stats.Quadriceps).toEqual({ workSets: 0 });
      expect(stats.Ischios).toEqual({ workSets: 0 });
      expect(stats.Fessiers).toEqual({ workSets: 0 });
      expect(stats.Mollets).toEqual({ workSets: 0 });
    });

    it('2.10 exemple chiffré : historique 8 semaines séries pour un groupe musculaire', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-13', startedAt: '2026-10-13T10:00:00Z', endedAt: '2026-10-13T11:00:00Z' },
        { id: 2, date: '2026-10-16', startedAt: '2026-10-16T10:00:00Z', endedAt: '2026-10-16T11:00:00Z' },
      ];

      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
        { id: 2, name: 'Écarté haltères', muscleGroup: 'Pectoraux', archived: false },
      ];

      const sets: SetEntry[] = [
        // Séance 1 : 3 séries couché
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:05:00Z' },
        { id: 2, sessionId: 1, exerciseId: 1, order: 2, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:10:00Z' },
        { id: 3, sessionId: 1, exerciseId: 1, order: 3, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-13T10:15:00Z' },
        // Séance 2 : 4 séries écarté
        // Total Pectoraux semaine 8 = 7 séries
        { id: 4, sessionId: 2, exerciseId: 2, order: 1, weight: 50, reps: 10, type: 'work', createdAt: '2026-10-16T10:05:00Z' },
        { id: 5, sessionId: 2, exerciseId: 2, order: 2, weight: 50, reps: 10, type: 'work', createdAt: '2026-10-16T10:10:00Z' },
        { id: 6, sessionId: 2, exerciseId: 2, order: 3, weight: 50, reps: 10, type: 'work', createdAt: '2026-10-16T10:15:00Z' },
        { id: 7, sessionId: 2, exerciseId: 2, order: 4, weight: 57.5, reps: 10, type: 'work', createdAt: '2026-10-16T10:20:00Z' },
      ];

      const history = calculateMuscleGroupHistory({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-18',
        muscleGroup: 'Pectoraux',
      });

      expect(history).toHaveLength(8);
      for (let i = 0; i < 7; i++) {
        expect(history[i].workSets).toBe(0);
      }
      expect(history[7].workSets).toBe(7);
    });

    it('2.11 exemple formatage : formatIndexChange avec +5,8 %, −2,0 % et 0,0 %', () => {
      expect(formatIndexChange(105.8333)).toBe('+5,8\u00A0%');
      expect(formatIndexChange(98.0)).toBe('−2,0\u00A0%');
      expect(formatIndexChange(100.0)).toBe('0,0\u00A0%');
      expect(formatIndexChange(null)).toBe('—');
    });
  });

  describe('3. Cas limites de la spec (un test chacun)', () => {
    it('3 – 0 rep → null', () => {
      const setsWithZeroReps: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 50,
          reps: 0,
          type: 'work',
          createdAt: '2026-10-10T10:00:00.000Z',
        },
      ];
      expect(calculateAverageWeight(setsWithZeroReps)).toBeNull();
      expect(calculateAverageWeight([])).toBeNull();
      expect(calculateSessionReps(setsWithZeroReps)).toBe(0);
    });

    it('3 – séance sans endedAt exclue', () => {
      const sessions: Session[] = [
        {
          id: 1,
          date: '2026-10-14',
          startedAt: '2026-10-14T10:00:00.000Z',
          endedAt: undefined, // Non terminée
        },
      ];
      const sets: SetEntry[] = [
        {
          id: 1,
          sessionId: 1,
          exerciseId: 1,
          order: 1,
          weight: 80,
          reps: 10,
          type: 'work',
          createdAt: '2026-10-14T10:05:00.000Z',
        },
      ];
      const exercises: Exercise[] = [
        { id: 1, name: 'Développé couché', muscleGroup: 'Pectoraux', archived: false },
      ];

      const progression = buildExerciseProgression({ sessions, sets, exerciseId: 1 });
      expect(progression.points).toHaveLength(0);
      expect(progression.personalRecord).toBeNull();

      const weekly = calculateWeeklyWorkSetsByGroup({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-14',
      });
      expect(weekly.Pectoraux).toBe(0);
    });

    it('3 – mode reps et passage au mode weight', () => {
      // Séances 1 et 2 à 0 kg uniquement
      const sessions: Session[] = [
        {
          id: 1,
          date: '2026-10-01',
          startedAt: '2026-10-01T10:00:00.000Z',
          endedAt: '2026-10-01T11:00:00.000Z',
        },
        {
          id: 2,
          date: '2026-10-05',
          startedAt: '2026-10-05T10:00:00.000Z',
          endedAt: '2026-10-05T11:00:00.000Z',
        },
      ];

      const setsOnly0kg: SetEntry[] = [
        { id: 1, sessionId: 1, exerciseId: 5, order: 1, weight: 0, reps: 10, type: 'work', createdAt: '2026-10-01T10:05:00.000Z' },
        { id: 2, sessionId: 1, exerciseId: 5, order: 2, weight: 0, reps: 8, type: 'work', createdAt: '2026-10-01T10:10:00.000Z' },
        { id: 3, sessionId: 2, exerciseId: 5, order: 1, weight: 0, reps: 10, type: 'work', createdAt: '2026-10-05T10:05:00.000Z' },
        { id: 4, sessionId: 2, exerciseId: 5, order: 2, weight: 0, reps: 10, type: 'work', createdAt: '2026-10-05T10:10:00.000Z' },
      ];

      // Cas 1 : purement 0 kg -> mode 'reps'
      const progReps = buildExerciseProgression({ sessions, sets: setsOnly0kg, exerciseId: 5 });
      expect(progReps.mode).toBe('reps');
      expect(progReps.points).toHaveLength(2);
      expect(progReps.points[0].totalReps).toBe(18); // 10 + 8
      expect(progReps.points[1].totalReps).toBe(20); // 10 + 10
      expect(formatPersonalRecord(progReps.personalRecord!)).toBe('Record\u00A0:\u00A00\u00A0kg\u00A0\u00D7\u00A010');

      // Cas 2 : ajout de la séance 3 lestée à 10 kg -> bascule en mode 'weight'
      const session3: Session = {
        id: 3,
        date: '2026-10-08',
        startedAt: '2026-10-08T10:00:00.000Z',
        endedAt: '2026-10-08T11:00:00.000Z',
      };
      const setsWithWeighted: SetEntry[] = [
        ...setsOnly0kg,
        { id: 5, sessionId: 3, exerciseId: 5, order: 1, weight: 10, reps: 6, type: 'work', createdAt: '2026-10-08T10:05:00.000Z' },
        { id: 6, sessionId: 3, exerciseId: 5, order: 2, weight: 10, reps: 6, type: 'work', createdAt: '2026-10-08T10:10:00.000Z' },
      ];

      const progWeight = buildExerciseProgression({
        sessions: [...sessions, session3],
        sets: setsWithWeighted,
        exerciseId: 5,
      });

      expect(progWeight.mode).toBe('weight');
      // Les séances 1 et 2 entièrement à 0 kg n'ont aucun point tracé sur la courbe en mode 'weight'
      expect(progWeight.points).toHaveLength(1);
      expect(progWeight.points[0].sessionId).toBe(3);
      expect(progWeight.points[0].averageWeight).toBe(10);
      expect(progWeight.points[0].isRecord).toBe(true);
    });

    it('3 – record à égalité', () => {
      // 1. Poids plus élevé l'emporte sur reps
      const s1: SetEntry = { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 90, reps: 5, type: 'work', createdAt: '2026-10-10T10:00:00Z' };
      const s2: SetEntry = { id: 2, sessionId: 1, exerciseId: 1, order: 2, weight: 80, reps: 12, type: 'work', createdAt: '2026-10-10T10:05:00Z' };
      expect(findPersonalRecord([s1, s2])).toEqual(s1);

      // 2. Égalité poids : plus de reps l'emporte
      const s3: SetEntry = { id: 3, sessionId: 1, exerciseId: 1, order: 3, weight: 90, reps: 7, type: 'work', createdAt: '2026-10-11T10:00:00Z' };
      expect(findPersonalRecord([s1, s3])).toEqual(s3);

      // 3. Égalité poids et reps : chronologiquement plus ancien l'emporte (<)
      const s4: SetEntry = { id: 4, sessionId: 2, exerciseId: 1, order: 1, weight: 90, reps: 7, type: 'work', createdAt: '2026-10-12T10:00:00Z' };
      expect(findPersonalRecord([s4, s3])).toEqual(s3); // s3 (11/10) < s4 (12/10)
    });

    it('3 – 11 groupes à 0', () => {
      const counts = calculateWeeklyWorkSetsByGroup({
        sessions: [],
        sets: [],
        exercises: [],
        referenceDate: '2026-10-14',
      });

      expect(Object.keys(counts)).toHaveLength(11);
      for (const group of MUSCLE_GROUPS) {
        expect(counts[group]).toBe(0);
      }
    });

    it('3 – séance du lundi 19/10/2026 exclue', () => {
      const sessions: Session[] = [
        { id: 1, date: '2026-10-18', startedAt: '2026-10-18T10:00:00Z', endedAt: '2026-10-18T11:00:00Z' },
        { id: 2, date: '2026-10-19', startedAt: '2026-10-19T10:00:00Z', endedAt: '2026-10-19T11:00:00Z' },
      ];
      const exercises: Exercise[] = [
        { id: 1, name: 'Squat', muscleGroup: 'Quadriceps', archived: false },
      ];
      const sets: SetEntry[] = [
        { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 100, reps: 5, type: 'work', createdAt: '2026-10-18T10:05:00Z' },
        { id: 2, sessionId: 2, exerciseId: 1, order: 1, weight: 100, reps: 5, type: 'work', createdAt: '2026-10-19T10:05:00Z' },
      ];

      const counts = calculateWeeklyWorkSetsByGroup({
        sessions,
        sets,
        exercises,
        referenceDate: '2026-10-15', // Semaine du 12 au 18
      });

      // La séance du 19/10/2026 est exclue
      expect(counts.Quadriceps).toBe(1);
    });
  });

  describe('Invariance au fuseau horaire de getWeekRangeUtc et calculateWeeklyWorkSetsByGroup', () => {
    const timezones = ['America/Los_Angeles', 'Pacific/Auckland'];

    timezones.forEach((tz) => {
      it(`calcule correctement la semaine du 12/10/2026 au 18/10/2026 sous TZ=${tz}`, () => {
        const originalTz = process.env.TZ;
        try {
          process.env.TZ = tz;

          // Vérification que le fuseau est réellement appliqué dans le runtime
          const offset = new Date(Date.UTC(2026, 9, 12)).getTimezoneOffset();
          const expectedOffset = tz === 'America/Los_Angeles' ? 420 : -780;
          expect(offset).toBe(expectedOffset);

          // Test de getWeekRangeUtc
          const rangeFromSunday = getWeekRangeUtc('2026-10-18');
          expect(rangeFromSunday.startOfWeek).toBe('2026-10-12');
          expect(rangeFromSunday.endOfWeek).toBe('2026-10-18');

          const rangeFromMonday = getWeekRangeUtc('2026-10-12');
          expect(rangeFromMonday.startOfWeek).toBe('2026-10-12');
          expect(rangeFromMonday.endOfWeek).toBe('2026-10-18');

          // Test de calculateWeeklyWorkSetsByGroup sous ce fuseau
          const sessions: Session[] = [
            { id: 1, date: '2026-10-12', startedAt: '2026-10-12T00:00:00Z', endedAt: '2026-10-12T01:00:00Z' },
            { id: 2, date: '2026-10-18', startedAt: '2026-10-18T23:00:00Z', endedAt: '2026-10-18T23:59:00Z' },
            { id: 3, date: '2026-10-19', startedAt: '2026-10-19T00:00:00Z', endedAt: '2026-10-19T01:00:00Z' },
          ];
          const exercises: Exercise[] = [
            { id: 1, name: 'Biceps curl', muscleGroup: 'Biceps', archived: false },
          ];
          const sets: SetEntry[] = [
            { id: 1, sessionId: 1, exerciseId: 1, order: 1, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-12T00:05:00Z' },
            { id: 2, sessionId: 2, exerciseId: 1, order: 1, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-18T23:05:00Z' },
            { id: 3, sessionId: 3, exerciseId: 1, order: 1, weight: 30, reps: 10, type: 'work', createdAt: '2026-10-19T00:05:00Z' },
          ];

          const counts = calculateWeeklyWorkSetsByGroup({
            sessions,
            sets,
            exercises,
            referenceDate: '2026-10-15',
          });

          expect(counts.Biceps).toBe(2); // Séances du 12 et du 18 incluses, celle du 19 exclue
        } finally {
          process.env.TZ = originalTz;
        }
      });
    });
  });

  describe('Fonctions minces de chargement Dexie (loadExerciseStatsData, loadWeeklyStatsData)', () => {
    beforeEach(async () => {
      await db.delete();
      await db.open();
    });

    afterEach(async () => {
      await db.delete();
    });

    it('loadExerciseStatsData renvoie aussi les séances non terminées et les séries warmup (sans filtre)', async () => {
      // 1 séance terminée, 1 séance non terminée (endedAt: undefined)
      const s1Id = (await db.sessions.add({
        date: '2026-10-10',
        startedAt: '2026-10-10T10:00:00Z',
        endedAt: '2026-10-10T11:00:00Z',
      })) as number;

      const s2Id = (await db.sessions.add({
        date: '2026-10-12',
        startedAt: '2026-10-12T10:00:00Z',
        endedAt: undefined, // Non terminée
      })) as number;

      // Séries associées à l'exercice 42 (warmup et work)
      await db.sets.bulkAdd([
        { sessionId: s1Id, exerciseId: 42, order: 1, weight: 40, reps: 10, type: 'warmup', createdAt: '2026-10-10T10:05:00Z' },
        { sessionId: s1Id, exerciseId: 42, order: 2, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-10T10:10:00Z' },
        { sessionId: s2Id, exerciseId: 42, order: 1, weight: 90, reps: 5, type: 'work', createdAt: '2026-10-12T10:05:00Z' },
      ]);

      const data = await loadExerciseStatsData(42);

      // Preuve qu'aucun filtre n'a été appliqué sur endedAt
      expect(data.sessions).toHaveLength(2);
      expect(data.sessions.some((s) => s.endedAt === undefined)).toBe(true);

      // Preuve qu'aucun filtre n'a été appliqué sur le type de série
      expect(data.sets).toHaveLength(3);
      expect(data.sets.some((s) => s.type === 'warmup')).toBe(true);
    });

    it('loadWeeklyStatsData renvoie aussi les séances non terminées, séries warmup et exercices archivés (sans filtre)', async () => {
      // Semaine du 12/10/2026 au 18/10/2026
      const s1Id = (await db.sessions.add({
        date: '2026-10-13',
        startedAt: '2026-10-13T10:00:00Z',
        endedAt: '2026-10-13T11:00:00Z',
      })) as number;

      const s2Id = (await db.sessions.add({
        date: '2026-10-15',
        startedAt: '2026-10-15T10:00:00Z',
        endedAt: undefined, // Non terminée mais dans la semaine
      })) as number;

      // Séance hors semaine (doit être exclue par la plage de dates)
      const s3Id = (await db.sessions.add({
        date: '2026-10-20',
        startedAt: '2026-10-20T10:00:00Z',
        endedAt: '2026-10-20T11:00:00Z',
      })) as number;

      await db.exercises.bulkAdd([
        { name: 'Ex 1', muscleGroup: 'Dos', archived: false },
        { name: 'Ex 2 archivé', muscleGroup: 'Dos', archived: true },
      ]);

      await db.sets.bulkAdd([
        { sessionId: s1Id, exerciseId: 1, order: 1, weight: 50, reps: 10, type: 'warmup', createdAt: '2026-10-13T10:05:00Z' },
        { sessionId: s1Id, exerciseId: 1, order: 2, weight: 70, reps: 8, type: 'work', createdAt: '2026-10-13T10:10:00Z' },
        { sessionId: s2Id, exerciseId: 1, order: 1, weight: 75, reps: 6, type: 'work', createdAt: '2026-10-15T10:05:00Z' },
        { sessionId: s3Id, exerciseId: 1, order: 1, weight: 80, reps: 5, type: 'work', createdAt: '2026-10-20T10:05:00Z' },
      ]);

      const data = await loadWeeklyStatsData('2026-10-14');

      // Preuve que les séances de la semaine sont chargées (y compris celle avec endedAt undefined)
      expect(data.sessions).toHaveLength(2);
      expect(data.sessions.some((s) => s.endedAt === undefined)).toBe(true);
      expect(data.sessions.every((s) => s.id !== s3Id)).toBe(true);

      // Preuve que les séries de ces séances sont chargées sans filtrer warmup
      expect(data.sets).toHaveLength(3);
      expect(data.sets.some((s) => s.type === 'warmup')).toBe(true);

      // Preuve que tous les exercices sont chargés (y compris archivés)
      expect(data.exercises).toHaveLength(2);
      expect(data.exercises.some((e) => e.archived === true)).toBe(true);
    });

    it('loadGeneralStatsData renvoie séances non terminées, séries warmup et exercices archivés sur 8 semaines (sans filtre)', async () => {
      // Semaine courante (14/10/2026) et il y a 3 semaines (23/09/2026)
      const s1Id = (await db.sessions.add({
        date: '2026-10-14',
        startedAt: '2026-10-14T10:00:00Z',
        endedAt: '2026-10-14T11:00:00Z',
      })) as number;

      const s2Id = (await db.sessions.add({
        date: '2026-09-23',
        startedAt: '2026-09-23T10:00:00Z',
        endedAt: undefined, // Non terminée mais dans les 8 semaines
      })) as number;

      // Séance hors des 8 semaines (il y a 16 semaines)
      const s3Id = (await db.sessions.add({
        date: '2026-06-01',
        startedAt: '2026-06-01T10:00:00Z',
        endedAt: '2026-06-01T11:00:00Z',
      })) as number;

      await db.exercises.bulkAdd([
        { name: 'Ex actif', muscleGroup: 'Pectoraux', archived: false },
        { name: 'Ex archivé', muscleGroup: 'Dos', archived: true },
      ]);

      await db.sets.bulkAdd([
        { sessionId: s1Id, exerciseId: 1, order: 1, weight: 80, reps: 10, type: 'warmup', createdAt: '2026-10-14T10:05:00Z' },
        { sessionId: s1Id, exerciseId: 1, order: 2, weight: 80, reps: 10, type: 'work', createdAt: '2026-10-14T10:10:00Z' },
        { sessionId: s2Id, exerciseId: 1, order: 1, weight: 70, reps: 8, type: 'work', createdAt: '2026-09-23T10:05:00Z' },
        { sessionId: s3Id, exerciseId: 1, order: 1, weight: 60, reps: 8, type: 'work', createdAt: '2026-06-01T10:05:00Z' },
      ]);

      const data = await loadGeneralStatsData('2026-10-15');

      // Preuve que les séances dans les 8 semaines sont chargées (y compris non terminée)
      expect(data.sessions).toHaveLength(2);
      expect(data.sessions.some((s) => s.endedAt === undefined)).toBe(true);
      expect(data.sessions.every((s) => s.id !== s3Id)).toBe(true);

      // Preuve que les séries sont chargées sans filtrer warmup
      expect(data.sets).toHaveLength(3);
      expect(data.sets.some((s) => s.type === 'warmup')).toBe(true);

      // Preuve que tous les exercices sont chargés (y compris archivés)
      expect(data.exercises).toHaveLength(2);
      expect(data.exercises.some((e) => e.archived === true)).toBe(true);
    });
  });
});
