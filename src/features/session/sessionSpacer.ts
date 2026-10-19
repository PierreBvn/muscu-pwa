export interface SessionSpacerParams {
  viewportHeight: number;
  headerHeight: number;
  navHeight: number;
  timerHeight?: number;
  openExerciseHeight: number;
}

/**
 * Calcule la hauteur minimale de l'espaceur sous la liste d'exercices d'une séance active
 * pour permettre à l'exercice ouvert d'être aligné juste sous l'en-tête (y compris le dernier).
 *
 * Formule :
 * hauteur visible − en-tête − barre de navigation − bandeau du minuteur (si affiché)
 * − hauteur de l'exercice ouvert, minimum 0.
 *
 * Si aucun exercice n'est ouvert (openExerciseHeight <= 0), l'espaceur vaut 0.
 */
export function calculateSessionSpacerHeight({
  viewportHeight,
  headerHeight,
  navHeight,
  timerHeight = 0,
  openExerciseHeight,
}: SessionSpacerParams): number {
  if (openExerciseHeight <= 0) {
    return 0;
  }

  return Math.max(
    0,
    viewportHeight - headerHeight - navHeight - timerHeight - openExerciseHeight
  );
}
