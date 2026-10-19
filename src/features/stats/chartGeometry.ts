import type { ExerciseStatPoint } from '../../db/stats';
import {
  formatStatWeight,
  formatStatReps,
  formatIndexChange,
} from '../../db/stats';

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartPointInput {
  date: string;
  averageWeight?: number | null;
  totalReps?: number;
  value?: number | null;
  isRecord?: boolean;
}

export interface ChartPointCoords {
  x: number;
  y: number;
  value: number;
  isRecord: boolean;
  date: string;
}

export interface ComputedChartGeometry {
  minY: number;
  maxY: number;
  formattedMinY: string;
  formattedMaxY: string;
  startDate: string;
  endDate: string;
  points: ChartPointCoords[];
  pathD: string;
  ariaLabel: string;
}

/**
 * Calcule la géométrie du graphique SVG de manière pure (aucun effet de bord, aucun appel DOM/Dexie).
 */
export function computeChartGeometry(params: {
  points: Array<ExerciseStatPoint | ChartPointInput>;
  mode: 'weight' | 'reps' | 'index';
  width?: number;
  height?: number;
  padding?: ChartPadding;
  exerciseName?: string;
}): ComputedChartGeometry | null {
  const {
    points,
    mode,
    width = 320,
    height = 180,
    padding = { top: 20, right: 20, bottom: 25, left: 45 },
    exerciseName = 'Exercice',
  } = params;

  if (points.length === 0) return null;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const getPointValue = (p: ExerciseStatPoint | ChartPointInput): number | null => {
    if (mode === 'weight') return 'averageWeight' in p ? (p.averageWeight ?? null) : null;
    if (mode === 'reps') return 'totalReps' in p ? (p.totalReps ?? null) : null;
    return 'value' in p ? (p.value ?? null) : null;
  };

  const pointValues = points.map(getPointValue);
  const validValues = pointValues.filter((v): v is number => v !== null);

  if (validValues.length === 0) return null;

  const rawMin = Math.min(...validValues);
  const rawMax = Math.max(...validValues);

  let minY: number;
  let maxY: number;

  if (rawMin === rawMax) {
    if (mode === 'weight') {
      minY = rawMin - 2.5;
      maxY = rawMax + 2.5;
    } else if (mode === 'reps') {
      minY = Math.max(0, rawMin - 5);
      maxY = rawMax + 5;
    } else {
      // mode === 'index' : ±2,5 points pour un indice constant
      minY = rawMin - 2.5;
      maxY = rawMax + 2.5;
    }
  } else {
    minY = rawMin;
    maxY = rawMax;
  }

  const formatValue = (val: number): string => {
    if (mode === 'weight') return formatStatWeight(val);
    if (mode === 'reps') return formatStatReps(val);
    return formatIndexChange(val);
  };

  const formattedMinY = formatValue(minY);
  const formattedMaxY = formatValue(maxY);

  const coords: ChartPointCoords[] = [];

  if (points.length === 1) {
    coords.push({
      x: padding.left + innerW / 2,
      y: padding.top + innerH / 2,
      value: validValues[0],
      isRecord: Boolean(points[0].isRecord),
      date: points[0].date,
    });
  } else {
    const rangeY = maxY - minY || 1;
    for (let i = 0; i < points.length; i++) {
      const val = pointValues[i];
      if (val === null) continue;

      const x = padding.left + (i / (points.length - 1)) * innerW;
      const normalizedY = (val - minY) / rangeY;
      const y = padding.top + innerH - normalizedY * innerH;
      coords.push({
        x,
        y,
        value: val,
        isRecord: Boolean(points[i].isRecord),
        date: points[i].date,
      });
    }
  }

  const pathD =
    coords.length <= 1
      ? ''
      : coords.reduce((acc, pt, idx) => {
          return idx === 0
            ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
            : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }, '');

  const startDate = points[0].date;
  const endDate = points[points.length - 1].date;

  const firstValFormatted = formatValue(validValues[0]);
  const lastValFormatted = formatValue(validValues[validValues.length - 1]);

  const ariaLabel =
    mode === 'index'
      ? points.length === 1
        ? `Progression ${exerciseName} : 1 semaine le ${startDate}, valeur ${firstValFormatted}`
        : `Progression ${exerciseName} : ${validValues.length} semaines du ${startDate} au ${endDate}, de ${firstValFormatted} à ${lastValFormatted}`
      : points.length === 1
        ? `Progression ${exerciseName} : 1 séance le ${startDate}, valeur ${firstValFormatted}`
        : `Progression ${exerciseName} : ${points.length} séances du ${startDate} au ${endDate}, de ${firstValFormatted} à ${lastValFormatted}`;

  return {
    minY,
    maxY,
    formattedMinY,
    formattedMaxY,
    startDate,
    endDate,
    points: coords,
    pathD,
    ariaLabel,
  };
}
