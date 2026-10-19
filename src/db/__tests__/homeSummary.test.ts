import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../schema';
import {
  formatHeaderDate,
  calculateDaysBetweenDates,
  findNextProgram,
  calculateHomeSummary,
  getHomeSummary,
  loadHomeSummaryData,
  type HomeSummaryData,
} from '../homeSummary';
import { createProgram, addExerciseToProgram } from '../programs';
import { addExercise } from '../exercises';
import { startSession, addSet, finishSession } from '../sessions';

describe('homeSummary', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await db.sessions.clear();
    await db.sessionExercises.clear();
    await db.sets.clear();
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatHeaderDate', () => {
    it('formate manuellement la date sans Intl', () => {
      // 19 octobre 2026 est un lundi
      const date = new Date(2026, 9, 19, 10, 0, 0);
      expect(formatHeaderDate(date)).toBe('lundi 19 octobre');
    });

    it('formate correctement pour d’autres jours et mois', () => {
      // 1 janvier 2026 est un jeudi
      const date1 = new Date(2026, 0, 1, 12, 0, 0);
      expect(formatHeaderDate(date1)).toBe('jeudi 1 janvier');

      // 25 octobre 2026 est un dimanche
      const date2 = new Date(2026, 9, 25, 8, 0, 0);
      expect(formatHeaderDate(date2)).toBe('dimanche 25 octobre');
    });
  });

  describe('calculateDaysBetweenDates', () => {
    it('calcule la différence en jours calendaires entre deux dates ISO', () => {
      expect(calculateDaysBetweenDates('2026-10-15', '2026-10-19')).toBe(4);
      expect(calculateDaysBetweenDates('2026-10-19', '2026-10-19')).toBe(0);
      expect(calculateDaysBetweenDates('2026-10-01', '2026-10-19')).toBe(18);
    });
  });

  describe('findNextProgram', () => {
    it('renvoie null si aucun programme n’existe', () => {
      expect(findNextProgram([], new Date(2026, 9, 19))).toBeNull();
    });

    it('sélectionne le programme du jour (le premier alphabétiquement)', () => {
      const p1 = { id: 1, name: 'Zumba', weekdays: [1] };
      const p2 = { id: 2, name: 'Abdos', weekdays: [1] };
      // 2026-10-19 est un lundi (jour 1)
      const next = findNextProgram([p1, p2], new Date(2026, 9, 19));
      expect(next?.name).toBe('Abdos');
    });

    it('sélectionne le programme du jour suivant le plus proche si aucun aujourd’hui', () => {
      // 2026-10-19 est lundi (1)
      const pWed = { id: 1, name: 'Haut du corps', weekdays: [3] }; // mercredi
      const pFri = { id: 2, name: 'Jambes', weekdays: [5] }; // vendredi
      const next = findNextProgram([pWed, pFri], new Date(2026, 9, 19));
      expect(next?.name).toBe('Haut du corps');
    });
  });

  // --- 4 CAS REQUIS PAR LA DEMANDE ---

  it('1. base vide : retourne nextProgram null et 0 séance cette semaine', async () => {
    // 2026-10-19 (lundi)
    const now = new Date(2026, 9, 19, 14, 0, 0);
    vi.setSystemTime(now);

    const summary = await getHomeSummary(now);

    expect(summary.headerDate).toBe('lundi 19 octobre');
    expect(summary.weeklySessionsCount).toBe(0);
    expect(summary.weeklySessionsText).toBe('Cette semaine : 0 séance');
    expect(summary.nextProgram).toBeNull();
  });

  it('2. séance jamais faite : retourne daysAgo null et le texte Jamais faite', async () => {
    const now = new Date(2026, 9, 19, 10, 0, 0);
    vi.setSystemTime(now);

    const exPec = await addExercise({
      name: 'Développé couché',
      muscleGroup: 'Pectoraux',
    });
    const exTri = await addExercise({
      name: 'Extensions triceps',
      muscleGroup: 'Triceps',
    });

    const progId = await createProgram({
      name: 'Pectoraux & Triceps',
      weekdays: [1],
    });
    await addExerciseToProgram({ programId: progId, exerciseId: exPec });
    await addExerciseToProgram({ programId: progId, exerciseId: exTri });

    const summary = await getHomeSummary(now);

    expect(summary.nextProgram).not.toBeNull();
    expect(summary.nextProgram!.program.name).toBe('Pectoraux & Triceps');
    expect(summary.nextProgram!.exerciseCount).toBe(2);
    expect(summary.nextProgram!.exerciseCountText).toBe('2 exercices');
    expect(summary.nextProgram!.muscleGroups).toEqual(['Pectoraux', 'Triceps']);
    expect(summary.nextProgram!.muscleGroupsText).toBe('Pectoraux, Triceps');
    expect(summary.nextProgram!.daysAgo).toBeNull();
    expect(summary.nextProgram!.lastDoneText).toBe('Jamais faite');
  });

  it('3. il y a 4 jours : calcule correctement les 4 jours depuis la dernière séance terminée', async () => {
    // Séance terminée le jeudi 15 octobre 2026
    const pastDate = new Date(2026, 9, 15, 18, 0, 0);
    vi.setSystemTime(pastDate);

    const exId = await addExercise({
      name: 'Squat',
      muscleGroup: 'Quadriceps',
    });
    const progId = await createProgram({
      name: 'Legs',
      weekdays: [1],
    });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    // Démarrer, enregistrer une série et terminer une séance le 15/10/2026
    const sessionId = await startSession({
      programId: progId,
      now: pastDate,
    });
    await addSet({
      sessionId,
      exerciseId: exId,
      weight: 100,
      reps: 8,
      type: 'work',
      now: pastDate,
    });
    await finishSession(sessionId);

    // Aujourd'hui = lundi 19 octobre 2026 (exactement 4 jours après)
    const today = new Date(2026, 9, 19, 10, 0, 0);
    vi.setSystemTime(today);

    const summary = await getHomeSummary(today);

    expect(summary.nextProgram).not.toBeNull();
    expect(summary.nextProgram!.program.name).toBe('Legs');
    expect(summary.nextProgram!.daysAgo).toBe(4);
    expect(summary.nextProgram!.lastDoneText).toBe('Dernière fois : il y a 4 j');
  });

  it('4. comptage de la semaine : compte uniquement les séances terminées de la semaine UTC courante', async () => {
    const exId = await addExercise({
      name: 'Tractions',
      muscleGroup: 'Dos',
    });
    const progId = await createProgram({
      name: 'Full Body',
      weekdays: [1, 3, 5],
    });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    // Séance 1 : terminée lundi 19/10 (cette semaine -> COMPTE)
    const d1 = new Date(2026, 9, 19, 9, 0, 0);
    vi.setSystemTime(d1);
    const s1 = await startSession({
      programId: progId,
      now: d1,
    });
    await addSet({ sessionId: s1, exerciseId: exId, weight: 0, reps: 10, type: 'work', now: d1 });
    await finishSession(s1);

    // Séance 2 : terminée mardi 20/10 (cette semaine -> COMPTE)
    const d2 = new Date(2026, 9, 20, 18, 0, 0);
    vi.setSystemTime(d2);
    const s2 = await startSession({
      programId: progId,
      now: d2,
    });
    await addSet({ sessionId: s2, exerciseId: exId, weight: 0, reps: 10, type: 'work', now: d2 });
    await finishSession(s2);

    // Séance 3 : terminée dimanche précédent 18/10 (semaine passée -> NE COMPTE PAS)
    const dPrev = new Date(2026, 9, 18, 10, 0, 0);
    vi.setSystemTime(dPrev);
    const sPrev = await startSession({
      programId: progId,
      now: dPrev,
    });
    await addSet({ sessionId: sPrev, exerciseId: exId, weight: 0, reps: 10, type: 'work', now: dPrev });
    await finishSession(sPrev);

    // Séance 4 : démarrée mercredi 21/10 mais NON terminée (en cours -> NE COMPTE PAS)
    const d4 = new Date(2026, 9, 21, 10, 0, 0);
    vi.setSystemTime(d4);
    await startSession({
      programId: progId,
      now: d4,
    });

    // Date courante : mercredi 21 octobre 2026
    const now = new Date(2026, 9, 21, 11, 0, 0);
    vi.setSystemTime(now);

    const summary = await getHomeSummary(now);

    expect(summary.weeklySessionsCount).toBe(2);
    expect(summary.weeklySessionsText).toBe('Cette semaine : 2 séances');
  });

  describe('Multi-fuseaux horaires', () => {
    it('calcule correctement les données pures indépendamment du décalage horaire', () => {
      // Test de la fonction pure calculateHomeSummary avec des données mockées
      const mockData: HomeSummaryData = {
        allPrograms: [{ id: 10, name: 'Push', weekdays: [1] }],
        allProgramExercises: [
          { id: 1, programId: 10, exerciseId: 101, order: 1, warmupSets: 1, workSets: 3 },
        ],
        allExercises: [
          { id: 101, name: 'Dips', muscleGroup: 'Pectoraux' },
        ],
        allSessions: [
          {
            id: 1,
            date: '2026-10-15',
            programId: 10,
            startedAt: '2026-10-15T08:00:00.000Z',
            endedAt: '2026-10-15T09:00:00.000Z',
          },
          {
            id: 2,
            date: '2026-10-19',
            programId: 10,
            startedAt: '2026-10-19T08:00:00.000Z',
            endedAt: '2026-10-19T09:00:00.000Z',
          },
        ],
      };

      const dateUtc = new Date('2026-10-19T12:00:00.000Z');
      const res = calculateHomeSummary(mockData, dateUtc);

      expect(res.headerDate).toBe('lundi 19 octobre');
      expect(res.weeklySessionsCount).toBe(1);
      expect(res.weeklySessionsText).toBe('Cette semaine : 1 séance');
      expect(res.nextProgram?.daysAgo).toBe(0);
      expect(res.nextProgram?.lastDoneText).toBe('Dernière fois : il y a 0 j');
    });
  });

  describe('loadHomeSummaryData', () => {
    it('charge l’ensemble des tables requises sans filtre', async () => {
      await createProgram({ name: 'Pull', weekdays: [2] });
      await addExercise({ name: 'Tirage', muscleGroup: 'Dos' });
      await startSession({ now: new Date(2026, 9, 20) });

      const data = await loadHomeSummaryData();
      expect(data.allPrograms.length).toBe(1);
      expect(data.allExercises.length).toBe(1);
      expect(data.allSessions.length).toBe(1);
    });
  });
});
