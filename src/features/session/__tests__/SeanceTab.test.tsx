import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeanceTab } from '../SeanceTab';
import { db } from '../../../db/schema';
import { createProgram, addExerciseToProgram, deleteProgram } from '../../../db/programs';
import { addExercise } from '../../../db/exercises';
import { startSession, addSet, getSession } from '../../../db/sessions';

describe('SeanceTab (Task 4a)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await db.sessions.clear();
    await db.sessionExercises.clear();
    await db.sets.clear();
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. démarre la séance type du jour', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pectoraux', weekdays: [1] }); // 1 = Lundi
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    render(<SeanceTab />);

    // Attendre l'affichage du bouton de démarrage
    const startBtn = await screen.findByRole('button', { name: /démarrer pectoraux/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);

    // Vérifier le basculement vers la séance en cours
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Écarté poulie')).toBeInTheDocument();
    });
  });

  it('2. propose la première séance type par nom quand deux séances types sont prévues le même jour', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    await createProgram({ name: 'Zumba Force', weekdays: [1] });
    await createProgram({ name: 'Abdos Flash', weekdays: [1] });

    render(<SeanceTab />);

    // Doit proposer "Abdos Flash" en priorité alphabétique
    const startBtn = await screen.findByRole('button', { name: /démarrer abdos flash/i });
    expect(startBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /démarrer zumba force/i })).not.toBeInTheDocument();
  });

  it('3. propose la séance type d’un dimanche (jour 7)', async () => {
    // Dimanche 25 octobre 2026 (toWeekday = 7)
    vi.setSystemTime(new Date(2026, 9, 25, 10, 0, 0));

    await createProgram({ name: 'Séance Dimanche', weekdays: [7] });

    render(<SeanceTab />);

    const startBtn = await screen.findByRole('button', { name: /démarrer séance dimanche/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('4. affiche le message et les options quand aucune séance type n’est prévue aujourd’hui', async () => {
    // Mercredi 21 octobre 2026 (weekday = 3)
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));

    // Programme existant uniquement le Lundi (1)
    await createProgram({ name: 'Full Body', weekdays: [1] });

    render(<SeanceTab />);

    await waitFor(() => {
      expect(
        screen.getByText(/aucune séance type prévue aujourd’hui/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /choisir une séance type/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /séance libre/i })).toBeInTheDocument();
  });

  it('5. permet de démarrer une séance libre', async () => {
    // Mercredi 21 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));

    render(<SeanceTab />);

    const freeBtn = await screen.findByRole('button', { name: /séance libre/i });
    fireEvent.click(freeBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
      expect(screen.getByText(/séance libre/i)).toBeInTheDocument();
    });
  });

  it('6. reprend automatiquement la séance après un nouveau rendu (simule un rechargement)', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    // Démarrer la séance directement en base
    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    // Premier rendu
    const { unmount } = render(<SeanceTab />);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
    });

    // Simuler le démontage et re-rendu (rechargement)
    unmount();
    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
    });
  });

  it('7. demande confirmation pour terminer la séance (Annuler laisse en cours, Terminer clôt)', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const sessionId = await startSession({ now: new Date(2026, 9, 19, 10, 0, 0) });

    // Ajouter une série pour que la séance soit complétée (avec endedAt) et non supprimée
    await addSet({
      sessionId,
      exerciseId: exId,
      reps: 8,
      weight: 60,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 15, 0),
    });

    render(<SeanceTab />);

    const finishBtn = await screen.findByRole('button', { name: /terminer la séance/i });
    fireEvent.click(finishBtn);

    // Vérifier l'apparition du dialogue de confirmation
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/terminer la séance \?/i)).toBeInTheDocument();

    // Cliquer sur Annuler
    const cancelBtn = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelBtn);

    // Le dialogue disparaît et la séance reste en cours
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();

    // Rouvrir et confirmer
    fireEvent.click(screen.getByRole('button', { name: /terminer la séance/i }));
    const confirmBtn = screen.getByRole('button', { name: /^terminer$/i });
    fireEvent.click(confirmBtn);

    await waitFor(async () => {
      const finished = await getSession(sessionId);
      expect(finished?.endedAt).toBeDefined();
    });
  });

  it('8. clôture d’une séance oubliée avec séries : met endedAt à l’heure de la dernière série', async () => {
    // Séance créée le Samedi 17 octobre 2026 à 10h00
    const sessionStartDate = new Date(2026, 9, 17, 10, 0, 0);
    const setDate = new Date(2026, 9, 17, 10, 30, 0);

    const exId = await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });
    const sessionId = await startSession({ now: sessionStartDate });

    await addSet({
      sessionId,
      exerciseId: exId,
      reps: 10,
      weight: 0,
      type: 'work',
      now: setDate,
    });

    // On ouvre l'app le Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 8, 0, 0));

    render(<SeanceTab />);

    // Doit proposer "Reprendre" ou "Clôturer"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reprendre/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clôturer/i })).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /clôturer/i });
    fireEvent.click(closeBtn);

    await waitFor(async () => {
      const updated = await getSession(sessionId);
      expect(updated?.endedAt).toBe(setDate.toISOString());
    });
  });

  it('9. clôture d’une séance oubliée sans série : supprime la séance et revient à l’écran de démarrage', async () => {
    // Séance créée le Samedi 17 octobre 2026 à 10h00 sans aucune série
    const sessionStartDate = new Date(2026, 9, 17, 10, 0, 0);
    const sessionId = await startSession({ now: sessionStartDate });

    // On ouvre l'app le Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 8, 0, 0));

    render(<SeanceTab />);

    const closeBtn = await screen.findByRole('button', { name: /clôturer/i });
    fireEvent.click(closeBtn);

    // La séance doit être supprimée de la base
    await waitFor(async () => {
      const deletedSession = await getSession(sessionId);
      expect(deletedSession).toBeUndefined();
    });

    // L'UI doit revenir à l'écran de démarrage
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /séance libre/i })).toBeInTheDocument();
    });
  });

  it('10. affiche la mention « Séance type supprimée » si le programme n’existe plus', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Dips', muscleGroup: 'Bras' });
    const progId = await createProgram({ name: 'Pectoraux V1', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    // On supprime le programme
    await deleteProgram(progId);

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText(/séance type supprimée/i)).toBeInTheDocument();
      expect(screen.getByText('Dips')).toBeInTheDocument();
    });
  });

  it('11. affiche le badge « Archivé » pour un exercice archivé présent dans la séance', async () => {
    // Lundi 19 octobre 2026
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Crunch Poulie', muscleGroup: 'Abdominaux' });
    const progId = await createProgram({ name: 'Core', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    // Archiver l'exercice
    await db.exercises.update(exId, { archived: true });

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Crunch Poulie')).toBeInTheDocument();
      expect(screen.getByText(/archivé/i)).toBeInTheDocument();
    });
  });
});
