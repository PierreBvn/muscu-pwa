import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SeanceTab } from '../SeanceTab';
import { db } from '../../../db/schema';
import { addExercise } from '../../../db/exercises';
import { createProgram, addExerciseToProgram } from '../../../db/programs';
import { startSession } from '../../../db/sessions';
import { saveSettings } from '../../../settings';
import { getStoredTimer, saveTimer } from '../../../timer';
import * as audioModule from '../../../audio';

describe('Minuteur de repos dans la vue Séance (Intégration)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    window.localStorage.clear();
    await db.sessions.clear();
    await db.sessionExercises.clear();
    await db.sets.clear();
    await db.programs.clear();
    await db.programExercises.clear();
    await db.exercises.clear();
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('déclenche le minuteur avec la durée de getSettings().restSeconds à la validation d’une série', async () => {
    saveSettings({
      restSeconds: 90,
      restSound: true,
      keepAwake: true,
    });

    const unlockAudioSpy = vi.spyOn(audioModule, 'unlockAudio');

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, workSets: 3, warmupSets: 0 });

    const sessionId = await startSession({
      programId: progId,
      now: new Date(2026, 9, 19, 10, 0, 0),
    });

    render(<SeanceTab />);

    // Renseigner poids et répétitions
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: '80' } });
    const repBtn = screen.getByRole('button', { name: /10 reps/i });
    fireEvent.click(repBtn);

    const validerBtn = screen.getByRole('button', { name: /valider série 1/i });
    await act(async () => {
      fireEvent.click(validerBtn);
    });

    // L'audio doit avoir été débloqué lors du tap
    expect(unlockAudioSpy).toHaveBeenCalled();

    // Le bandeau de repos doit être affiché avec 90 s (1:30)
    const banner = await screen.findByRole('region', { name: /minuteur de repos/i });
    expect(banner).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();

    // Vérification de la persistance dans localStorage
    const stored = getStoredTimer();
    expect(stored).not.toBeNull();
    expect(stored?.sessionId).toBe(sessionId);
    expect(stored?.endsAt).toBe(new Date(2026, 9, 19, 10, 0, 0).getTime() + 90_000);
  });

  it('permet d’ajouter 30 s au minuteur en cours', async () => {
    saveSettings({
      restSeconds: 60,
      restSound: true,
      keepAwake: true,
    });

    const exId = await addExercise({ name: 'Squat', muscleGroup: 'Quadriceps' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, workSets: 3, warmupSets: 0 });

    await startSession({
      programId: progId,
      now: new Date(2026, 9, 19, 10, 0, 0),
    });

    render(<SeanceTab />);

    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: '100' } });
    const repBtn = screen.getByRole('button', { name: /8 reps/i });
    fireEvent.click(repBtn);

    const validerBtn = screen.getByRole('button', { name: /valider série 1/i });
    await act(async () => {
      fireEvent.click(validerBtn);
    });

    expect(await screen.findByText('1:00')).toBeInTheDocument();

    const add30Btn = screen.getByRole('button', { name: /ajouter 30 secondes/i });
    act(() => {
      fireEvent.click(add30Btn);
    });

    // Le temps doit être passé à 1:30
    expect(screen.getByText('1:30')).toBeInTheDocument();

    const stored = getStoredTimer();
    expect(stored?.endsAt).toBe(new Date(2026, 9, 19, 10, 0, 0).getTime() + 90_000);
  });

  it('permet de passer le repos immédiatement', async () => {
    saveSettings({
      restSeconds: 120,
      restSound: true,
      keepAwake: true,
    });

    const exId = await addExercise({ name: 'Tirage', muscleGroup: 'Dos' });
    const progId = await createProgram({ name: 'Dos', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, workSets: 3, warmupSets: 0 });

    await startSession({
      programId: progId,
      now: new Date(2026, 9, 19, 10, 0, 0),
    });

    render(<SeanceTab />);

    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: '60' } });
    const repBtn = screen.getByRole('button', { name: /10 reps/i });
    fireEvent.click(repBtn);

    const validerBtn = screen.getByRole('button', { name: /valider série 1/i });
    await act(async () => {
      fireEvent.click(validerBtn);
    });

    expect(await screen.findByRole('region', { name: /minuteur de repos/i })).toBeInTheDocument();

    const skipBtn = screen.getByRole('button', { name: /passer le temps de repos/i });
    act(() => {
      fireEvent.click(skipBtn);
    });

    expect(screen.queryByRole('region', { name: /minuteur de repos/i })).not.toBeInTheDocument();
    expect(getStoredTimer()).toBeNull();
  });

  it('reprend un minuteur non expiré au chargement de la séance', async () => {
    const exId = await addExercise({ name: 'Presse', muscleGroup: 'Quadriceps' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, workSets: 3, warmupSets: 0 });

    const sessionId = await startSession({
      programId: progId,
      now: new Date(2026, 9, 19, 10, 0, 0),
    });

    // Minuteur déjà présent en localStorage : reste 45 secondes
    saveTimer({
      sessionId,
      endsAt: new Date(2026, 9, 19, 10, 0, 0).getTime() + 45_000,
    });

    render(<SeanceTab />);

    const banner = await screen.findByRole('region', { name: /minuteur de repos/i });
    expect(banner).toBeInTheDocument();
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('efface le minuteur lors de la clôture de la séance', async () => {
    const exId = await addExercise({ name: 'Curl', muscleGroup: 'Biceps' });
    const progId = await createProgram({ name: 'Bras', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, workSets: 1, warmupSets: 0 });

    const sessionId = await startSession({
      programId: progId,
      now: new Date(2026, 9, 19, 10, 0, 0),
    });

    saveTimer({
      sessionId,
      endsAt: new Date(2026, 9, 19, 10, 0, 0).getTime() + 60_000,
    });

    render(<SeanceTab />);

    expect(await screen.findByRole('region', { name: /minuteur de repos/i })).toBeInTheDocument();

    // Terminer la séance
    const finishBtn = screen.getByRole('button', { name: /terminer la séance/i });
    fireEvent.click(finishBtn);

    const confirmBtn = await screen.findByRole('button', { name: 'Terminer' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(getStoredTimer()).toBeNull();
  });
});
