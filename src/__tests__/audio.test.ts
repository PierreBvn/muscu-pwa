import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unlockAudio, playTimerBeep, resetAudioContextForTests } from '../audio';

describe('Web Audio (src/audio.ts)', () => {
  let mockResume: ReturnType<typeof vi.fn>;
  let mockCreateOscillator: ReturnType<typeof vi.fn>;
  let mockCreateGain: ReturnType<typeof vi.fn>;
  let mockOscillator: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockGain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resetAudioContextForTests();
    mockResume = vi.fn().mockResolvedValue(undefined);
    mockOscillator = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    mockCreateOscillator = vi.fn().mockReturnValue(mockOscillator);
    mockCreateGain = vi.fn().mockReturnValue(mockGain);

    class MockAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      resume = mockResume;
      createOscillator = mockCreateOscillator;
      createGain = mockCreateGain;
    }

    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  it('débloque l’AudioContext lors de unlockAudio', () => {
    unlockAudio();
    expect(mockResume).toHaveBeenCalled();
  });

  it('émet un bip avec un oscillateur et un gain lors de playTimerBeep', () => {
    playTimerBeep();

    expect(mockCreateOscillator).toHaveBeenCalled();
    expect(mockCreateGain).toHaveBeenCalled();
    expect(mockOscillator.type).toBe('sine');
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalledWith(0.25);
  });

  it('gère l’absence d’AudioContext sans lever d’exception', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => unlockAudio()).not.toThrow();
    expect(() => playTimerBeep()).not.toThrow();
  });
});
