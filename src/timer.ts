export interface TimerState {
  endsAt: number;
  sessionId: number;
}

export const REST_TIMER_STORAGE_KEY = 'muscu_rest_timer';

/**
 * Démarre un minuteur de repos à partir de l'horodatage courant `now` (en ms),
 * d'une durée en secondes et de l'identifiant de séance.
 */
export function startRest(
  now: number,
  seconds: number,
  sessionId: number
): TimerState {
  return {
    endsAt: now + Math.max(0, seconds) * 1000,
    sessionId,
  };
}

/**
 * Calcule le nombre de secondes restantes entières (arrondi supérieur),
 * jamais négatif.
 */
export function remaining(state: TimerState, now: number): number {
  const diffMs = state.endsAt - now;
  if (diffMs <= 0) {
    return 0;
  }
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/**
 * Ajoute du temps (par défaut 30 secondes) au minuteur existant.
 */
export function addTime(state: TimerState, seconds = 30): TimerState {
  return {
    ...state,
    endsAt: state.endsAt + seconds * 1000,
  };
}

/**
 * Indique si le minuteur est arrivé à expiration par rapport à `now`.
 */
export function isExpired(state: TimerState, now: number): boolean {
  return now >= state.endsAt;
}

/**
 * Formate un nombre de secondes sous forme 'm:ss' (ex. 120 -> "2:00", 65 -> "1:05").
 */
export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Récupère l'état du minuteur stocké dans localStorage.
 * Renvoie null si absent ou corrompu.
 */
export function getStoredTimer(): TimerState | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.endsAt === 'number' &&
      Number.isFinite(parsed.endsAt) &&
      typeof parsed.sessionId === 'number' &&
      Number.isInteger(parsed.sessionId)
    ) {
      return {
        endsAt: parsed.endsAt,
        sessionId: parsed.sessionId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde l'état du minuteur dans localStorage.
 */
export function saveTimer(state: TimerState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde du minuteur :', err);
  }
}

/**
 * Supprime le minuteur de localStorage.
 */
export function clearTimer(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(REST_TIMER_STORAGE_KEY);
  } catch (err) {
    console.error('Erreur lors de la suppression du minuteur :', err);
  }
}

/**
 * Reprend le minuteur stocké s'il correspond à la séance en cours
 * et qu'il n'est pas expiré.
 * Sinon, nettoie le stockage et renvoie null.
 */
export function resumeTimer(
  now: number,
  currentSessionId: number
): TimerState | null {
  const stored = getStoredTimer();
  if (!stored) {
    return null;
  }

  if (stored.sessionId !== currentSessionId || isExpired(stored, now)) {
    clearTimer();
    return null;
  }

  return stored;
}
