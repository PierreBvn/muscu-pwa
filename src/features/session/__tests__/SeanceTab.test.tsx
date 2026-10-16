import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeanceTab } from '../SeanceTab';
import { db } from '../../../db/schema';
import { createProgram, addExerciseToProgram, deleteProgram } from '../../../db/programs';
import { addExercise } from '../../../db/exercises';
import { startSession, addSet, getSession, finishSession } from '../../../db/sessions';

describe('SeanceTab (Tasks 4a & 4b)', () => {
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

  // --- TESTS TÂCHE 4A ---
  it('1. démarre la séance type du jour', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pectoraux', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    render(<SeanceTab />);

    const startBtn = await screen.findByRole('button', { name: /démarrer pectoraux/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Écarté poulie')).toBeInTheDocument();
    });
  });

  it('2. propose la première séance type par nom quand deux séances types sont prévues le même jour', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    await createProgram({ name: 'Zumba Force', weekdays: [1] });
    await createProgram({ name: 'Abdos Flash', weekdays: [1] });

    render(<SeanceTab />);

    const startBtn = await screen.findByRole('button', { name: /démarrer abdos flash/i });
    expect(startBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /démarrer zumba force/i })).not.toBeInTheDocument();
  });

  it('3. propose la séance type d’un dimanche (jour 7)', async () => {
    vi.setSystemTime(new Date(2026, 9, 25, 10, 0, 0));

    await createProgram({ name: 'Séance Dimanche', weekdays: [7] });

    render(<SeanceTab />);

    const startBtn = await screen.findByRole('button', { name: /démarrer séance dimanche/i });
    expect(startBtn).toBeInTheDocument();
  });

  it('4. affiche le message et les options quand aucune séance type n’est prévue aujourd’hui', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));

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
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    const { unmount } = render(<SeanceTab />);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
    });

    unmount();
    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();
    });
  });

  it('7. demande confirmation pour terminer la séance (Annuler laisse en cours, Terminer clôt)', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const sessionId = await startSession({ now: new Date(2026, 9, 19, 10, 0, 0) });

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

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/terminer la séance \?/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terminer la séance/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /terminer la séance/i }));
    const confirmBtn = screen.getByRole('button', { name: /^terminer$/i });
    fireEvent.click(confirmBtn);

    await waitFor(async () => {
      const finished = await getSession(sessionId);
      expect(finished?.endedAt).toBeDefined();
    });
  });

  it('8. clôture d’une séance oubliée avec séries : met endedAt à l’heure de la dernière série', async () => {
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

    vi.setSystemTime(new Date(2026, 9, 19, 8, 0, 0));

    render(<SeanceTab />);

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
    const sessionStartDate = new Date(2026, 9, 17, 10, 0, 0);
    const sessionId = await startSession({ now: sessionStartDate });

    vi.setSystemTime(new Date(2026, 9, 19, 8, 0, 0));

    render(<SeanceTab />);

    const closeBtn = await screen.findByRole('button', { name: /clôturer/i });
    fireEvent.click(closeBtn);

    await waitFor(async () => {
      const deletedSession = await getSession(sessionId);
      expect(deletedSession).toBeUndefined();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /séance libre/i })).toBeInTheDocument();
    });
  });

  it('10. affiche la mention « Séance type supprimée » si le programme n’existe plus', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Dips', muscleGroup: 'Bras' });
    const progId = await createProgram({ name: 'Pectoraux V1', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await deleteProgram(progId);

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText(/séance type supprimée/i)).toBeInTheDocument();
      expect(screen.getByText('Dips')).toBeInTheDocument();
    });
  });

  it('11. affiche le badge « Archivé » pour un exercice archivé présent dans la séance', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Crunch Poulie', muscleGroup: 'Abdominaux' });
    const progId = await createProgram({ name: 'Core', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await db.exercises.update(exId, { archived: true });

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Crunch Poulie')).toBeInTheDocument();
      expect(screen.getByText(/archivé/i)).toBeInTheDocument();
    });
  });

  // --- NOUVEAUX TESTS TÂCHE 4B (SAISIE DES SÉRIES) ---

  it('12. enregistre la série en 1 seul tap avec le poids et les reps suggérés présélectionnés', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    // warmupSets: 0, workSets: 3 pour tester directement la vraie série
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    // Historique passé : 80 kg et 10 reps
    const oldSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: oldSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 80,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(oldSessionId);

    // Nouvelle séance du 19 octobre
    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // 1 seul tap sur le bouton de validation
    const validateBtn = await screen.findByRole('button', { name: /valider série 1/i });
    expect(validateBtn).toBeInTheDocument();

    fireEvent.click(validateBtn);

    // Vérifier l'enregistrement immédiat en base
    await waitFor(async () => {
      const sets = await db.sets.where('sessionId').equals(currentSessionId).toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0].weight).toBe(80);
      expect(sets[0].reps).toBe(10);
      expect(sets[0].type).toBe('work');
    });

    // La ligne validée apparaît dans le DOM
    expect(await screen.findByText(/80 kg/)).toBeInTheDocument();
  });

  it('13. prend le poids de référence dans la séance en cours en priorité', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    // Séance précédente terminée avec 70 kg
    const prevSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: prevSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 70,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(prevSessionId);

    // Séance actuelle : première série déjà effectuée à 75 kg
    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 8,
      weight: 75,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 10, 0),
    });

    render(<SeanceTab />);

    // La prochaine série (Série 2) doit proposer 75 kg en RÉF (séance en cours)
    await waitFor(() => {
      expect(screen.getByText('Prochaine série : Série 2')).toBeInTheDocument();
    });

    const refBtn = screen.getByRole('button', { name: /75/i });
    expect(refBtn).toBeInTheDocument();
    expect(refBtn).toHaveTextContent('RÉF');
  });

  it('14. prend le poids de référence dans la dernière séance terminée si aucune vraie série dans la séance', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    // Séance terminée avec 100 kg
    const prevSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: prevSessionId,
      exerciseId: exId,
      reps: 8,
      weight: 100,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(prevSessionId);

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    await waitFor(() => {
      const refBtn = screen.getByRole('button', { name: /100/i });
      expect(refBtn).toBeInTheDocument();
      expect(refBtn).toHaveTextContent('RÉF');
    });
  });

  it('15. premier entraînement (aucun poids de référence) : ouvre directement la saisie personnalisée', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Oiseau poulie', muscleGroup: 'Épaules' });
    const progId = await createProgram({ name: 'Shoulders', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // L'input personnalisé de poids doit être directement visible
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    expect(weightInput).toBeInTheDocument();

    // Les boutons de répétitions sont disponibles
    expect(screen.getByRole('button', { name: /8 reps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /10 reps/i })).toBeInTheDocument();
  });

  it('16. masque le bouton réf−pas si le résultat est négatif', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    // step par défaut = 2.5 kg, poids de référence = 2 kg -> 2 - 2.5 = -0.5 kg (doit être masqué)
    const exId = await addExercise({ name: 'Élévations latérales', muscleGroup: 'Épaules' });
    const progId = await createProgram({ name: 'Shoulders', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const prevSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: prevSessionId,
      exerciseId: exId,
      reps: 12,
      weight: 2,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(prevSessionId);

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    await waitFor(() => {
      // 2 kg est présent (avec RÉF)
      expect(screen.getByRole('button', { name: /2 kg \(RÉF\)/i })).toBeInTheDocument();
      // Aucun bouton négatif "-0.5"
      expect(screen.queryByRole('button', { name: /-0\.5/i })).not.toBeInTheDocument();
    });
  });

  it('17. arrondit correctement au centième avec un pas de 1,25 kg', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Curl biceps', muscleGroup: 'Bras' });
    await db.exercises.update(exId, { weightStep: 1.25 });

    const progId = await createProgram({ name: 'Arms', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const prevSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: prevSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 20,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(prevSessionId);

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    await waitFor(() => {
      // 20 - 1.25 = 18.75 kg, 20 + 1.25 = 21.25 kg
      expect(screen.getByRole('button', { name: /18\.75/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /21\.25/i })).toBeInTheDocument();
    });
  });

  it('18. saisie « Autre » avec « 82,5 » : remplace la virgule et enregistre 82.5 kg', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    const otherWeightBtn = await screen.findByRole('button', { name: /autre poids/i });
    fireEvent.click(otherWeightBtn);

    const weightInput = screen.getByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: '82,5' } });

    // Sélectionner reps 8
    const rep8Btn = screen.getByRole('button', { name: /8 reps/i });
    fireEvent.click(rep8Btn);

    // Valider
    const validateBtn = screen.getByRole('button', { name: /valider série 1/i });
    fireEvent.click(validateBtn);

    await waitFor(async () => {
      const sets = await db.sets.where('sessionId').equals(currentSessionId).toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0].weight).toBe(82.5);
      expect(sets[0].reps).toBe(8);
    });
  });

  it('19. saisie « Autre » avec « abc » : refusée avec message d’erreur et rien n’est enregistré', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    const otherWeightBtn = await screen.findByRole('button', { name: /autre poids/i });
    fireEvent.click(otherWeightBtn);

    const weightInput = screen.getByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: 'abc' } });

    const rep10Btn = screen.getByRole('button', { name: /10 reps/i });
    fireEvent.click(rep10Btn);

    const validateBtn = screen.getByRole('button', { name: /valider série 1/i });
    fireEvent.click(validateBtn);

    // Message d'erreur
    expect(await screen.findByRole('alert')).toHaveTextContent(/poids invalide/i);

    // Rien en base
    const sets = await db.sets.where('sessionId').equals(currentSessionId).toArray();
    expect(sets).toHaveLength(0);
  });

  it('20. modifie une série enregistrée via la modale', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Tirage vertical', muscleGroup: 'Dos' });
    const progId = await createProgram({ name: 'Back', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    const setId = await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 8,
      weight: 60,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 5, 0),
    });

    render(<SeanceTab />);

    const editBtn = await screen.findByRole('button', { name: /modifier/i });
    fireEvent.click(editBtn);

    // Modale ouverte
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const repsInput = screen.getByLabelText(/répétitions/i);
    fireEvent.change(repsInput, { target: { value: '12' } });

    const saveBtn = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const updatedSet = await db.sets.get(setId);
      expect(updatedSet?.reps).toBe(12);
    });
  });

  it('21. supprime une série enregistrée après confirmation dans le alertdialog', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Tirage horizontal', muscleGroup: 'Dos' });
    const progId = await createProgram({ name: 'Back', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    const setId = await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 55,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 5, 0),
    });

    render(<SeanceTab />);

    const deleteBtn = await screen.findByRole('button', { name: /supprimer/i });
    fireEvent.click(deleteBtn);

    // Dialogue d'alerte de confirmation
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/supprimer la série \?/i)).toBeInTheDocument();

    // Annuler
    const cancelBtn = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    let setInDb = await db.sets.get(setId);
    expect(setInDb).toBeDefined();

    // Re-cliquer sur Supprimer puis confirmer
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
    const confirmBtn = screen.getByRole('button', { name: /^supprimer$/i });
    fireEvent.click(confirmBtn);

    await waitFor(async () => {
      setInDb = await db.sets.get(setId);
      expect(setInDb).toBeUndefined();
    });
  });

  it('22. conserve les séries enregistrées après démontage puis remontage (rechargement)', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Fentes haltères', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 16,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 5, 0),
    });

    const { unmount } = render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText(/16 kg/)).toBeInTheDocument();
    });

    // Simule rechargement de page
    unmount();
    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText(/16 kg/)).toBeInTheDocument();
    });
  });
});
