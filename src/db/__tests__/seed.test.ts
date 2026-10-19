import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../schema';
import { ensureSeeded, getAllExercises, DEFAULT_EXERCISES } from '../exercises';

describe('Seed initial au démarrage de l’app', () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it('base vide → après démarrage les exercices existent sans ouvrir la Bibliothèque', async () => {
    // Base vide avant démarrage
    const countBefore = await db.exercises.count();
    expect(countBefore).toBe(0);

    // Démarrage de l'app (initialisation du seed avant premier rendu)
    const seeded = await ensureSeeded();
    expect(seeded).toBe(true);

    // Les exercices existent sans avoir ouvert la Bibliothèque
    const countAfter = await db.exercises.count();
    expect(countAfter).toBe(DEFAULT_EXERCISES.length);
    expect(countAfter).toBe(49);

    const exercises = await getAllExercises();
    expect(exercises.map((e) => e.name)).toContain('Développé couché barre');
  });

  it('deux exécutions → pas de doublon (idempotent)', async () => {
    // Première exécution
    const firstCall = await ensureSeeded();
    expect(firstCall).toBe(true);
    expect(await db.exercises.count()).toBe(DEFAULT_EXERCISES.length);

    // Deuxième exécution
    const secondCall = await ensureSeeded();
    expect(secondCall).toBe(false);
    expect(await db.exercises.count()).toBe(DEFAULT_EXERCISES.length);
  });
});
