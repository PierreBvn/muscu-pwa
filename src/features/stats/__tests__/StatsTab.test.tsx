import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatsTab } from '../StatsTab';
import { db } from '../../../db/schema';

describe('StatsTab component', () => {
  beforeEach(async () => {
    await db.exercises.clear();
    await db.sessions.clear();
    await db.sets.clear();
  });

  it('affiche uniquement le bouton de choix lorsque aucun exercice n’est sélectionné', () => {
    render(<StatsTab />);

    const selectButton = screen.getByRole('button', { name: /choisir un exercice/i });
    expect(selectButton).toBeInTheDocument();

    expect(screen.queryByText(/aucune séance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('affiche « Aucune séance » lorsqu’un exercice sélectionné n’a aucune séance terminée', async () => {
    await db.exercises.add({
      id: 1,
      name: 'Squat',
      muscleGroup: 'Quadriceps',
      archived: false,
    });

    render(<StatsTab />);

    // Clic pour ouvrir le sélecteur
    const selectButton = screen.getByRole('button', { name: /choisir un exercice/i });
    fireEvent.click(selectButton);

    // Entrer dans la catégorie Quadriceps
    const quadBtn = await screen.findByRole('button', { name: /quadriceps/i });
    fireEvent.click(quadBtn);

    // Sélection de l'exercice Squat
    const squatBtn = await screen.findByRole('button', { name: 'Squat' });
    fireEvent.click(squatBtn);

    // L'exercice est sélectionné et affiche « Aucune séance »
    await waitFor(() => {
      expect(screen.getByText('Aucune séance')).toBeInTheDocument();
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('affiche le résumé exact de l’exemple b de la spec et le graphique', async () => {
    // Exemple b : Développé couché
    // 80 kg × 10 reps, 85 kg × 8 reps, 85 kg × 7 reps
    // Volume = 2075 kg -> '2\u00A0075\u00A0kg'
    // Poids moyen = 83 kg -> '83\u00A0kg'
    // Record = 85 kg × 8 -> 'Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08'
    await db.exercises.add({
      id: 1,
      name: 'Développé couché',
      muscleGroup: 'Pectoraux',
      archived: false,
    });

    await db.sessions.add({
      id: 1,
      date: '2026-10-10',
      startedAt: '2026-10-10T10:00:00.000Z',
      endedAt: '2026-10-10T11:00:00.000Z',
    });

    await db.sets.bulkAdd([
      {
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        order: 1,
        weight: 80,
        reps: 10,
        type: 'work',
        createdAt: '2026-10-10T10:05:00.000Z',
      },
      {
        id: 2,
        sessionId: 1,
        exerciseId: 1,
        order: 2,
        weight: 85,
        reps: 8,
        type: 'work',
        createdAt: '2026-10-10T10:10:00.000Z',
      },
      {
        id: 3,
        sessionId: 1,
        exerciseId: 1,
        order: 3,
        weight: 85,
        reps: 7,
        type: 'work',
        createdAt: '2026-10-10T10:15:00.000Z',
      },
    ]);

    render(<StatsTab />);

    // Ouvrir et choisir Développé couché via Pectoraux
    const selectBtn = screen.getByRole('button', { name: /choisir un exercice/i });
    fireEvent.click(selectBtn);

    const pecBtn = await screen.findByRole('button', { name: /pectoraux/i });
    fireEvent.click(pecBtn);

    const benchBtn = await screen.findByRole('button', { name: 'Développé couché' });
    fireEvent.click(benchBtn);

    // Vérification des chaînes exactes attendues avec U+00A0 préservé
    await waitFor(() => {
      expect(
        screen.getByText('83\u00A0kg', { normalizer: (s) => s })
      ).toBeInTheDocument();
      expect(
        screen.getByText('2\u00A0075\u00A0kg', { normalizer: (s) => s })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08', {
          normalizer: (s) => s,
        })
      ).toBeInTheDocument();
    });

    // Présence du graphique
    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('aria-label')).toContain('Développé couché');
  });
});
