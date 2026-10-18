import React from 'react';
import type { ExerciseStatPoint } from '../../db/stats';
import { computeChartGeometry } from './chartGeometry';

interface LineChartProps {
  points: ExerciseStatPoint[];
  mode: 'weight' | 'reps';
  exerciseName?: string;
  width?: number;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  points,
  mode,
  exerciseName = 'Exercice',
  width = 340,
  height = 180,
}) => {
  const padding = { top: 22, right: 18, bottom: 26, left: 52 };

  const geometry = computeChartGeometry({
    points,
    mode,
    width,
    height,
    padding,
    exerciseName,
  });

  if (!geometry) {
    return null;
  }

  const {
    formattedMinY,
    formattedMaxY,
    startDate,
    endDate,
    points: chartPoints,
    pathD,
    ariaLabel,
  } = geometry;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  return (
    <div className="w-full rounded-2xl bg-surface border border-line p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Lignes repères horizontales (haut et bas) */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left + innerW}
          y2={padding.top}
          stroke="var(--color-line)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        {/* Graduations axe Y */}
        <text
          x={padding.left - 6}
          y={padding.top + 4}
          textAnchor="end"
          fill="var(--color-muted)"
          className="text-[11px] font-mono select-none"
        >
          {formattedMaxY}
        </text>
        <text
          x={padding.left - 6}
          y={padding.top + innerH + 3}
          textAnchor="end"
          fill="var(--color-muted)"
          className="text-[11px] font-mono select-none"
        >
          {formattedMinY}
        </text>

        {/* Ligne de données */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points de données */}
        {chartPoints.map((pt, idx) => {
          if (pt.isRecord) {
            return (
              <g key={idx}>
                {/* Aura discrète dorée pour le record */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  fill="var(--color-gold)"
                  opacity="0.25"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill="var(--color-gold)"
                  stroke="var(--color-gold-ink)"
                  strokeWidth="1.5"
                />
              </g>
            );
          }

          return (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="var(--color-surface)"
              stroke="var(--color-text)"
              strokeWidth="2"
            />
          );
        })}

        {/* Graduations axe X (dates) */}
        {startDate === endDate ? (
          <text
            x={padding.left + innerW / 2}
            y={height - 6}
            textAnchor="middle"
            fill="var(--color-muted)"
            className="text-[11px] font-mono select-none"
          >
            {startDate}
          </text>
        ) : (
          <>
            <text
              x={padding.left}
              y={height - 6}
              textAnchor="start"
              fill="var(--color-muted)"
              className="text-[11px] font-mono select-none"
            >
              {startDate}
            </text>
            <text
              x={padding.left + innerW}
              y={height - 6}
              textAnchor="end"
              fill="var(--color-muted)"
              className="text-[11px] font-mono select-none"
            >
              {endDate}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};
