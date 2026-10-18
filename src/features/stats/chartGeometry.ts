import type { ExerciseStatPoint } from '../../db/stats';
import { formatStatWeight, formatStatReps } from '../../db/stats';

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
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
  points: ExerciseStatPoint[];
  mode: 'weight' | 'reps';
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

  const values = points.map((p) =>
    mode === 'weight' ? (p.averageWeight ?? 0) : p.totalReps
  );

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  let minY: number;
  let maxY: number;

  if (rawMin === rawMax) {
    if (mode === 'weight') {
      minY = rawMin - 2.5;
      maxY = rawMax + 2.5;
    } else {
      minY = Math.max(0, rawMin - 5);
      maxY = rawMax + 5;
    }
  } else {
    minY = rawMin;
    maxY = rawMax;
  }

  const formattedMinY =
    mode === 'weight' ? formatStatWeight(minY) : formatStatReps(minY);
  const formattedMaxY =
    mode === 'weight' ? formatStatWeight(maxY) : formatStatReps(maxY);

  const coords: ChartPointCoords[] = [];

  if (points.length === 1) {
    coords.push({
      x: padding.left + innerW / 2,
      y: padding.top + innerH / 2,
      value: values[0],
      isRecord: points[0].isRecord,
      date: points[0].date,
    });
  } else {
    const rangeY = maxY - minY || 1;
    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (i / (points.length - 1)) * innerW;
      const normalizedY = (values[i] - minY) / rangeY;
      const y = padding.top + innerH - normalizedY * innerH;
      coords.push({
        x,
        y,
        value: values[i],
        isRecord: points[i].isRecord,
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

  const firstValFormatted =
    mode === 'weight'
      ? formatStatWeight(values[0])
      : formatStatReps(values[0]);
  const lastValFormatted =
    mode === 'weight'
      ? formatStatWeight(values[values.length - 1])
      : formatStatReps(values[values.length - 1]);

  const ariaLabel =
    points.length === 1
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
