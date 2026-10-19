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

  it('affiche le contrôle segmenté avec Général sélectionné par défaut', () => {
    render(<StatsTab />);

    const generalTab = screen.getByRole('tab', { name: /général/i });
    const musclesTab = screen.getByRole('tab', { name: /muscles/i });
    const exercisesTab = screen.getByRole('tab', { name: /exercices/i });

    expect(generalTab).toBeInTheDocument();
    expect(musclesTab).toBeInTheDocument();
    expect(exercisesTab).toBeInTheDocument();

    expect(generalTab).toHaveAttribute('aria-selected', 'true');
    expect(musclesTab).toHaveAttribute('aria-selected', 'false');
    expect(exercisesTab).toHaveAttribute('aria-selected', 'false');
  });

  it('vue Général : affiche « Aucune séance » lorsqu’il n’y a aucune donnée', async () => {
    render(<StatsTab />);

    await waitFor(() => {
      expect(screen.getByText('Aucune séance')).toBeInTheDocument();
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('vue Général : affiche la progression et la courbe sur 8 semaines lorsqu’il y a des séances', async () => {
    await db.exercises.add({
      id: 1,
      name: 'Développé couché',
      muscleGroup: 'Pectoraux',
      archived: false,
    });

    // Séance terminée
    const today = new Date().toISOString().slice(0, 10);
    await db.sessions.add({
      id: 1,
      date: today,
      startedAt: `${today}T10:00:00.000Z`,
      endedAt: `${today}T11:00:00.000Z`,
    });

    await db.sets.add({
      id: 1,
      sessionId: 1,
      exerciseId: 1,
      order: 1,
      weight: 80,
      reps: 10,
      type: 'work',
      createdAt: `${today}T10:05:00.000Z`,
    });

    render(<StatsTab />);

    await waitFor(() => {
      expect(screen.getByText('Progression')).toBeInTheDocument();
      // Première semaine -> index = 100 -> variation 0,0 %
      expect(
        screen.getByText('0,0\u00A0%', { normalizer: (s) => s })
      ).toBeInTheDocument();
    });

    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
  });

  it('vue Muscles : affiche la grille des 11 groupes avec leur indice puis permet d’ouvrir le détail', async () => {
    await db.exercises.add({
      id: 1,
      name: 'Développé couché',
      muscleGroup: 'Pectoraux',
      archived: false,
    });

    const today = new Date().toISOString().slice(0, 10);
    await db.sessions.add({
      id: 1,
      date: today,
      startedAt: `${today}T10:00:00.000Z`,
      endedAt: `${today}T11:00:00.000Z`,
    });

    await db.sets.add({
      id: 1,
      sessionId: 1,
      exerciseId: 1,
      order: 1,
      weight: 80,
      reps: 10,
      type: 'work',
      createdAt: `${today}T10:05:00.000Z`,
    });

    render(<StatsTab />);

    // Basculer vers l'onglet Muscles
    const musclesTab = screen.getByRole('tab', { name: /muscles/i });
    fireEvent.click(musclesTab);

    // Grille présente avec Pectoraux affichant 0,0 %
    const pecButton = await screen.findByRole('button', { name: /pectoraux/i });
    expect(pecButton).toBeInTheDocument();

    // Cliquer sur Pectoraux pour ouvrir son détail
    fireEvent.click(pecButton);

    // Titre Pectoraux et bouton retour
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Pectoraux' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retour à la grille des muscles/i })).toBeInTheDocument();
      expect(screen.getByText('Cette semaine')).toBeInTheDocument();
      expect(screen.getAllByText('1\u00A0série', { normalizer: (s) => s }).length).toBeGreaterThanOrEqual(1);
    });

    // Retour à la grille
    const backBtn = screen.getByRole('button', { name: /retour à la grille des muscles/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pectoraux/i })).toBeInTheDocument();
    });
  });

  it('vue Exercices : affiche le sélecteur, puis le résumé et la courbe', async () => {
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

    // Basculer vers l'onglet Exercices
    const exercisesTab = screen.getByRole('tab', { name: /exercices/i });
    fireEvent.click(exercisesTab);

    // Bouton de choix
    const selectBtn = screen.getByRole('button', { name: /choisir un exercice/i });
    fireEvent.click(selectBtn);

    const pecBtn = await screen.findByRole('button', { name: /pectoraux/i });
    fireEvent.click(pecBtn);

    const benchBtn = await screen.findByRole('button', { name: 'Développé couché' });
    fireEvent.click(benchBtn);

    // Vérification des chaînes exactes attendues
    await waitFor(() => {
      expect(
        screen.getByText('83\u00A0kg', { normalizer: (s) => s })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08', {
          normalizer: (s) => s,
        })
      ).toBeInTheDocument();
    });

    const chart = screen.getByRole('img');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('aria-label')).toContain('Développé couché');
  });
});
