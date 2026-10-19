import { useEffect } from 'react';

/**
 * Maintient l'écran allumé (Wake Lock API) lorsque `enabled` est vrai.
 * Redemande le verrouillage lors d'un retour au premier plan (visibilitychange).
 * Échoue silencieusement si la Wake Lock API n'est pas supportée ou si la demande est refusée.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let isCancelled = false;

    async function requestLock() {
      try {
        if (isCancelled || document.visibilityState !== 'visible') {
          return;
        }
        sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        // Échec silencieux si refusé ou non supporté
      }
    }

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, [enabled]);
}
