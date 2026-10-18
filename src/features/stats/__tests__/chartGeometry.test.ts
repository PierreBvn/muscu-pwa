import { describe, it, expect } from 'vitest';
import { computeChartGeometry } from '../chartGeometry';
import type { ExerciseStatPoint } from '../../../db/stats';

describe('computeChartGeometry', () => {
  const padding = { top: 20, right: 20, bottom: 25, left: 45 };
  const width = 320;
  const height = 180;

  it('cas point unique : centré horizontalement et verticalement, pathD vide', () => {
    const points: ExerciseStatPoint[] = [
      {
        sessionId: 1,
        date: '2026-10-10',
        averageWeight: 60,
        totalReps: 10,
        isRecord: true,
      },
    ];

    const geom = computeChartGeometry({
      points,
      mode: 'weight',
      width,
      height,
      padding,
      exerciseName: 'Développé couché',
    });

    expect(geom).not.toBeNull();
    if (!geom) return;

    // Cas min = max appliqué (±2,5 kg)
    expect(geom.minY).toBe(57.5);
    expect(geom.maxY).toBe(62.5);
    expect(geom.formattedMinY).toBe('57,5\u00A0kg');
    expect(geom.formattedMaxY).toBe('62,5\u00A0kg');

    // 1 seul point centré
    expect(geom.points).toHaveLength(1);
    const expectedX = padding.left + (width - padding.left - padding.right) / 2; // 45 + (320 - 45 - 20) / 2 = 172.5
    const expectedY = padding.top + (height - padding.top - padding.bottom) / 2; // 20 + (180 - 20 - 25) / 2 = 87.5
    expect(geom.points[0].x).toBe(expectedX);
    expect(geom.points[0].y).toBe(expectedY);
    expect(geom.points[0].isRecord).toBe(true);

    // Pas de ligne tracée
    expect(geom.pathD).toBe('');
    expect(geom.startDate).toBe('2026-10-10');
    expect(geom.endDate).toBe('2026-10-10');
    expect(geom.ariaLabel).toContain('1 séance');
  });

  it('cas min = max avec plusieurs points : bornes Y élargies à ±2,5 kg et points centrés verticalement', () => {
    const points: ExerciseStatPoint[] = [
      {
        sessionId: 1,
        date: '2026-10-10',
        averageWeight: 80,
        totalReps: 10,
        isRecord: false,
      },
      {
        sessionId: 2,
        date: '2026-10-12',
        averageWeight: 80,
        totalReps: 10,
        isRecord: false,
      },
    ];

    const geom = computeChartGeometry({
      points,
      mode: 'weight',
      width,
      height,
      padding,
    });

    expect(geom).not.toBeNull();
    if (!geom) return;

    expect(geom.minY).toBe(77.5);
    expect(geom.maxY).toBe(82.5);
    expect(geom.formattedMinY).toBe('77,5\u00A0kg');
    expect(geom.formattedMaxY).toBe('82,5\u00A0kg');

    // Centré verticalement
    const centerY = padding.top + (height - padding.top - padding.bottom) / 2;
    expect(geom.points[0].y).toBe(centerY);
    expect(geom.points[1].y).toBe(centerY);
  });

  it('cas 2 points : coordonnées X aux extrémités, Y proportionnel et chemin SVG non vide', () => {
    const points: ExerciseStatPoint[] = [
      {
        sessionId: 1,
        date: '2026-10-10',
        averageWeight: 80,
        totalReps: 10,
        isRecord: false,
      },
      {
        sessionId: 2,
        date: '2026-10-15',
        averageWeight: 90,
        totalReps: 8,
        isRecord: true,
      },
    ];

    const geom = computeChartGeometry({
      points,
      mode: 'weight',
      width,
      height,
      padding,
    });

    expect(geom).not.toBeNull();
    if (!geom) return;

    expect(geom.minY).toBe(80);
    expect(geom.maxY).toBe(90);
    expect(geom.formattedMinY).toBe('80\u00A0kg');
    expect(geom.formattedMaxY).toBe('90\u00A0kg');

    // Point 1 à gauche, en bas (minY)
    expect(geom.points[0].x).toBe(padding.left);
    expect(geom.points[0].y).toBe(height - padding.bottom);
    expect(geom.points[0].isRecord).toBe(false);

    // Point 2 à droite, en haut (maxY)
    expect(geom.points[1].x).toBe(width - padding.right);
    expect(geom.points[1].y).toBe(padding.top);
    expect(geom.points[1].isRecord).toBe(true);

    // Path reliant les 2 points
    expect(geom.pathD).toBe(`M ${geom.points[0].x.toFixed(1)} ${geom.points[0].y.toFixed(1)} L ${geom.points[1].x.toFixed(1)} ${geom.points[1].y.toFixed(1)}`);
    expect(geom.startDate).toBe('2026-10-10');
    expect(geom.endDate).toBe('2026-10-15');
    expect(geom.ariaLabel).toContain('2 séances');
  });

  it('renvoie null si la liste des points est vide', () => {
    expect(computeChartGeometry({ points: [], mode: 'weight' })).toBeNull();
  });
});
