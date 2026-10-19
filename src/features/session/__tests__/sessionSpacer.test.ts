import { describe, it, expect } from 'vitest';
import { calculateSessionSpacerHeight } from '../sessionSpacer';

describe('calculateSessionSpacerHeight', () => {
  it('retourne 0 si aucun exercice n’est ouvert (hauteur <= 0)', () => {
    expect(
      calculateSessionSpacerHeight({
        viewportHeight: 844,
        headerHeight: 64,
        navHeight: 64,
        openExerciseHeight: 0,
      })
    ).toBe(0);

    expect(
      calculateSessionSpacerHeight({
        viewportHeight: 844,
        headerHeight: 64,
        navHeight: 64,
        previousExerciseHeight: 80,
        openExerciseHeight: -15,
      })
    ).toBe(0);
  });

  it('calcule la hauteur de l’espaceur pour le premier exercice (sans exercice précédent)', () => {
    // 844 - 64 - 64 - 0 - 0 - 300 = 416
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      openExerciseHeight: 300,
    });
    expect(spacer).toBe(416);
  });

  it('calcule la hauteur de l’espaceur avec un exercice précédent (deuxième position)', () => {
    // 844 - 64 - 64 - 0 - 80 - 300 = 336
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      previousExerciseHeight: 80,
      openExerciseHeight: 300,
    });
    expect(spacer).toBe(336);
  });

  it('calcule la hauteur de l’espaceur avec exercice précédent et bandeau minuteur affiché', () => {
    // 844 - 64 - 64 - 64 - 80 - 300 = 272
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      timerHeight: 64,
      previousExerciseHeight: 80,
      openExerciseHeight: 300,
    });
    expect(spacer).toBe(272);
  });

  it('retourne 0 si la somme (exercice précédent + exercice ouvert) dépasse la hauteur visible restante', () => {
    // 844 - 64 - 64 - 0 - 80 - 700 = -64 -> 0
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      previousExerciseHeight: 80,
      openExerciseHeight: 700,
    });
    expect(spacer).toBe(0);
  });

  it('recalcule correctement l’espaceur quand la hauteur change suite à l’ajout de séries', () => {
    const initialSpacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      previousExerciseHeight: 80,
      openExerciseHeight: 250,
    });
    // 844 - 64 - 64 - 80 - 250 = 386
    expect(initialSpacer).toBe(386);

    const updatedSpacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      previousExerciseHeight: 80,
      openExerciseHeight: 350,
    });
    // 844 - 64 - 64 - 80 - 350 = 286
    expect(updatedSpacer).toBe(286);
    expect(updatedSpacer).toBeLessThan(initialSpacer);
  });
});
