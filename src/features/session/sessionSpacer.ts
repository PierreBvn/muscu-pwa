export interface SessionSpacerParams {
  viewportHeight: number;
  headerHeight: number;
  navHeight: number;
  timerHeight?: number;
  previousExerciseHeight?: number;
  openExerciseHeight: number;
}

/**
 * Calcule la hauteur minimale de l'espaceur sous la liste d'exercices d'une séance active
 * pour permettre à l'exercice ouvert d'être en deuxième position (avec l'exercice précédent
 * replié affiché au-dessus aligné sous l'en-tête), y compris pour le dernier exercice.
 *
 * Formule :
 * hauteur visible − en-tête − barre de navigation − bandeau du minuteur (si affiché)
 * − exercice précédent (si applicable) − exercice ouvert, minimum 0.
 *
 * Si aucun exercice n'est ouvert (openExerciseHeight <= 0), l'espaceur vaut 0.
 */
export function calculateSessionSpacerHeight({
  viewportHeight,
  headerHeight,
  navHeight,
  timerHeight = 0,
  previousExerciseHeight = 0,
  openExerciseHeight,
}: SessionSpacerParams): number {
  if (openExerciseHeight <= 0) {
    return 0;
  }

  const prevHeight = Math.max(0, previousExerciseHeight);
  const timer = Math.max(0, timerHeight);

  return Math.max(
    0,
    viewportHeight -
      headerHeight -
      navHeight -
      timer -
      prevHeight -
      openExerciseHeight
  );
}
