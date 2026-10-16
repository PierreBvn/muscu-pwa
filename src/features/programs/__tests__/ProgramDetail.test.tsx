import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProgramDetail } from '../ProgramDetail';
import { db } from '../../../db/schema';
import { createProgram, addExerciseToProgram } from '../../../db/programs';
import { addExercise } from '../../../db/exercises';

describe('ProgramDetail UI', () => {
  let programId: number;
  let exBenchId: number;
  let exSquatId: number;
  let exDeadliftId: number;

  beforeEach(async () => {
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();

    programId = await createProgram({ name: 'Full Body A', weekdays: [1, 3, 5] });
    exBenchId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    exSquatId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
    exDeadliftId = await addExercise({ name: 'Soulevé de terre', muscleGroup: 'Dos' });
  });

  it('renders program header and empty exercises list', async () => {
    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /full body a/i })).toBeInTheDocument();
      expect(screen.getByText(/aucun exercice dans ce programme/i)).toBeInTheDocument();
    });
  });

  it('adds an exercise with default warmupSets=1 and workSets=3', async () => {
    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /full body a/i })).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /ajouter un exercice/i });
    fireEvent.click(addBtn);

    // Modal/dialogue d'ajout ouvert
    expect(screen.getByRole('heading', { name: /ajouter un exercice/i })).toBeInTheDocument();

    const benchOption = screen.getByRole('button', { name: /développé couché/i });
    fireEvent.click(benchOption);

    // Exercice ajouté dans la liste
    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText(/échauffement : 1/i)).toBeInTheDocument();
      expect(screen.getByText(/travail : 3/i)).toBeInTheDocument();
    });
  });

  it('filters out exercises already present in the program from the add selector', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /ajouter/i });
    fireEvent.click(addBtn);

    const dialog = screen.getByRole('dialog');
    // Développé couché ne doit PAS être disponible dans le sélecteur
    expect(within(dialog).queryByText('Développé couché')).not.toBeInTheDocument();
    // Squat et Soulevé de terre doivent l'être
    expect(within(dialog).getByText('Squat')).toBeInTheDocument();
    expect(within(dialog).getByText('Soulevé de terre')).toBeInTheDocument();
  });

  it('enforces warmupSets bounds (0 to 4, default 1)', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    const minusWarmup = screen.getByRole('button', {
      name: /diminuer séries d’échauffement développé couché/i,
    });
    const plusWarmup = screen.getByRole('button', {
      name: /augmenter séries d’échauffement développé couché/i,
    });

    // De 1 à 0
    fireEvent.click(minusWarmup);
    await waitFor(() => {
      expect(screen.getByText(/échauffement : 0/i)).toBeInTheDocument();
      expect(minusWarmup).toBeDisabled();
    });

    // Monter jusqu'à 4
    for (let i = 1; i <= 4; i++) {
      fireEvent.click(plusWarmup);
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`échauffement : ${i}`, 'i'))).toBeInTheDocument();
      });
    }

    await waitFor(() => {
      expect(plusWarmup).toBeDisabled();
    });
  });

  it('enforces workSets bounds (1 to 6, default 3)', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    const minusWork = screen.getByRole('button', {
      name: /diminuer séries de travail développé couché/i,
    });
    const plusWork = screen.getByRole('button', {
      name: /augmenter séries de travail développé couché/i,
    });

    // De 3 à 1
    fireEvent.click(minusWork);
    await waitFor(() => {
      expect(screen.getByText(/travail : 2/i)).toBeInTheDocument();
    });

    fireEvent.click(minusWork);
    await waitFor(() => {
      expect(screen.getByText(/travail : 1/i)).toBeInTheDocument();
      expect(minusWork).toBeDisabled();
    });

    // Monter jusqu'à 6
    for (let i = 2; i <= 6; i++) {
      fireEvent.click(plusWork);
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`travail : ${i}`, 'i'))).toBeInTheDocument();
      });
    }

    await waitFor(() => {
      expect(plusWork).toBeDisabled();
    });
  });

  it('handles reordering with ↑ disabled on first and ↓ disabled on last', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });
    await addExerciseToProgram({ programId, exerciseId: exSquatId });
    await addExerciseToProgram({ programId, exerciseId: exDeadliftId });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Soulevé de terre')).toBeInTheDocument();
    });

    const upBench = screen.getByRole('button', { name: /monter développé couché/i });
    const downDeadlift = screen.getByRole('button', { name: /descendre soulevé de terre/i });

    // Le premier (Développé couché) a ↑ désactivé
    expect(upBench).toBeDisabled();
    // Le dernier (Soulevé de terre) a ↓ désactivé
    expect(downDeadlift).toBeDisabled();

    // Descendre Développé couché (il passe en 2e position après Squat)
    const downBench = screen.getByRole('button', { name: /descendre développé couché/i });
    expect(downBench).not.toBeDisabled();
    fireEvent.click(downBench);

    await waitFor(() => {
      // Maintenant Développé couché est au milieu : son bouton ↑ doit être activé
      expect(screen.getByRole('button', { name: /monter développé couché/i })).not.toBeDisabled();
    });
  });

  it('removes an exercise from program', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /retirer développé couché/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Développé couché')).not.toBeInTheDocument();
      expect(screen.getByText(/aucun exercice dans ce programme/i)).toBeInTheDocument();
    });
  });

  it('displays "Archivé" badge if exercise was archived', async () => {
    await addExerciseToProgram({ programId, exerciseId: exBenchId });
    // Archiver Développé couché
    await db.exercises.update(exBenchId, { archived: true });

    render(<ProgramDetail programId={programId} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText(/archivé/i)).toBeInTheDocument();
    });
  });
});
