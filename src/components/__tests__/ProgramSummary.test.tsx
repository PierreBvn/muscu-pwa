import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgramSummary } from '../ProgramSummary';

describe('ProgramSummary component', () => {
  it('affiche les badges de groupes musculaires avec pictogrammes et le décompte d’exercices', () => {
    render(
      <ProgramSummary
        summary={{
          muscleGroups: ['Dos', 'Biceps'],
          exerciseCountText: '5 exercices',
        }}
        rightMeta={<span>Dernière fois : il y a 2 j</span>}
      />
    );

    // Les groupes musculaires
    expect(screen.getByText('Dos')).toBeInTheDocument();
    expect(screen.getByText('Biceps')).toBeInTheDocument();

    // Décompte d'exercices
    expect(screen.getByText('5 exercices')).toBeInTheDocument();

    // Élément droit optionnel
    expect(screen.getByText('Dernière fois : il y a 2 j')).toBeInTheDocument();
  });

  it('affiche "Aucun groupe musculaire" quand la liste des groupes est vide', () => {
    render(
      <ProgramSummary
        summary={{
          muscleGroups: [],
          exerciseCountText: '0 exercice',
        }}
      />
    );

    expect(screen.getByText('Aucun groupe musculaire')).toBeInTheDocument();
    expect(screen.getByText('0 exercice')).toBeInTheDocument();
  });
});
