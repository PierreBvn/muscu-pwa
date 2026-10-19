import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartSessionView } from '../StartSessionView';
import type { HomeSummary } from '../../../db/homeSummary';
import type { ProgramWithSummary } from '../../../db/programs';

describe('StartSessionView', () => {
  const mockProgram: ProgramWithSummary = {
    id: 42,
    name: 'Pectoraux & Bras',
    weekdays: [1, 4],
    exerciseCount: 4,
    exerciseCountText: '4 exercices',
    muscleGroups: ['Pectoraux', 'Triceps', 'Biceps'],
    muscleGroupsText: 'Pectoraux, Triceps, Biceps',
    summaryText: 'Pectoraux · Triceps · Biceps · 4 exos',
  };

  const normalSummary: HomeSummary = {
    headerDate: 'lundi 19 octobre',
    weeklySessionsCount: 3,
    weeklySessionsText: 'Cette semaine : 3 séances',
    nextProgram: {
      program: mockProgram,
      exerciseCount: 4,
      exerciseCountText: '4 exercices',
      muscleGroups: ['Pectoraux', 'Triceps', 'Biceps'],
      muscleGroupsText: 'Pectoraux, Triceps, Biceps',
      summaryText: 'Pectoraux · Triceps · Biceps · 4 exos',
      daysAgo: 4,
      lastDoneText: 'Dernière fois : il y a 4 j',
    },
  };

  const emptySummary: HomeSummary = {
    headerDate: 'lundi 19 octobre',
    weeklySessionsCount: 0,
    weeklySessionsText: 'Cette semaine : 0 séance',
    nextProgram: null,
  };

  it('affiche le cas normal avec l’en-tête, la carte prochaine séance, la ligne de semaine et les 3 boutons', () => {
    render(
      <StartSessionView
        summary={normalSummary}
        allPrograms={[mockProgram]}
        onStartProgram={vi.fn().mockResolvedValue(undefined)}
        onStartFreeSession={vi.fn().mockResolvedValue(undefined)}
        onOpenSettings={vi.fn()}
      />
    );

    // En-tête
    expect(screen.getByRole('heading', { level: 1, name: 'Séance' })).toBeInTheDocument();
    expect(screen.getByText('lundi 19 octobre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paramètres' })).toBeInTheDocument();

    // Ligne semaine
    expect(screen.getByText('Cette semaine : 3 séances')).toBeInTheDocument();

    // Carte prochaine séance
    expect(screen.getByRole('region', { name: 'Prochaine séance' })).toBeInTheDocument();
    expect(screen.getByText('Pectoraux & Bras')).toBeInTheDocument();
    expect(screen.getByText('4 exercices')).toBeInTheDocument();
    expect(screen.getByText('Dernière fois : il y a 4 j')).toBeInTheDocument();
    expect(screen.getByText('Pectoraux')).toBeInTheDocument();
    expect(screen.getByText('Triceps')).toBeInTheDocument();
    expect(screen.getByText('Biceps')).toBeInTheDocument();

    // Boutons
    expect(screen.getByRole('button', { name: 'Autre séance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Séance libre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer Pectoraux & Bras' })).toBeInTheDocument();
  });

  it('déclenche onStartProgram lors du clic sur le bouton principal Démarrer', async () => {
    const handleStartProgram = vi.fn().mockResolvedValue(undefined);

    render(
      <StartSessionView
        summary={normalSummary}
        allPrograms={[mockProgram]}
        onStartProgram={handleStartProgram}
        onStartFreeSession={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer Pectoraux & Bras' }));
    expect(handleStartProgram).toHaveBeenCalledWith(42);
  });

  it('déclenche onStartFreeSession lors du clic sur Séance libre', async () => {
    const handleStartFreeSession = vi.fn().mockResolvedValue(undefined);

    render(
      <StartSessionView
        summary={normalSummary}
        allPrograms={[mockProgram]}
        onStartProgram={vi.fn()}
        onStartFreeSession={handleStartFreeSession}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Séance libre' }));
    expect(handleStartFreeSession).toHaveBeenCalled();
  });

  it('ouvre les paramètres lors du clic sur le bouton ⚙', () => {
    const handleOpenSettings = vi.fn();

    render(
      <StartSessionView
        summary={normalSummary}
        allPrograms={[mockProgram]}
        onStartProgram={vi.fn()}
        onStartFreeSession={vi.fn()}
        onOpenSettings={handleOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Paramètres' }));
    expect(handleOpenSettings).toHaveBeenCalled();
  });

  it('ouvre la modale de sélection de programme lors du clic sur Autre séance', () => {
    const p1: ProgramWithSummary = {
      id: 1,
      name: 'Dos & Épaules',
      weekdays: [2],
      exerciseCount: 3,
      exerciseCountText: '3 exercices',
      muscleGroups: ['Dos', 'Épaules'],
      muscleGroupsText: 'Dos, Épaules',
      summaryText: 'Dos · Épaules · 3 exos',
    };
    const p2: ProgramWithSummary = {
      id: 2,
      name: 'Jambes',
      weekdays: [5],
      exerciseCount: 0,
      exerciseCountText: '0 exercice',
      muscleGroups: [],
      muscleGroupsText: '',
      summaryText: 'Aucun exercice',
    };

    render(
      <StartSessionView
        summary={normalSummary}
        allPrograms={[p1, p2]}
        onStartProgram={vi.fn()}
        onStartFreeSession={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Autre séance' }));

    // La modale ProgramPickerModal s'ouvre
    expect(screen.getByRole('dialog', { name: /choisir une séance type/i })).toBeInTheDocument();
    expect(screen.getByText('Dos & Épaules')).toBeInTheDocument();
    expect(screen.getByText('Dos · Épaules · 3 exos')).toBeInTheDocument();
    expect(screen.getByText('Jambes')).toBeInTheDocument();
    expect(screen.getByText('Aucun exercice')).toBeInTheDocument();
  });

  it('affiche l’état base vide quand aucun programme n’existe', () => {
    const handleCreateProgram = vi.fn();
    const handleStartFree = vi.fn().mockResolvedValue(undefined);

    render(
      <StartSessionView
        summary={emptySummary}
        allPrograms={[]}
        onStartProgram={vi.fn()}
        onStartFreeSession={handleStartFree}
        onCreateProgram={handleCreateProgram}
      />
    );

    expect(screen.getByText('lundi 19 octobre')).toBeInTheDocument();
    expect(screen.getByText('Cette semaine : 0 séance')).toBeInTheDocument();
    expect(screen.getByText('Aucune séance type enregistrée')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: 'Créer une séance type' });
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(handleCreateProgram).toHaveBeenCalled();

    const freeBtn = screen.getByRole('button', { name: 'Séance libre' });
    expect(freeBtn).toBeInTheDocument();
    fireEvent.click(freeBtn);
    expect(handleStartFree).toHaveBeenCalled();
  });
});
