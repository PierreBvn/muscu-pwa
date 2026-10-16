import { useEffect } from 'react';

/**
 * Verrouille le défilement de l'arrière-plan (document.body) quand une modale est ouverte.
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
}
