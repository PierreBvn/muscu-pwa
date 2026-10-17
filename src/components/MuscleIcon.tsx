import type { ReactNode } from 'react';
import type { MuscleGroup } from '../db/schema';

/**
 * SVG paths for each muscle group, lucide-style:
 * viewBox 0 0 24 24, stroke currentColor, strokeWidth 2, round caps/joins, fill none.
 * Points stay within 2–22 (2px margin). 2–4 paths per icon, no full silhouette.
 *
 * Pair differentiation:
 *   Pectoraux (horizontal arcs) vs Dos (vertical V-shape / back)
 *   Biceps (flexed arm, bump on top) vs Triceps (extended arm, bump on bottom)
 *   Quadriceps (front thigh, wide top) vs Ischios (back thigh, curved tendons)
 */
const PATHS: Record<MuscleGroup, ReactNode> = {
  // Pectoraux: two horizontal arcs, chest seen from front
  Pectoraux: (
    <>
      <path d="M4 10 Q12 6 20 10" />
      <path d="M4 15 Q12 11 20 15" />
    </>
  ),
  // Dos: V-shaped back / trapezius seen from behind
  Dos: (
    <>
      <path d="M8 4 L4 12 L8 20" />
      <path d="M16 4 L20 12 L16 20" />
      <path d="M8 12 L16 12" />
    </>
  ),
  // Épaules: rounded deltoid cap over a horizontal shoulder line
  Épaules: (
    <>
      <path d="M5 14 L12 14 L19 14" />
      <path d="M5 14 Q5 6 12 6 Q19 6 19 14" />
    </>
  ),
  // Biceps: flexed arm, bump on TOP of upper arm (front)
  Biceps: (
    <>
      <path d="M6 18 L6 12 Q6 6 12 6" />
      <path d="M12 6 L18 10" />
      <path d="M6 9 Q9 5 12 6" />
    </>
  ),
  // Triceps: extended arm pointing down, bump on BOTTOM of upper arm (back)
  Triceps: (
    <>
      <path d="M8 4 L8 14 L14 20" />
      <path d="M8 14 Q12 18 14 14" />
    </>
  ),
  // Avant-bras: two tapered parallel lines (forearm shape)
  'Avant-bras': (
    <>
      <path d="M7 4 Q6 12 8 20" />
      <path d="M17 4 Q16 12 14 20" />
      <path d="M8 20 L14 20" />
    </>
  ),
  // Abdos: contour + 1 vertical line + 2 horizontal lines (≤4 paths)
  Abdos: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="6" y1="15" x2="18" y2="15" />
    </>
  ),
  // Quadriceps: front thigh — wide at top, narrows to knee
  Quadriceps: (
    <>
      <path d="M6 4 Q5 12 8 20" />
      <path d="M18 4 Q19 12 16 20" />
      <path d="M8 20 L16 20" />
      <path d="M6 4 L18 4" />
    </>
  ),
  // Ischios: back thigh — curved hamstring tendons diverging downward
  Ischios: (
    <>
      <path d="M8 4 L8 12 Q8 18 5 20" />
      <path d="M16 4 L16 12 Q16 18 19 20" />
      <path d="M8 4 L16 4" />
    </>
  ),
  // Fessiers: two rounded shapes seen from behind
  Fessiers: (
    <>
      <path d="M4 8 Q4 20 12 18" />
      <path d="M20 8 Q20 20 12 18" />
      <path d="M4 8 L20 8" />
    </>
  ),
  // Mollets: calf profile — diamond-shaped bulge
  Mollets: (
    <>
      <path d="M10 4 L8 10 Q7 14 9 18 L10 20" />
      <path d="M14 4 L16 10 Q17 14 15 18 L14 20" />
    </>
  ),
};

interface MuscleIconProps {
  group: MuscleGroup;
  className?: string;
}

export const MuscleIcon: React.FC<MuscleIconProps> = ({ group, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {PATHS[group]}
  </svg>
);
