import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProgramList } from '../ProgramList';
import { db } from '../../../db/schema';
import { createProgram } from '../../../db/programs';

describe('ProgramList UI', () => {
  beforeEach(async () => {
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();
  });

  it('renders header, empty state, and opens creation modal', async () => {
    render(<ProgramList />);

    expect(
      screen.getByRole('heading', { name: /séances types/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/aucune séance type/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    expect(
      screen.getByRole('heading', { name: /nouvelle séance type/i })
    ).toBeInTheDocument();
  });

  it('validates program name and weekdays before creating', async () => {
    render(<ProgramList />);

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });

    // Nom vide
    fireEvent.click(saveBtn);
    expect(
      screen.getByText(/le nom de la séance type ne peut pas être vide/i)
    ).toBeInTheDocument();

    // Remplir le nom mais aucun jour
    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    fireEvent.change(nameInput, { target: { value: 'Full Body' } });

    // Désélectionner les jours si cochés par défaut, ou vérifier l'erreur si aucun jour
    const lundiCheckbox = screen.getByRole('checkbox', { name: /lundi/i });
    if (lundiCheckbox.getAttribute('aria-checked') === 'true') {
      fireEvent.click(lundiCheckbox);
    }
    // Tous décochés
    const allDays = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    for (const d of allDays) {
      const cb = screen.getByRole('checkbox', { name: new RegExp(d, 'i') });
      if (cb.getAttribute('aria-checked') === 'true') {
        fireEvent.click(cb);
      }
    }

    fireEvent.click(saveBtn);
    expect(
      screen.getByText(/sélectionnez au moins un jour/i)
    ).toBeInTheDocument();
  });

  it('creates a new program with chosen weekdays', async () => {
    render(<ProgramList />);

    const addBtn = screen.getByRole('button', { name: /^nouvelle$/i });
    fireEvent.click(addBtn);

    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    fireEvent.change(nameInput, { target: { value: 'Upper Body' } });

    // Cocher Lundi et Jeudi
    const lundiCheckbox = screen.getByRole('checkbox', { name: /lundi/i });
    const jeudiCheckbox = screen.getByRole('checkbox', { name: /jeudi/i });

    if (lundiCheckbox.getAttribute('aria-checked') !== 'true') {
      fireEvent.click(lundiCheckbox);
    }
    if (jeudiCheckbox.getAttribute('aria-checked') !== 'true') {
      fireEvent.click(jeudiCheckbox);
    }

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Upper Body')).toBeInTheDocument();
      // Doit afficher les jours (ex: Lun, Jeu)
      expect(screen.getByText(/lun/i)).toBeInTheDocument();
      expect(screen.getByText(/jeu/i)).toBeInTheDocument();
    });
  });

  it('edits an existing program (renaming and changing days)', async () => {
    await createProgram({ name: 'Legs', weekdays: [2] }); // Mardi

    render(<ProgramList />);

    await waitFor(() => {
      expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /modifier legs/i });
    fireEvent.click(editBtn);

    expect(
      screen.getByRole('heading', { name: /modifier la séance type/i })
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/nom de la séance type/i);
    expect(nameInput).toHaveValue('Legs');

    fireEvent.change(nameInput, { target: { value: 'Legs & Core' } });

    // Ajouter Samedi (6)
    const samediCheckbox = screen.getByRole('checkbox', { name: /samedi/i });
    fireEvent.click(samediCheckbox);

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Legs & Core')).toBeInTheDocument();
      expect(screen.getByText(/sam/i)).toBeInTheDocument();
    });
  });

  it('deletes a program after confirmation with notice "Les séances passées sont conservées"', async () => {
    await createProgram({ name: 'Cardio', weekdays: [7] });

    render(<ProgramList />);

    await waitFor(() => {
      expect(screen.getByText('Cardio')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /supprimer cardio/i });
    fireEvent.click(deleteBtn);

    // Dialogue d'alerte
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/les séances passées sont conservées/i)
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^supprimer$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cardio')).not.toBeInTheDocument();
    });
  });
});
