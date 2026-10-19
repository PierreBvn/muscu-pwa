import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWakeLock } from '../useWakeLock';

describe('useWakeLock', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let mockRelease: ReturnType<typeof vi.fn>;
  let mockSentinel: {
    addEventListener: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRelease = vi.fn().mockResolvedValue(undefined);
    mockSentinel = {
      addEventListener: vi.fn(),
      release: mockRelease,
    };
    mockRequest = vi.fn().mockResolvedValue(mockSentinel);

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: mockRequest },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
  });

  it('demande un screen lock si enabled est true', () => {
    renderHook(() => useWakeLock(true));
    expect(mockRequest).toHaveBeenCalledWith('screen');
  });

  it('ne demande rien si enabled est false', () => {
    renderHook(() => useWakeLock(false));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('relâche la sentinelle au démontage du hook', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    // Attendre la résolution de la promesse
    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });
    unmount();
    expect(mockRelease).toHaveBeenCalled();
  });

  it('redemande le verrouillage lors de visibilitychange vers visible', async () => {
    renderHook(() => useWakeLock(true));
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Simuler le passage en arrière-plan puis retour
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
