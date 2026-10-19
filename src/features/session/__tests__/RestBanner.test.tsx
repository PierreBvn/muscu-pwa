import { render, screen, fireEvent } from '@testing-library/react';
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
});
