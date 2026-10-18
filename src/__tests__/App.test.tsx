import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { db } from '../db/schema';

describe('App navigation & TabBar', () => {
  beforeEach(async () => {
    await db.exercises.clear();
    await db.programs.clear();
  });

  it('renders bottom tab bar with 4 tabs and defaults to Séance', async () => {
    render(<App />);

    const tablist = screen.getByRole('tablist', { name: /navigation principale/i });
    expect(tablist).toBeInTheDocument();

    const seanceTab = screen.getByRole('tab', { name: /^séance$/i });
    const programsTab = screen.getByRole('tab', { name: /séances types/i });
    const exercisesTab = screen.getByRole('tab', { name: /exercices/i });
    const progressTab = screen.getByRole('tab', { name: /progrès/i });

    expect(seanceTab).toBeInTheDocument();
    expect(programsTab).toBeInTheDocument();
    expect(exercisesTab).toBeInTheDocument();
    expect(progressTab).toBeInTheDocument();

    expect(seanceTab).toHaveAttribute('aria-selected', 'true');
    expect(programsTab).toHaveAttribute('aria-selected', 'false');
    expect(exercisesTab).toHaveAttribute('aria-selected', 'false');
    expect(progressTab).toHaveAttribute('aria-selected', 'false');

    // Écran Séance actif (attente résolution useLiveQuery)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /séance/i })).toBeInTheDocument();
    });
  });

  it('navigates to Exercices and back to Séance', async () => {
    render(<App />);

    const exercisesTab = screen.getByRole('tab', { name: /exercices/i });
    fireEvent.click(exercisesTab);

    expect(exercisesTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /bibliothèque d’exercices/i })
      ).toBeInTheDocument();
    });

    const seanceTab = screen.getByRole('tab', { name: /^séance$/i });
    fireEvent.click(seanceTab);

    expect(seanceTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /séance/i })).toBeInTheDocument();
    });
  });

  it('navigates to Séances types tab', () => {
    render(<App />);

    const programsTab = screen.getByRole('tab', { name: /séances types/i });
    fireEvent.click(programsTab);

    expect(programsTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { name: /séances types/i })
    ).toBeInTheDocument();
  });

  it('navigates to Progrès tab', async () => {
    render(<App />);

    const progressTab = screen.getByRole('tab', { name: /progrès/i });
    fireEvent.click(progressTab);

    expect(progressTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /progrès/i })).toBeInTheDocument();
    });
  });
});
