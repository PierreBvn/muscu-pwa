import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeanceTab } from '../SeanceTab';
import { db } from '../../../db/schema';
import { createProgram, addExerciseToProgram, deleteProgram, getProgramWithExercises } from '../../../db/programs';
import { addExercise } from '../../../db/exercises';
import { startSession, addSet, getSession, finishSession, getSessionExercises } from '../../../db/sessions';

describe('SeanceTab (Tasks 4a, 4b & 4c)', () => {
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

    // La prochaine série (Série 2) doit proposer 75 kg en référence (séance en cours)
    await waitFor(() => {
      expect(screen.getByText('Série 2')).toBeInTheDocument();
    });

    const refBtn = screen.getByRole('button', { name: '75 kg' });
    expect(refBtn).toBeInTheDocument();
    expect(refBtn).not.toHaveTextContent('RÉF');
    expect(screen.queryByText(/réf/i)).not.toBeInTheDocument();
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
      const refBtn = screen.getByRole('button', { name: '100 kg' });
      expect(refBtn).toBeInTheDocument();
      expect(refBtn).not.toHaveTextContent('RÉF');
      expect(screen.queryByText(/réf/i)).not.toBeInTheDocument();
    });
  });

  it('15. premier entraînement (aucun poids de référence) : ouvre directement la saisie personnalisée sans bouton Autre', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Oiseau poulie', muscleGroup: 'Épaules' });
    const progId = await createProgram({ name: 'Shoulders', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // L'input personnalisé de poids doit être directement visible
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    expect(weightInput).toBeInTheDocument();

    // Aucun bouton "Autre" pour le poids
    expect(screen.queryByRole('button', { name: /autre poids/i })).not.toBeInTheDocument();

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
      // 2 kg est présent
      expect(screen.getByRole('button', { name: '2 kg' })).toBeInTheDocument();
      // Aucun texte RÉF
      expect(screen.queryByText(/réf/i)).not.toBeInTheDocument();
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

  it('18. saisie personnalisée sans suggestion avec « 82,5 » : remplace la virgule et enregistre 82.5 kg', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Sans suggestion : le champ est affiché directement sans bouton "Autre"
    expect(screen.queryByRole('button', { name: /autre poids/i })).not.toBeInTheDocument();
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
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

  it('18b. bouton « Autre » présent quand des suggestions existent', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    // Poids d'historique 80 kg
    const prevSessionId = await startSession({ now: new Date(2026, 9, 12, 10, 0, 0) });
    await addSet({
      sessionId: prevSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 80,
      type: 'work',
      now: new Date(2026, 9, 12, 10, 30, 0),
    });
    await finishSession(prevSessionId);

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Le bouton "Autre" est présent à côté des suggestions
    const otherWeightBtn = await screen.findByRole('button', { name: /autre poids/i });
    expect(otherWeightBtn).toBeInTheDocument();
    fireEvent.click(otherWeightBtn);

    const weightInput = screen.getByLabelText(/poids personnalisé/i);
    expect(weightInput).toBeInTheDocument();
  });

  it('19. saisie personnalisée avec « abc » : refusée avec message d’erreur et rien n’est enregistré', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé incliné', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Push', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Sans suggestion : input direct
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
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

  // --- NOUVEAUX TESTS TÂCHE 4C (ORGANISER LA SÉANCE EN COURS) ---

  it('23. séance libre : ajout de 2 exercices puis saisie d’une série', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    await addExercise({ name: 'Écarté poulie', muscleGroup: 'Pectoraux' });

    // Démarrer une séance libre (0 exercice)
    const sessionId = await startSession({ now: new Date(2026, 9, 21, 10, 0, 0) });

    render(<SeanceTab />);

    // Clic sur Ajouter un premier exercice
    const addFirstBtn = await screen.findByRole('button', { name: /ajouter un premier exercice/i });
    fireEvent.click(addFirstBtn);

    // Modale d'ajout
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const selectEx1 = await screen.findByRole('button', { name: /développé couché/i });
    fireEvent.click(selectEx1);

    // L'exercice 1 est ajouté, on clique maintenant sur "+ Ajouter un exercice"
    const addMoreBtn = await screen.findByRole('button', { name: /ajouter un exercice/i });
    fireEvent.click(addMoreBtn);

    const selectEx2 = await screen.findByRole('button', { name: /écarté poulie/i });
    fireEvent.click(selectEx2);

    // Les deux exercices sont affichés
    await waitFor(() => {
      expect(screen.getByText('Développé couché')).toBeInTheDocument();
      expect(screen.getByText('Écarté poulie')).toBeInTheDocument();
    });

    // Saisie d'une série sur le premier exercice (sans historique -> saisie directe)
    const weightInput = (await screen.findAllByLabelText(/poids personnalisé/i))[0];
    fireEvent.change(weightInput, { target: { value: '80' } });

    const rep10Btn = screen.getAllByRole('button', { name: /10 reps/i })[0];
    fireEvent.click(rep10Btn);

    const validateBtn = screen.getAllByRole('button', { name: /valider/i })[0];
    fireEvent.click(validateBtn);

    await waitFor(async () => {
      const sets = await db.sets.where('sessionId').equals(sessionId).toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0].exerciseId).toBe(exId1);
      expect(sets[0].weight).toBe(80);
    });
  });

  it('24. n’affiche pas dans le sélecteur un exercice déjà présent dans la séance', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Squat', muscleGroup: 'Jambes' });
    await addExercise({ name: 'Presse à cuisses', muscleGroup: 'Jambes' });

    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 1, workSets: 3 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    const addBtn = await screen.findByRole('button', { name: /ajouter un exercice/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // "Presse à cuisses" est présent
    expect(await screen.findByRole('button', { name: /presse à cuisses/i })).toBeInTheDocument();

    // "Squat" (déjà dans la séance) ne doit PAS être proposé
    expect(screen.queryByRole('button', { name: /^squat/i })).not.toBeInTheDocument();
  });

  it('25. n’affiche pas dans le sélecteur un exercice archivé', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    await addExercise({ name: 'Rowing haltères', muscleGroup: 'Dos' });
    const exArchived = await addExercise({ name: 'Tirage nuque', muscleGroup: 'Dos' });
    await db.exercises.update(exArchived, { archived: true });

    await startSession({ now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    const addBtn = await screen.findByRole('button', { name: /ajouter/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole('button', { name: /rowing haltères/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tirage nuque/i })).not.toBeInTheDocument();
  });

  it('26. retire un exercice sans série après confirmation role="alertdialog" (Annuler / Confirmer)', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Fentes', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Ouvrir le menu ⋯ de Fentes
    const optionsBtn = await screen.findByRole('button', { name: /options fentes/i });
    fireEvent.click(optionsBtn);

    const removeBtn = await screen.findByRole('button', { name: /retirer fentes/i });
    fireEvent.click(removeBtn);

    // Dialogue alertdialog
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/retirer l’exercice \?/i)).toBeInTheDocument();

    // Annuler
    const cancelBtn = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Fentes')).toBeInTheDocument();

    // Rouvrir et confirmer
    fireEvent.click(screen.getByRole('button', { name: /options fentes/i }));
    fireEvent.click(screen.getByRole('button', { name: /retirer fentes/i }));
    const confirmBtn = screen.getByRole('button', { name: /^retirer$/i });
    fireEvent.click(confirmBtn);

    await waitFor(async () => {
      const remainingEx = await getSessionExercises(currentSessionId);
      expect(remainingEx).toHaveLength(0);
    });

    await waitFor(() => {
      expect(screen.queryByText('Fentes')).not.toBeInTheDocument();
    });
  });

  it('27. ne permet pas de retirer un exercice ayant déjà des séries enregistrées', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Dips', muscleGroup: 'Bras' });
    const progId = await createProgram({ name: 'Arms', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 0,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 10, 0),
    });

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Dips')).toBeInTheDocument();
    });

    // Ouvrir le menu ⋯
    const optionsBtn = await screen.findByRole('button', { name: /options dips/i });
    fireEvent.click(optionsBtn);

    // Le bouton "Retirer Dips" est visible mais désactivé
    const removeBtn = screen.getByRole('button', { name: /retirer dips/i });
    expect(removeBtn).toBeDisabled();
  });

  it('28. permet de passer un exercice (skipped) et de le rétablir via le menu ⋯', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Crunch', muscleGroup: 'Abdominaux' });
    const progId = await createProgram({ name: 'Core', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Ouvrir le menu ⋯
    const optionsBtn = await screen.findByRole('button', { name: /options crunch/i });
    fireEvent.click(optionsBtn);

    const skipBtn = await screen.findByRole('button', { name: /passer crunch/i });
    fireEvent.click(skipBtn);

    // En base, skipped est true
    await waitFor(async () => {
      const seList = await getSessionExercises(currentSessionId);
      expect(seList[0].skipped).toBe(true);
    });

    // Rétablir via le menu ⋯
    fireEvent.click(screen.getByRole('button', { name: /options crunch/i }));
    const restoreBtn = screen.getByRole('button', { name: /rétablir crunch/i });
    fireEvent.click(restoreBtn);

    await waitFor(async () => {
      const seList = await getSessionExercises(currentSessionId);
      expect(seList[0].skipped).toBe(false);
    });
  });

  it('29. réordonne avec ↑ ↓ via le menu ⋯ et désactive les boutons aux extrémités', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Exercice Un', muscleGroup: 'Bras' });
    const exId2 = await addExercise({ name: 'Exercice Deux', muscleGroup: 'Bras' });
    const progId = await createProgram({ name: 'Reorder Test', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Ouvrir menu Exercice Un
    const optionsBtn1 = await screen.findByRole('button', { name: /options exercice un/i });
    fireEvent.click(optionsBtn1);

    const upBtn1 = screen.getByRole('button', { name: /monter exercice un/i });
    expect(upBtn1).toBeDisabled();

    // Descendre le premier
    const downBtn1 = screen.getByRole('button', { name: /descendre exercice un/i });
    fireEvent.click(downBtn1);

    await waitFor(async () => {
      const seList = await getSessionExercises(currentSessionId);
      expect(seList[0].exerciseId).toBe(exId2);
      expect(seList[1].exerciseId).toBe(exId1);
    });

    // Attendre que le DOM soit réordonné : Exercice Deux en premier, Exercice Un en second
    await waitFor(() => {
      const names = screen.getAllByText(/exercice (un|deux)/i);
      expect(names[0]).toHaveTextContent('Exercice Deux');
      expect(names[1]).toHaveTextContent('Exercice Un');
    });

    // Exercice Un est maintenant le second -> descendre est désactivé
    fireEvent.click(screen.getByRole('button', { name: /options exercice un/i }));
    const downBtnEnd = screen.getByRole('button', { name: /descendre exercice un/i });
    expect(downBtnEnd).toBeDisabled();
  });

  it('30. plus aucun réglage du nombre de séries dans la séance', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Presse inclinée', muscleGroup: 'Jambes' });
    const progId = await createProgram({ name: 'Legs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 1, workSets: 2 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    await waitFor(() => {
      expect(screen.getByText('Presse inclinée')).toBeInTheDocument();
    });

    // Aucun bouton d'incrément ou décrément de séries de travail
    expect(screen.queryByRole('button', { name: /diminuer séries/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /augmenter séries/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/travail :/i)).not.toBeInTheDocument();
  });

  it('31. garantit que la séance type reste strictement intacte après les actions de séance', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Tractions', muscleGroup: 'Dos' });
    const exId2 = await addExercise({ name: 'Soulevé de terre', muscleGroup: 'Dos' });
    await addExercise({ name: 'Rowing barre', muscleGroup: 'Dos' });

    const progId = await createProgram({ name: 'Dos Pur', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1, warmupSets: 1, workSets: 3 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2, warmupSets: 1, workSets: 3 });

    const initialProgram = await getProgramWithExercises(progId);
    expect(initialProgram?.exercises).toHaveLength(2);

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // 1. Ajouter un exercice via bouton flottant
    const addBtn = await screen.findByRole('button', { name: /ajouter un exercice/i });
    fireEvent.click(addBtn);
    const selectExtra = await screen.findByRole('button', { name: /rowing barre/i });
    fireEvent.click(selectExtra);

    // 2. Passer un exercice via menu ⋯
    const optionsBtn1 = await screen.findByRole('button', { name: /options tractions/i });
    fireEvent.click(optionsBtn1);
    const skipBtn = await screen.findByRole('button', { name: /passer tractions/i });
    fireEvent.click(skipBtn);

    // 3. Déplacer un exercice via menu ⋯
    const optionsBtn2 = await screen.findByRole('button', { name: /options tractions/i });
    fireEvent.click(optionsBtn2);
    const downBtn = await screen.findByRole('button', { name: /descendre tractions/i });
    fireEvent.click(downBtn);

    // Vérifier l'état de la séance type en base
    const unchangedProgram = await getProgramWithExercises(progId);
    expect(unchangedProgram?.exercises).toHaveLength(2);
    expect(unchangedProgram?.exercises[0].exerciseId).toBe(exId1);
    expect(unchangedProgram?.exercises[0].workSets).toBe(3);
    expect(unchangedProgram?.exercises[1].exerciseId).toBe(exId2);
    expect(unchangedProgram?.exercises[1].workSets).toBe(3);
  });

  it('32. conserve l’ordre et les exercices passés après démontage et remontage (rechargement)', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Curl barre', muscleGroup: 'Bras' });
    const exId2 = await addExercise({ name: 'Barre au front', muscleGroup: 'Bras' });

    const progId = await createProgram({ name: 'Super Bras', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    const { unmount } = render(<SeanceTab />);

    // Inverser l'ordre (descendre Curl barre via menu ⋯)
    const optionsBtn1 = await screen.findByRole('button', { name: /options curl barre/i });
    fireEvent.click(optionsBtn1);
    const downBtn = await screen.findByRole('button', { name: /descendre curl barre/i });
    fireEvent.click(downBtn);

    // Passer Barre au front via menu ⋯
    const optionsBtn2 = await screen.findByRole('button', { name: /options barre au front/i });
    fireEvent.click(optionsBtn2);
    const skipBtn = await screen.findByRole('button', { name: /passer barre au front/i });
    fireEvent.click(skipBtn);

    await waitFor(async () => {
      const seList = await getSessionExercises(currentSessionId);
      expect(seList[0].exerciseId).toBe(exId2);
      expect(seList[0].skipped).toBe(true);
      expect(seList[1].exerciseId).toBe(exId1);
    });

    // Simuler le démontage et remontage
    unmount();
    render(<SeanceTab />);

    await waitFor(() => {
      // Barre au front est passée, donc fermée avec ✓
      expect(screen.getByRole('button', { name: /ouvrir barre au front/i })).toBeInTheDocument();
    });

    const seListAfter = await getSessionExercises(currentSessionId);
    expect(seListAfter[0].exerciseId).toBe(exId2);
    expect(seListAfter[0].skipped).toBe(true);
    expect(seListAfter[1].exerciseId).toBe(exId1);
  });

  // --- NOUVEAUX TESTS TÂCHE 4E ---
  it('33. le premier exercice non terminé est ouvert par défaut', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Développé couché est ouvert : bouton de validation visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valider/i })).toBeInTheDocument();
    });

    // Écarté haltères est fermé : bouton Ouvrir présent
    expect(screen.getByRole('button', { name: /ouvrir écarté haltères/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ouvrir développé couché/i })).not.toBeInTheDocument();
  });

  it('34. taper sur un exercice fermé l’ouvre et ferme le précédent', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Taper sur Écarté haltères fermé
    const closedEx2 = await screen.findByRole('button', { name: /ouvrir écarté haltères/i });
    fireEvent.click(closedEx2);

    // Écarté haltères est maintenant ouvert, Développé couché est fermé
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ouvrir développé couché/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ouvrir écarté haltères/i })).not.toBeInTheDocument();
    });
  });

  it('35. un exercice terminé affiche « ✓ », un exercice commencé « 1/3 »', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1, warmupSets: 0, workSets: 3 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2, warmupSets: 0, workSets: 3 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    // 1 série de travail sur ex1 -> commencé (1/3)
    await addSet({
      sessionId: currentSessionId,
      exerciseId: exId1,
      reps: 10,
      weight: 80,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 10, 0),
    });

    render(<SeanceTab />);

    // Ouvrir ex2 pour fermer ex1
    const closedEx2 = await screen.findByRole('button', { name: /ouvrir écarté haltères/i });
    fireEvent.click(closedEx2);

    // ex1 fermé affiche "1/3"
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    // Passer ex1 via le menu
    const optionsBtn1 = screen.getByRole('button', { name: /options développé couché/i });
    fireEvent.click(optionsBtn1);
    const skipBtn = screen.getByRole('button', { name: /passer développé couché/i });
    fireEvent.click(skipBtn);

    // ex1 passé (terminé) fermé affiche "✓"
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('36. quand l’exercice ouvert devient terminé, il se ferme et le premier non terminé s’ouvre', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1, warmupSets: 0, workSets: 1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2, warmupSets: 0, workSets: 1 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Développé couché est ouvert au départ
    const weightInput = await screen.findByLabelText(/poids personnalisé/i);
    fireEvent.change(weightInput, { target: { value: '80' } });

    const rep10Btn = screen.getByRole('button', { name: /10 reps/i });
    fireEvent.click(rep10Btn);

    const validateBtn = screen.getByRole('button', { name: /valider série 1/i });
    fireEvent.click(validateBtn);

    // Dès la série validée, ex1 est terminé (1/1) -> se ferme, et ex2 (premier non terminé) s'ouvre !
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ouvrir développé couché/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ouvrir écarté haltères/i })).not.toBeInTheDocument();
    });
  });

  it('37. quand tous les exercices sont terminés, aucun exercice n’est ouvert', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId, warmupSets: 0, workSets: 1 });

    const currentSessionId = await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });
    await addSet({
      sessionId: currentSessionId,
      exerciseId: exId,
      reps: 10,
      weight: 80,
      type: 'work',
      now: new Date(2026, 9, 19, 10, 10, 0),
    });

    render(<SeanceTab />);

    // Tous terminés -> aucun exercice ouvert, pas de formulaire de saisie
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ouvrir développé couché/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/poids personnalisé/i)).not.toBeInTheDocument();
    });
  });

  it('38. bouton flottant carré « + » présent et aucun bouton en fin de liste', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // Bouton flottant avec aria-label « Ajouter un exercice »
    const floatBtn = await screen.findByRole('button', { name: 'Ajouter un exercice' });
    expect(floatBtn).toBeInTheDocument();
    expect(floatBtn).toHaveTextContent('+');

    // Aucun bouton textuel "+ Ajouter un exercice"
    expect(screen.queryByRole('button', { name: /\+ ajouter un exercice/i })).not.toBeInTheDocument();
  });

  it('39. le menu ⋯ s’ouvre sans ouvrir la carte fermée', async () => {
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));

    const exId1 = await addExercise({ name: 'Développé couché', muscleGroup: 'Pectoraux' });
    const exId2 = await addExercise({ name: 'Écarté haltères', muscleGroup: 'Pectoraux' });

    const progId = await createProgram({ name: 'Pecs', weekdays: [1] });
    await addExerciseToProgram({ programId: progId, exerciseId: exId1 });
    await addExerciseToProgram({ programId: progId, exerciseId: exId2 });

    await startSession({ programId: progId, now: new Date(2026, 9, 19, 10, 0, 0) });

    render(<SeanceTab />);

    // ex2 est fermé
    const optionsBtn2 = await screen.findByRole('button', { name: /options écarté haltères/i });
    fireEvent.click(optionsBtn2);

    // Le menu ⋯ est ouvert (item "Monter" visible)
    expect(screen.getByRole('button', { name: /monter écarté haltères/i })).toBeInTheDocument();

    // Mais ex2 reste FERMÉ (le bouton "Ouvrir Écarté haltères" est toujours présent)
    expect(screen.getByRole('button', { name: /ouvrir écarté haltères/i })).toBeInTheDocument();
  });

  it("40. sans séance en cours, l'écran de démarrage s'affiche et aucun texte Chargement n'apparaît", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));

    render(<SeanceTab />);

    // L'écran de démarrage s'affiche
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^séance$/i })).toBeInTheDocument();
    });

    // Aucun texte "Chargement" ne doit être présent dans le DOM
    expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument();
  });
});


