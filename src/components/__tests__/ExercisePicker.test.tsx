import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePicker } from '../ExercisePicker';
import { db } from '../../db/schema';
import { addExercise, deleteExercise } from '../../db/exercises';

describe('ExercisePicker', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ExercisePicker
        isOpen={false}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders grid with 11 muscle groups and empty search input on open', async () => {
    await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });

    render(
      <ExercisePicker
        isOpen={true}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /rechercher un exercice/i })).toHaveValue('');

    // Les 11 groupes musculaires sont présents sous forme de boutons
    expect(await screen.findByRole('button', { name: /^pectoraux/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bDos\b/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^épaules/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^biceps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^triceps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^avant-bras/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^abdos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^quadriceps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ischios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fessiers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^mollets/i })).toBeInTheDocument();

    // Décompte dans Pectoraux
    expect(screen.getByRole('button', { name: /^pectoraux/i })).toHaveTextContent(/1 exercice/i);
    // Décompte dans Dos (0 exercice)
    expect(screen.getByRole('button', { name: /\bDos\b/i })).toHaveTextContent(/0 exercice/i);
  });

  it('excludes archived and existing exercises from counts and group lists', async () => {
    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });
    const exId3 = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
    await deleteExercise(exId3); // archivé

    render(
      <ExercisePicker
        isOpen={true}
        existingExerciseIds={[exId1]}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    // Pectoraux : 2 au total - 1 déjà présent = 1 disponible
    const pecBtn = await screen.findByRole('button', { name: /pectoraux/i });
    expect(pecBtn).toHaveTextContent(/1 exercice/i);

    // Quadriceps : 1 archivé = 0 disponible
    const quadBtn = screen.getByRole('button', { name: /quadriceps/i });
    expect(quadBtn).toHaveTextContent(/0 exercice/i);

    // Entrer dans Pectoraux
    fireEvent.click(pecBtn);

    // Développé couché (déjà présent) n'est pas affiché
    expect(screen.queryByRole('button', { name: 'Développé couché' })).toBeNull();
    // Écarté poulie est affiché avec son nom accessible exact
    expect(screen.getByRole('button', { name: 'Écarté poulie' })).toBeInTheDocument();
  });

  it('navigates to group details and back to grid', async () => {
    await addExercise({ name: 'Rowing barre', muscleGroup: 'Dos' });

    render(
      <ExercisePicker
        isOpen={true}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    const dosBtn = await screen.findByRole('button', { name: /\bDos\b/i });
    fireEvent.click(dosBtn);

    // Liste du groupe Dos
    expect(screen.getByRole('button', { name: 'Rowing barre' })).toBeInTheDocument();

    // Bouton retour
    const backBtn = screen.getByRole('button', { name: /retour/i });
    fireEvent.click(backBtn);

    // Retour sur la grille
    expect(screen.getByRole('button', { name: /\bDos\b/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rowing barre' })).toBeNull();
  });

  it('displays "Aucun exercice" when a group has no available exercises', async () => {
    render(
      <ExercisePicker
        isOpen={true}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    const dosBtn = await screen.findByRole('button', { name: /\bDos\b/i });
    fireEvent.click(dosBtn);

    expect(screen.getByText('Aucun exercice')).toBeInTheDocument();
  });

  it('searches across all groups insensitively to case and accents, and returns to grid when emptied', async () => {
    await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    await addExercise({ name: 'Écarté à la poulie', muscleGroup: 'Pectoraux' });
    await addExercise({ name: 'Développé militaire', muscleGroup: 'Épaules' });

    render(
      <ExercisePicker
        isOpen={true}
        onClose={vi.fn()}
        onSelectExercise={vi.fn()}
      />
    );

    const searchInput = await screen.findByRole('textbox', { name: /rechercher un exercice/i });

    // Recherche "developpe" sans accent ni majuscule
    fireEvent.change(searchInput, { target: { value: 'developpe' } });

    // La grille n'est plus affichée
    expect(screen.queryByRole('button', { name: /^pectoraux/i })).toBeNull();

    // Les deux exercices de groupes différents ressortent
    expect(screen.getByRole('button', { name: 'Développé couché' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Développé militaire' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Écarté à la poulie' })).toBeNull();

    // Recherche avec accents "ÉCARTÉ"
    fireEvent.change(searchInput, { target: { value: 'ÉCARTÉ' } });
    expect(screen.getByRole('button', { name: 'Écarté à la poulie' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Développé couché' })).toBeNull();

    // Recherche infructueuse : "Aucun exercice"
    fireEvent.change(searchInput, { target: { value: 'introuvable' } });
    expect(screen.getByText('Aucun exercice')).toBeInTheDocument();

    // Champ vidé : retour immédiat à la grille
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /^pectoraux/i })).toBeInTheDocument();
  });

  it('selects an exercise and calls onSelectExercise and onClose', async () => {
    await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ExercisePicker
        isOpen={true}
        onClose={handleClose}
        onSelectExercise={handleSelect}
      />
    );

    const dosBtn = await screen.findByRole('button', { name: /\bDos\b/i });
    fireEvent.click(dosBtn);

    const exerciseBtn = screen.getByRole('button', { name: 'Tractions' });
    fireEvent.click(exerciseBtn);

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Tractions', muscleGroup: 'Dos' })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('closes when clicking the close button', async () => {
    const handleClose = vi.fn();

    render(
      <ExercisePicker
        isOpen={true}
        onClose={handleClose}
        onSelectExercise={vi.fn()}
      />
    );

    const closeBtn = await screen.findByRole('button', { name: 'Fermer' });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
