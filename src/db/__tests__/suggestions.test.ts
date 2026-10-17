import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../schema';
import { addExercise } from '../exercises';
import { createProgram } from '../programs';
import { startSession, addSet, finishSession } from '../sessions';
import {
  parseWeight,
  parseReps,
  getSuggestedProgramForDate,
  getWeightSuggestions,
  getRepSuggestions,
  getExerciseSuggestions,
} from '../suggestions';

describe('Suggestions engine (src/db/suggestions.ts)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('parseWeight', () => {
    it('parses weight strictly, accepting commas and dots, allowing 0, rejecting non-numeric suffixes like 82abc and negatives', () => {
      expect(parseWeight('82,5')).toBe(82.5);
      expect(parseWeight('82.5')).toBe(82.5);
      expect(parseWeight('0')).toBe(0);
      expect(parseWeight('0,0')).toBe(0);
      expect(parseWeight('  12,50  ')).toBe(12.5);
      expect(parseWeight('100')).toBe(100);

      // Rejets stricts
      expect(parseWeight('82abc')).toBeNull();
      expect(parseWeight('82,5abc')).toBeNull();
      expect(parseWeight('abc82')).toBeNull();
      expect(parseWeight('-5')).toBeNull();
      expect(parseWeight('-0.5')).toBeNull();
      expect(parseWeight('')).toBeNull();
      expect(parseWeight('   ')).toBeNull();
      expect(parseWeight('82.5.5')).toBeNull();
      expect(parseWeight('82,5,5')).toBeNull();
    });

    it('rounds parsed weights to 2 decimal places', () => {
      expect(parseWeight('12.345')).toBe(12.35);
      expect(parseWeight('12.344')).toBe(12.34);
    });
  });

  describe('parseReps', () => {
    it('parses reps strictly accepting integers >= 1, rejecting decimals, zeros, negatives, and non-numeric input', () => {
      expect(parseReps('1')).toBe(1);
      expect(parseReps('10')).toBe(10);
      expect(parseReps('  12  ')).toBe(12);

      // Rejets stricts
      expect(parseReps('0')).toBeNull();
      expect(parseReps('-1')).toBeNull();
      expect(parseReps('10.5')).toBeNull();
      expect(parseReps('10,5')).toBeNull();
      expect(parseReps('8abc')).toBeNull();
      expect(parseReps('abc')).toBeNull();
      expect(parseReps('')).toBeNull();
      expect(parseReps('   ')).toBeNull();
    });
  });

  describe('getSuggestedProgramForDate', () => {
    it('returns first program by alphabetical order for current weekday, or undefined if none', async () => {
      // 2026-10-12 est un lundi (weekday 1)
      const monday = new Date(2026, 9, 12, 10, 0);

      expect(await getSuggestedProgramForDate(monday)).toBeUndefined();

      // Création de deux programmes pour le lundi : "Upper Body" et "Legs"
      await createProgram({ name: 'Upper Body', weekdays: [1] });
      const legsId = await createProgram({ name: 'Legs', weekdays: [1] });

      // Alphabétiquement, "Legs" précède "Upper Body"
      const suggested = await getSuggestedProgramForDate(monday);
      expect(suggested?.id).toBe(legsId);
      expect(suggested?.name).toBe('Legs');

      // Un jour sans programme (mardi = weekday 2)
      const tuesday = new Date(2026, 9, 13, 10, 0);
      expect(await getSuggestedProgramForDate(tuesday)).toBeUndefined();
    });
  });

  describe('Weight suggestions & reference weight (work sets)', () => {
    it('returns manualOnly and empty buttons when no history exists', async () => {
      const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: sid,
      });

      expect(suggestions.manualOnly).toBe(true);
      expect(suggestions.mode).toBeNull();
      expect(suggestions.preselectedWeight).toBeNull();
      expect(suggestions.buttons).toEqual([]);
    });

    it('picks highest work weight of most recent completed session (82.5kg over more frequent 80kg)', async () => {
      // Cas spec : 4×80 puis 3×82,5 sur les 2 dernières séances → réf 82,5
      const exId = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });

      // Séance passée 1 (il y a 4 jours) : 4 séries à 80 kg
      const s1 = await startSession({ now: new Date(2026, 9, 10, 8, 0) });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 80, type: 'work' });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 80, type: 'work' });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 80, type: 'work' });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 80, type: 'work' });
      await finishSession(s1, { now: new Date(2026, 9, 10, 9, 0) });

      // Séance passée 2 (il y a 2 jours) : 3 séries à 82.5 kg
      const s2 = await startSession({ now: new Date(2026, 9, 12, 8, 0) });
      await addSet({ sessionId: s2, exerciseId: exId, reps: 8, weight: 82.5, type: 'work' });
      await addSet({ sessionId: s2, exerciseId: exId, reps: 8, weight: 82.5, type: 'work' });
      await addSet({ sessionId: s2, exerciseId: exId, reps: 8, weight: 82.5, type: 'work' });
      await finishSession(s2, { now: new Date(2026, 9, 12, 9, 0) });

      // Séance actuelle (sans encore de série enregistrée)
      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: currentSid,
      });

      // La dernière séance terminée est s2, le max y est 82.5
      expect(suggestions.manualOnly).toBe(false);
      expect(suggestions.mode).toBe(82.5);
      expect(suggestions.preselectedWeight).toBe(82.5);
      // Boutons [82.5 - 2.5, 82.5, 82.5 + 2.5, 82.5 + 5] = [80, 82.5, 85, 87.5]
      expect(suggestions.buttons).toEqual([80, 82.5, 85, 87.5]);
    });

    it('updates reference weight to current session last work set (85kg overrides past 82.5kg)', async () => {
      // Cas spec : historique à 82,5, 1re vraie série du jour à 85 → réf 85
      const exId = await addExercise({ name: 'Développé militaire', muscleGroup: 'Épaules' });

      // Séance passée terminée avec 82.5
      const sPast = await startSession({ now: new Date(2026, 9, 12, 8, 0) });
      await addSet({ sessionId: sPast, exerciseId: exId, reps: 8, weight: 82.5, type: 'work' });
      await finishSession(sPast, { now: new Date(2026, 9, 12, 9, 0) });

      // Séance actuelle
      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      // 1ère série du jour enregistrée à 85 kg
      await addSet({ sessionId: currentSid, exerciseId: exId, reps: 8, weight: 85, type: 'work' });

      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: currentSid,
      });

      // La séance en cours contenant une vraie série prime : réf = 85 kg
      expect(suggestions.mode).toBe(85);
      expect(suggestions.preselectedWeight).toBe(85);
      expect(suggestions.buttons).toEqual([82.5, 85, 87.5, 90]);
    });

    it('ignores completed sessions with only warmup sets or skipped exercise and finds previous work session', async () => {
      // Cas spec : dernière séance avec uniquement des échauffements (ou exercice sauté) → on remonte à la séance précédente
      const exId = await addExercise({ name: 'Tirage vertical', muscleGroup: 'Dos' });

      // Séance 1 : contient une vraie série à 70 kg
      const s1 = await startSession({ now: new Date(2026, 9, 10, 8, 0) });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 70, type: 'work' });
      await finishSession(s1, { now: new Date(2026, 9, 10, 9, 0) });

      // Séance 2 : ne contient QUE des échauffements pour cet exercice (ex: 40 kg)
      const s2 = await startSession({ now: new Date(2026, 9, 12, 8, 0) });
      await addSet({ sessionId: s2, exerciseId: exId, reps: 15, weight: 40, type: 'warmup' });
      await finishSession(s2, { now: new Date(2026, 9, 12, 9, 0) });

      // Séance 3 (en cours)
      const s3 = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: s3,
      });

      // s2 ignorée car 0 série work -> on remonte à s1 (70 kg)
      expect(suggestions.mode).toBe(70);
      expect(suggestions.preselectedWeight).toBe(70);
    });

    it('never includes warmup sets in reference weight calculation', async () => {
      const exId = await addExercise({ name: 'Presse', muscleGroup: 'Quadriceps' });

      // Séance passée avec échauffement à 120 kg et work à 100 kg
      const s1 = await startSession({ now: new Date(2026, 9, 10, 8, 0) });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 120, type: 'warmup' });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 10, weight: 100, type: 'work' });
      await finishSession(s1, { now: new Date(2026, 9, 10, 9, 0) });

      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: currentSid,
      });

      // Seule la série work (100 kg) est prise en compte, pas l'échauffement (120 kg)
      expect(suggestions.mode).toBe(100);
      expect(suggestions.preselectedWeight).toBe(100);
    });

    it('generates rounded buttons to 2 decimals with custom step 1.25 and masks weights < 0', async () => {
      // Exercice avec weightStep = 1.25 et référence basse (1 kg)
      const exId = await addExercise({ name: 'Haltères petits', muscleGroup: 'Biceps' });
      await db.exercises.update(exId, { weightStep: 1.25 });

      const s1 = await startSession({ now: new Date(2026, 9, 10, 8, 0) });
      await addSet({ sessionId: s1, exerciseId: exId, reps: 12, weight: 1, type: 'work' });
      await finishSession(s1, { now: new Date(2026, 9, 10, 9, 0) });

      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const suggestions = await getWeightSuggestions(exId, {
        isWarmup: false,
        currentSessionId: currentSid,
      });

      // réf = 1 kg, pas = 1.25 kg
      // réf - pas = 1 - 1.25 = -0.25 (< 0 -> masqué !)
      // réf = 1
      // réf + pas = 2.25
      // réf + 2*pas = 3.5
      expect(suggestions.buttons).toEqual([1, 2.25, 3.5]);
    });
  });

  describe('Weight suggestions for warmup sets', () => {
    it('suggests last warmup weight used for warmup sets, or manual if none', async () => {
      const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      // Aucun historique
      let warmupSug = await getWeightSuggestions(exId, {
        isWarmup: true,
        currentSessionId: sid,
      });
      expect(warmupSug.manualOnly).toBe(true);
      expect(warmupSug.buttons).toEqual([]);
      expect(warmupSug.preselectedWeight).toBeNull();

      // Ajout d'une série d'échauffement à 50 kg
      await addSet({ sessionId: sid, exerciseId: exId, reps: 15, weight: 50, type: 'warmup' });

      warmupSug = await getWeightSuggestions(exId, {
        isWarmup: true,
        currentSessionId: sid,
      });
      expect(warmupSug.manualOnly).toBe(false);
      expect(warmupSug.buttons).toEqual([50]);
      expect(warmupSug.preselectedWeight).toBe(50);
    });
  });

  describe('Rep suggestions (getRepSuggestions)', () => {
    it('provides standard rep buttons [6, 8, 10, 12]', async () => {
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const suggestions = await getRepSuggestions(1, { currentSessionId: sid });
      expect(suggestions.buttons).toEqual([6, 8, 10, 12]);
    });

    it('returns null preselected reps when no history exists', async () => {
      const exId = await addExercise({ name: 'Inconnu', muscleGroup: 'Biceps' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });
      const suggestions = await getRepSuggestions(exId, { currentSessionId: sid });
      expect(suggestions.preselectedReps).toBeNull();
    });

    it('preselects reps from previous set of same exercise in current session', async () => {
      const exId = await addExercise({ name: 'Curl', muscleGroup: 'Biceps' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      await addSet({ sessionId: sid, exerciseId: exId, reps: 10, weight: 15, type: 'warmup' });
      await addSet({ sessionId: sid, exerciseId: exId, reps: 8, weight: 20, type: 'work' });

      const suggestions = await getRepSuggestions(exId, { currentSessionId: sid });
      // La série précédente de cet exercice a 8 reps
      expect(suggestions.preselectedReps).toBe(8);
    });

    it('preselects reps from last work set of previous session on first set of exercise', async () => {
      const exId = await addExercise({ name: 'Curl', muscleGroup: 'Biceps' });

      // Séance passée avec une série à 12 reps
      const sPast = await startSession({ now: new Date(2026, 9, 12, 8, 0) });
      await addSet({ sessionId: sPast, exerciseId: exId, reps: 12, weight: 20, type: 'work' });
      await finishSession(sPast, { now: new Date(2026, 9, 12, 9, 0) });

      // Nouvelle séance (0 série encore pour cet exercice)
      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const suggestions = await getRepSuggestions(exId, { currentSessionId: currentSid });
      expect(suggestions.preselectedReps).toBe(12);
    });

    it('separates preselected reps by set type: warmup at 12 reps then 1st work set preselects last work set reps (not 12)', async () => {
      const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

      // Séance passée avec une vraie série à 8 reps
      const sPast = await startSession({ now: new Date(2026, 9, 12, 8, 0) });
      await addSet({ sessionId: sPast, exerciseId: exId, reps: 8, weight: 80, type: 'work' });
      await finishSession(sPast, { now: new Date(2026, 9, 12, 9, 0) });

      // Séance du jour
      const currentSid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      // Échauffement réalisé à 12 reps
      await addSet({ sessionId: currentSid, exerciseId: exId, reps: 12, weight: 40, type: 'warmup' });

      // Demande de suggestions pour la 1re vraie série (work)
      const suggestions = await getRepSuggestions(exId, {
        currentSessionId: currentSid,
        isWarmup: false,
      });

      // La présélection doit être les reps de la dernière vraie série (8) et PAS l'échauffement (12)
      expect(suggestions.preselectedReps).toBe(8);

      // Pour une série d'échauffement (warmup), la présélection est celle de l'échauffement (12)
      const warmupSuggestions = await getRepSuggestions(exId, {
        currentSessionId: currentSid,
        isWarmup: true,
      });
      expect(warmupSuggestions.preselectedReps).toBe(12);
    });
  });

  describe('getExerciseSuggestions', () => {
    it('combines weight and rep suggestions into one payload', async () => {
      const exId = await addExercise({ name: 'Barre au front', muscleGroup: 'Biceps' });
      const sid = await startSession({ now: new Date(2026, 9, 15, 8, 0) });

      const suggestions = await getExerciseSuggestions(exId, {
        isWarmup: false,
        currentSessionId: sid,
      });

      expect(suggestions.weight).toBeDefined();
      expect(suggestions.reps).toBeDefined();
      expect(suggestions.reps.buttons).toEqual([6, 8, 10, 12]);
    });
  });
});
