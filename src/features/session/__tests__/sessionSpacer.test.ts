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
        openExerciseHeight: -15,
      })
    ).toBe(0);
  });

  it('calcule la hauteur de l’espaceur sans bandeau minuteur', () => {
    // 844 - 64 - 64 - 0 - 300 = 416
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      openExerciseHeight: 300,
    });
    expect(spacer).toBe(416);
  });

  it('calcule la hauteur de l’espaceur avec le bandeau minuteur affiché', () => {
    // 844 - 64 - 64 - 64 - 300 = 352
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      timerHeight: 64,
      openExerciseHeight: 300,
    });
    expect(spacer).toBe(352);
  });

  it('retourne 0 si la hauteur de l’exercice ouvert dépasse la hauteur visible restante', () => {
    // 844 - 64 - 64 - 0 - 750 = -34 -> 0
    const spacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      openExerciseHeight: 750,
    });
    expect(spacer).toBe(0);
  });

  it('recalcule correctement l’espaceur quand la hauteur change suite à l’ajout de séries', () => {
    const initialSpacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      openExerciseHeight: 250,
    });
    // 844 - 64 - 64 - 250 = 466
    expect(initialSpacer).toBe(466);

    const updatedSpacer = calculateSessionSpacerHeight({
      viewportHeight: 844,
      headerHeight: 64,
      navHeight: 64,
      openExerciseHeight: 350,
    });
    // 844 - 64 - 64 - 350 = 366
    expect(updatedSpacer).toBe(366);
    expect(updatedSpacer).toBeLessThan(initialSpacer);
  });
});
