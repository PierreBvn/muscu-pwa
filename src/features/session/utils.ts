/**
 * Retourne le jour de la semaine selon la convention 1=lundi … 7=dimanche.
 */
export function toWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
