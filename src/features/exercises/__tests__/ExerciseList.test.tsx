import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { db, MUSCLE_GROUPS } from '../../../db/schema';
import { addExercise } from '../../../db/exercises';
import { ExerciseList } from '../ExerciseList';

describe('ExerciseList UI component (grille & navigation)', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('renders the header and displays the 2-column grid of 11 muscle groups with exercise counts', async () => {
    render(<ExerciseList />);

    expect(
      screen.getByRole('heading', { name: /bibliothèque d’exercices/i })
    ).toBeInTheDocument();

    // Vérifie la présence des 11 boutons correspondant aux 11 groupes musculaires
    await waitFor(() => {
      for (const group of MUSCLE_GROUPS) {
        expect(
          screen.getByRole('button', { name: new RegExp(`^${group}`, 'i') })
        ).toBeInTheDocument();
      }
    });

    // Les tuiles contiennent des icônes recolorées 48px (MuscleIcon) au lieu des monogrammes
    const pecBtn = screen.getByRole('button', { name: /pectoraux/i });
    const pecIcon = pecBtn.querySelector('img[aria-hidden="true"]');
    expect(pecIcon).not.toBeNull();
    expect(pecIcon?.getAttribute('src')).toContain('pectoraux.png');

    const quadBtn = screen.getByRole('button', { name: /quadriceps/i });
    const quadIcon = quadBtn.querySelector('img[aria-hidden="true"]');
    expect(quadIcon).not.toBeNull();
    expect(quadIcon?.getAttribute('src')).toContain('quadriceps.png');

    const dosBtn = screen.getByRole('button', { name: /^dos/i });
    const dosIcon = dosBtn.querySelector('img[aria-hidden="true"]');
    expect(dosIcon).not.toBeNull();
    expect(dosIcon?.getAttribute('src')).toContain('dos.png');

    // Les monogrammes texte ne sont plus dans la grille
    expect(screen.queryByText('PE')).toBeNull();
  });

  it('navigates to group details on tile click and returns to grid on Back button click', async () => {
    render(<ExerciseList />);

    // Attendre le seed
    const pectorauxTile = await screen.findByRole('button', { name: /pectoraux/i });
    fireEvent.click(pectorauxTile);

    // Vue détaillée Pectoraux : les exercices sont affichés
    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Développé incliné haltères')).toBeInTheDocument();
      expect(screen.getByText('Écarté à la poulie')).toBeInTheDocument();
    });

    // L'en-tête de catégorie affiche le titre Pectoraux et l'icône associée
    const categoryHeading = screen.getByRole('heading', { name: /pectoraux/i });
    expect(categoryHeading).toBeInTheDocument();
    const headerContainer = categoryHeading.closest('div');
    const headerIcon = headerContainer?.parentElement?.querySelector('img[aria-hidden="true"]');
    expect(headerIcon).not.toBeNull();
    expect(headerIcon?.getAttribute('src')).toContain('pectoraux.png');

    // Les cartes d'exercices d'une catégorie n'affichent pas d'icône de groupe (réservée aux listes mélangées)
    expect(screen.queryAllByRole('img', { name: 'Pectoraux' })).toHaveLength(0);
    expect(screen.getByText('Développé couché').closest('div')?.querySelector('img')).toBeNull();

    // Bouton Retour
    const backBtn = screen.getByRole('button', { name: /retour/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    // Retour sur la grille : Développé couché n'est plus dans le DOM, la tuile Pectoraux réapparaît
    await waitFor(() => {
      expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pectoraux/i })).toBeInTheDocument();
    });
  });

  it('pre-selects the group when clicking "+ Ajouter" from within a group detail view', async () => {
    render(<ExerciseList />);

    const bicepsTile = await screen.findByRole('button', { name: /biceps/i });
    fireEvent.click(bicepsTile);

    await waitFor(() => {
      expect(screen.getByText('Curl biceps barre')).toBeInTheDocument();
    });

    // Clic sur "+ Ajouter" dans la vue détaillée de Biceps
    const addBtn = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(addBtn);

    // La modale s'ouvre avec le chip "Biceps" pré-sélectionné (aria-pressed=true)
    expect(screen.getByRole('heading', { name: /nouvel exercice/i })).toBeInTheDocument();
    const bicepsChip = screen.getByRole('button', { name: 'Biceps' });
    expect(bicepsChip).toHaveAttribute('aria-pressed', 'true');

    // Annuler ferme la modale
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
  });

  it('opens modal from global header, adds a new exercise and shows it in its group', async () => {
    render(<ExerciseList />);

    await screen.findByRole('button', { name: /pectoraux/i });

    // Clic sur "+ Ajouter" global
    const globalAddBtn = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(globalAddBtn);

    expect(screen.getByRole('heading', { name: /nouvel exercice/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/nom de l’exercice/i);
    expect(input.hasAttribute('autofocus')).toBe(false);
    fireEvent.change(input, { target: { value: 'Hack Squat' } });

    // Sélectionner Quadriceps
    const quadChip = screen.getByRole('button', { name: 'Quadriceps' });
    fireEvent.click(quadChip);
    expect(quadChip).toHaveAttribute('aria-pressed', 'true');

    // Enregistrer
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    // La modale se ferme
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /nouvel exercice/i })).not.toBeInTheDocument();
    });

    // Naviguer dans Quadriceps pour vérifier la présence du nouvel exercice
    const quadTile = screen.getByRole('button', { name: /quadriceps/i });
    fireEvent.click(quadTile);

    await waitFor(() => {
      expect(screen.getByText('Hack Squat')).toBeInTheDocument();
    });
  });

  it('displays an error message when attempting to add a duplicate exercise', async () => {
    render(<ExerciseList />);

    await screen.findByRole('button', { name: /pectoraux/i });

    const addButton = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(addButton);

    const input = screen.getByLabelText(/nom de l’exercice/i);
    fireEvent.change(input, { target: { value: 'développé couché' } });

    const saveButton = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/un exercice nommé "développé couché" existe déjà/i)
      ).toBeInTheDocument();
    });
  });

  it('deletes an exercise after user confirmation via ConfirmDialog', async () => {
    render(<ExerciseList />);

    // Aller dans Pectoraux
    const pecTile = await screen.findByRole('button', { name: /pectoraux/i });
    fireEvent.click(pecTile);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    // Clic sur l'icône de suppression
    const deleteBtn = screen.getByRole('button', {
      name: /supprimer développé couché/i,
    });
    fireEvent.click(deleteBtn);

    // Dialogue alertdialog ConfirmDialog
    expect(
      screen.getByRole('alertdialog')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /supprimer l’exercice \?/i })
    ).toBeInTheDocument();

    // Confirmer
    const confirmDeleteBtn = screen.getByRole('button', {
      name: /^supprimer$/i,
    });
    fireEvent.click(confirmDeleteBtn);

    // L'exercice est retiré de la liste active
    await waitFor(() => {
      expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
    });
  });

  it('displays "Aucun exercice" empty state when a group has 0 exercises', async () => {
    // Insérer un seul exercice dans Dos
    await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });

    render(<ExerciseList />);

    // Biceps n'a aucun exercice inséré
    const bicepsTile = await screen.findByRole('button', { name: /biceps/i });
    expect(bicepsTile).toHaveTextContent(/0 exercice/i);
    fireEvent.click(bicepsTile);

    // État vide selon correction 8 : uniquement "Aucun exercice" sans deuxième bouton
    await waitFor(() => {
      expect(screen.getByText('Aucun exercice')).toBeInTheDocument();
    });
  });
});
