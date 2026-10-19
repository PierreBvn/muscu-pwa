export const REST_SECONDS_OPTIONS = [60, 90, 120, 180] as const;
export type RestSeconds = (typeof REST_SECONDS_OPTIONS)[number];

export interface AppSettings {
  restSeconds: RestSeconds;
  restSound: boolean;
  keepAwake: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  restSeconds: 120,
  restSound: true,
  keepAwake: true,
};

export const SETTINGS_STORAGE_KEY = 'muscu_settings';

function isValidRestSeconds(val: unknown): val is RestSeconds {
  return (
    typeof val === 'number' &&
    (REST_SECONDS_OPTIONS as readonly unknown[]).includes(val)
  );
}

/**
 * Récupère les réglages de l'application depuis le localStorage.
 * Tolérant : si la clé est absente, corrompue ou si un champ particulier
 * est invalide, la valeur par défaut correspondante est appliquée.
 */
export function getSettings(): AppSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    const restSeconds = isValidRestSeconds(parsed.restSeconds)
      ? parsed.restSeconds
      : DEFAULT_SETTINGS.restSeconds;

    const restSound =
      typeof parsed.restSound === 'boolean'
        ? parsed.restSound
        : DEFAULT_SETTINGS.restSound;

    const keepAwake =
      typeof parsed.keepAwake === 'boolean'
        ? parsed.keepAwake
        : DEFAULT_SETTINGS.keepAwake;

    return {
      restSeconds,
      restSound,
      keepAwake,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Sauvegarde les réglages complets dans le localStorage sous une clé unique.
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const sanitized: AppSettings = {
      restSeconds: isValidRestSeconds(settings.restSeconds)
        ? settings.restSeconds
        : DEFAULT_SETTINGS.restSeconds,
      restSound:
        typeof settings.restSound === 'boolean'
          ? settings.restSound
          : DEFAULT_SETTINGS.restSound,
      keepAwake:
        typeof settings.keepAwake === 'boolean'
          ? settings.keepAwake
          : DEFAULT_SETTINGS.keepAwake,
    };
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde des réglages :', err);
  }
}

/**
 * Met à jour partiellement les réglages et persiste le résultat.
 */
export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
  };
  saveSettings(next);
  return next;
}
