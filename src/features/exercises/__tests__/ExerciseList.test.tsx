import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { db } from '../../../db/schema';
import { ExerciseList } from '../ExerciseList';

describe('ExerciseList UI component', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('renders the header and seeds default exercises', async () => {
    render(<ExerciseList />);

    expect(
      screen.getByRole('heading', { name: /bibliothèque d’exercices/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Tractions')).toBeInTheDocument();
    });
  });

  it('opens modal, adds a new exercise, and renders it in the list', async () => {
    render(<ExerciseList />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    // Click "+ Ajouter"
    const addButton = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(addButton);

    // Modal is open
    expect(
      screen.getByRole('heading', { name: /nouvel exercice/i })
    ).toBeInTheDocument();

    // Fill name
    const input = screen.getByLabelText(/nom de l’exercice/i);
    expect(input.hasAttribute('autofocus')).toBe(false);
    fireEvent.change(input, { target: { value: 'Hack Squat' } });

    // Select "Quadriceps"
    const quadricepsChip = screen.getByRole('button', { name: 'Quadriceps' });
    fireEvent.click(quadricepsChip);

    // Save
    const saveButton = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveButton);

    // Modal closes and "Hack Squat" appears in UI
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /nouvel exercice/i })
      ).not.toBeInTheDocument();
      expect(screen.getByText('Hack Squat')).toBeInTheDocument();
    });
  });

  it('displays an error message when attempting to add a duplicate exercise', async () => {
    render(<ExerciseList />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(addButton);

    const input = screen.getByLabelText(/nom de l’exercice/i);
    fireEvent.change(input, { target: { value: 'développé couché' } });

    const saveButton = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveButton);

    // Error is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/un exercice nommé "développé couché" existe déjà/i)
      ).toBeInTheDocument();
    });
  });

  it('deletes an exercise after user confirmation', async () => {
    render(<ExerciseList />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    // Click delete icon on "Développé couché"
    const deleteBtn = screen.getByRole('button', {
      name: /supprimer développé couché/i,
    });
    fireEvent.click(deleteBtn);

    // Confirm dialog appears
    expect(
      screen.getByRole('heading', { name: /supprimer l’exercice \?/i })
    ).toBeInTheDocument();

    // Click confirm "Supprimer"
    const confirmDeleteBtn = screen.getByRole('button', {
      name: /^supprimer$/i,
    });
    fireEvent.click(confirmDeleteBtn);

    // Exercise is removed from active list
    await waitFor(() => {
      expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
    });
  });

  it('displays muscle group monograms for exercises', async () => {
    render(<ExerciseList />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    // Pectoraux -> PE, Quadriceps -> QU, Dos -> DO
    expect(screen.getAllByText('PE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QU').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DO').length).toBeGreaterThan(0);
  });
});
