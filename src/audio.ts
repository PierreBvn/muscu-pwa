let audioContext: AudioContext | null = null;

/**
 * Initialise et débloque l'AudioContext lors d'une interaction utilisateur (tap/clic).
 * Indispensable sur iOS Safari où le contexte audio doit être réveillé dans un geste utilisateur.
 */
export function unlockAudio(): void {
  try {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  } catch {
    // Échec silencieux
  }
}

/**
 * Joue un bip court via Web Audio (oscillateur sinusoïdal, sans fichier audio).
 */
export function playTimerBeep(): void {
  try {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // Note La5 (880 Hz)
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.25);
  } catch {
    // Échec silencieux
  }
}

/**
 * Réinitialise l'instance audio (usage interne tests).
 */
export function resetAudioContextForTests(): void {
  audioContext = null;
}
