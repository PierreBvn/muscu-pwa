import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RestBanner } from '../RestBanner';

describe('RestBanner', () => {
  it('affiche le libellé Repos et le temps restant formaté en m:ss', () => {
    render(
      <RestBanner
        remainingSeconds={120}
        onAddTime={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText('Repos')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('appelle onAddTime lors du clic sur +30 s', () => {
    const handleAddTime = vi.fn();
    render(
      <RestBanner
        remainingSeconds={45}
        onAddTime={handleAddTime}
        onSkip={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /ajouter 30 secondes/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    expect(handleAddTime).toHaveBeenCalledTimes(1);
  });

  it('appelle onSkip lors du clic sur Passer', () => {
    const handleSkip = vi.fn();
    render(
      <RestBanner
        remainingSeconds={45}
        onAddTime={vi.fn()}
        onSkip={handleSkip}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /passer le temps de repos/i });
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);

    expect(handleSkip).toHaveBeenCalledTimes(1);
  });

  it('décompte en interne via timer et déclenche onExpire à expiration', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const now = 10000;
      vi.setSystemTime(now);

      const handleExpire = vi.fn();
      const timer = {
        sessionId: 1,
        endsAt: now + 5000,
      };

      render(
        <RestBanner
          timer={timer}
          onAddTime={vi.fn()}
          onSkip={vi.fn()}
          onExpire={handleExpire}
        />
      );

      expect(screen.getByText('0:05')).toBeInTheDocument();

      // Avancer de 2 secondes
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText('0:03')).toBeInTheDocument();
      expect(handleExpire).not.toHaveBeenCalled();

      // Avancer jusqu'à expiration
      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(handleExpire).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
