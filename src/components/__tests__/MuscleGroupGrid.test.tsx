import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MuscleGroupGrid } from '../MuscleGroupGrid';

describe('MuscleGroupGrid component', () => {
  it('affiche les 11 groupes avec counts par défaut', () => {
    const handleSelect = vi.fn();
    render(
      <MuscleGroupGrid
        counts={{ Pectoraux: 3, Dos: 1 }}
        onSelectGroup={handleSelect}
      />
    );

    const pecButton = screen.getByRole('button', { name: 'Pectoraux (3 exercices)' });
    expect(pecButton).toBeInTheDocument();

    const dosButton = screen.getByRole('button', { name: 'Dos (1 exercice)' });
    expect(dosButton).toBeInTheDocument();

    fireEvent.click(pecButton);
    expect(handleSelect).toHaveBeenCalledWith('Pectoraux');
  });

  it('affiche les 11 groupes avec subtitles personnalisé quand fourni', () => {
    const handleSelect = vi.fn();
    render(
      <MuscleGroupGrid
        subtitles={{ Pectoraux: '+5,0\u00A0%', Dos: '—' }}
        onSelectGroup={handleSelect}
      />
    );

    const pecButton = screen.getByRole('button', { name: 'Pectoraux (+5,0\u00A0%)' });
    expect(pecButton).toBeInTheDocument();

    const dosButton = screen.getByRole('button', { name: 'Dos (—)' });
    expect(dosButton).toBeInTheDocument();

    fireEvent.click(dosButton);
    expect(handleSelect).toHaveBeenCalledWith('Dos');
  });
});
