import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSettings,
  saveSettings,
  updateSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '../settings';

describe('Settings storage (src/settings.ts)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Valeurs par défaut', () => {
    it('retourne les valeurs par défaut lorsque la clé est absente du localStorage', () => {
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
      const settings = getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.restSeconds).toBe(120);
      expect(settings.restSound).toBe(true);
      expect(settings.keepAwake).toBe(true);
    });
  });

  describe('Valeurs corrompues et tolérance', () => {
    it('retourne les valeurs par défaut si la valeur stockée n’est pas un JSON valide', () => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, 'corrupted{json');
      const settings = getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('retourne les valeurs par défaut si la valeur stockée n’est pas un objet (ex. primitive ou tableau)', () => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, '"chaine"');
      expect(getSettings()).toEqual(DEFAULT_SETTINGS);

      window.localStorage.setItem(SETTINGS_STORAGE_KEY, '123');
      expect(getSettings()).toEqual(DEFAULT_SETTINGS);

      window.localStorage.setItem(SETTINGS_STORAGE_KEY, '[1, 2, 3]');
      expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('applique la valeur par défaut pour restSeconds si la valeur n’appartient pas à 60 | 90 | 120 | 180', () => {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ restSeconds: 45, restSound: false, keepAwake: false })
      );
      const settings = getSettings();
      expect(settings.restSeconds).toBe(120);
      expect(settings.restSound).toBe(false);
      expect(settings.keepAwake).toBe(false);
    });

    it('applique la valeur par défaut pour restSound et keepAwake si leurs types ne sont pas booléens', () => {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          restSeconds: 60,
          restSound: 'yes',
          keepAwake: null,
        })
      );
      const settings = getSettings();
      expect(settings.restSeconds).toBe(60);
      expect(settings.restSound).toBe(true);
      expect(settings.keepAwake).toBe(true);
    });

    it('tolère un objet partiel et complète avec les valeurs par défaut pour les champs manquants', () => {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ restSeconds: 180 })
      );
      const settings = getSettings();
      expect(settings).toEqual({
        restSeconds: 180,
        restSound: true,
        keepAwake: true,
      });
    });

    it('retourne les valeurs par défaut en cas d’exception levée par localStorage.getItem', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Access denied');
      });
      expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('Écriture puis relecture', () => {
    it('enregistre puis relit correctement les nouveaux réglages complets via saveSettings', () => {
      const custom: AppSettings = {
        restSeconds: 90,
        restSound: false,
        keepAwake: false,
      };

      saveSettings(custom);
      expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(
        JSON.stringify(custom)
      );

      const reloaded = getSettings();
      expect(reloaded).toEqual(custom);
    });

    it('met à jour partiellement les réglages et persiste le résultat via updateSettings', () => {
      // Départ avec valeurs par défaut
      const updated1 = updateSettings({ restSeconds: 60 });
      expect(updated1).toEqual({
        restSeconds: 60,
        restSound: true,
        keepAwake: true,
      });
      expect(getSettings().restSeconds).toBe(60);

      // Mise à jour d'un booléen
      const updated2 = updateSettings({ restSound: false });
      expect(updated2).toEqual({
        restSeconds: 60,
        restSound: false,
        keepAwake: true,
      });
      expect(getSettings().restSound).toBe(false);
      expect(getSettings().restSeconds).toBe(60);
    });

    it('n’écrase pas avec des valeurs invalides lors de saveSettings', () => {
      saveSettings({
        restSeconds: 45 as unknown as 120,
        restSound: 'invalid' as unknown as boolean,
        keepAwake: null as unknown as boolean,
      });

      const reloaded = getSettings();
      expect(reloaded).toEqual(DEFAULT_SETTINGS);
    });

    it('tolère une erreur d’écriture dans localStorage.setItem sans planter', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() =>
        saveSettings({ restSeconds: 60, restSound: true, keepAwake: true })
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
