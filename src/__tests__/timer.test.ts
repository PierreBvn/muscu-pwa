import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startRest,
  remaining,
  addTime,
  isExpired,
  formatTimer,
  getStoredTimer,
  saveTimer,
  clearTimer,
  resumeTimer,
  REST_TIMER_STORAGE_KEY,
} from '../timer';

describe('Logique pure du minuteur (src/timer.ts)', () => {
  const SESSION_ID = 42;
  const BASE_TIME = 1_700_000_000_000; // ms

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('startRest', () => {
    it('initialise endsAt et sessionId à partir de now et de la durée en secondes', () => {
      const state = startRest(BASE_TIME, 120, SESSION_ID);
      expect(state).toEqual({
        endsAt: BASE_TIME + 120_000,
        sessionId: SESSION_ID,
      });
    });

    it('gère une durée nulle ou négative sans planter', () => {
      const state = startRest(BASE_TIME, 0, SESSION_ID);
      expect(state.endsAt).toBe(BASE_TIME);

      const stateNeg = startRest(BASE_TIME, -10, SESSION_ID);
      expect(stateNeg.endsAt).toBe(BASE_TIME);
    });
  });

  describe('remaining', () => {
    it('calcule correctement les secondes restantes (arrondi supérieur)', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };

      expect(remaining(state, BASE_TIME)).toBe(60);
      expect(remaining(state, BASE_TIME + 10_000)).toBe(50);
      expect(remaining(state, BASE_TIME + 10_500)).toBe(50); // 49.5s -> arrondi sup = 50s
      expect(remaining(state, BASE_TIME + 59_100)).toBe(1);
    });

    it('ne renvoie jamais de valeur négative lorsque le temps est écoulé', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };

      expect(remaining(state, BASE_TIME + 60_000)).toBe(0);
      expect(remaining(state, BASE_TIME + 61_000)).toBe(0);
      expect(remaining(state, BASE_TIME + 200_000)).toBe(0);
    });
  });

  describe('addTime', () => {
    it('ajoute par défaut 30 secondes au minuteur', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };
      const updated = addTime(state);

      expect(updated).toEqual({
        endsAt: BASE_TIME + 90_000,
        sessionId: SESSION_ID,
      });
    });

    it('permet d’ajouter une durée personnalisée', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };
      const updated = addTime(state, 45);

      expect(updated.endsAt).toBe(BASE_TIME + 105_000);
    });
  });

  describe('isExpired', () => {
    it('renvoie false tant que now est strictement inférieur à endsAt', () => {
      const state = { endsAt: BASE_TIME + 30_000, sessionId: SESSION_ID };
      expect(isExpired(state, BASE_TIME)).toBe(false);
      expect(isExpired(state, BASE_TIME + 29_999)).toBe(false);
    });

    it('renvoie true dès que now atteint ou dépasse endsAt', () => {
      const state = { endsAt: BASE_TIME + 30_000, sessionId: SESSION_ID };
      expect(isExpired(state, BASE_TIME + 30_000)).toBe(true);
      expect(isExpired(state, BASE_TIME + 30_001)).toBe(true);
      expect(isExpired(state, BASE_TIME + 100_000)).toBe(true);
    });
  });

  describe('formatTimer', () => {
    it('formate les secondes au format m:ss avec zéro initial pour les secondes', () => {
      expect(formatTimer(120)).toBe('2:00');
      expect(formatTimer(90)).toBe('1:30');
      expect(formatTimer(65)).toBe('1:05');
      expect(formatTimer(9)).toBe('0:09');
      expect(formatTimer(0)).toBe('0:00');
    });

    it('traite les valeurs négatives ou décimales de manière robuste', () => {
      expect(formatTimer(-5)).toBe('0:00');
      expect(formatTimer(12.8)).toBe('0:12');
    });
  });

  describe('persistance localStorage et reprise', () => {
    it('sauvegarde, lit et supprime l’état du minuteur', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };
      saveTimer(state);

      const loaded = getStoredTimer();
      expect(loaded).toEqual(state);

      clearTimer();
      expect(getStoredTimer()).toBeNull();
    });

    it('reprise avec le bon sessionId et non expiré → renvoie l’état', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };
      saveTimer(state);

      const resumed = resumeTimer(BASE_TIME + 10_000, SESSION_ID);
      expect(resumed).toEqual(state);
      expect(window.localStorage.getItem(REST_TIMER_STORAGE_KEY)).not.toBeNull();
    });

    it('reprise avec un mauvais sessionId → effacé et renvoie null', () => {
      const state = { endsAt: BASE_TIME + 60_000, sessionId: SESSION_ID };
      saveTimer(state);

      const wrongSessionId = 999;
      const resumed = resumeTimer(BASE_TIME + 10_000, wrongSessionId);
      expect(resumed).toBeNull();
      expect(window.localStorage.getItem(REST_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('reprise avec un minuteur expiré → effacé et renvoie null', () => {
      const state = { endsAt: BASE_TIME + 30_000, sessionId: SESSION_ID };
      saveTimer(state);

      // now est supérieur à endsAt (donc expiré)
      const resumed = resumeTimer(BASE_TIME + 35_000, SESSION_ID);
      expect(resumed).toBeNull();
      expect(window.localStorage.getItem(REST_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('reprise sans aucun minuteur en stockage → renvoie null', () => {
      const resumed = resumeTimer(BASE_TIME, SESSION_ID);
      expect(resumed).toBeNull();
    });

    it('gère les données corrompues dans localStorage en renvoyant null', () => {
      window.localStorage.setItem(REST_TIMER_STORAGE_KEY, 'invalid-json{');
      expect(getStoredTimer()).toBeNull();

      window.localStorage.setItem(
        REST_TIMER_STORAGE_KEY,
        JSON.stringify({ endsAt: 'not-a-number', sessionId: SESSION_ID })
      );
      expect(getStoredTimer()).toBeNull();
    });
  });
});
