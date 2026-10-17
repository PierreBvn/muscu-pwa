import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../db/schema';
import { MuscleIcon } from '../MuscleIcon';

const EXPECTED_FILES: Record<MuscleGroup, string> = {
  Pectoraux: 'pectoraux.png',
  Dos: 'grand-dorsal.png',
  Épaules: 'epaules.png',
  Biceps: 'biceps.png',
  Triceps: 'triceps.png',
  'Avant-bras': 'avant-bras.png',
  Abdos: 'abdos.png',
  Quadriceps: 'quadriceps.png',
  Ischios: 'ischios.png',
  Fessiers: 'fessiers.png',
  Mollets: 'mollets.png',
};

describe('MuscleIcon', () => {
  it.each(MUSCLE_GROUPS)(
    'renders a <span aria-hidden> with mask-image containing the file for "%s"',
    (group) => {
      const { container } = render(<MuscleIcon group={group} className="test-icon" />);
      const span = container.querySelector('span[aria-hidden="true"]');
      expect(span).not.toBeNull();
      expect(span).toHaveClass('test-icon');

      const expectedFilename = EXPECTED_FILES[group];
      const styleAttr = span!.getAttribute('style') ?? '';
      expect(styleAttr).toContain(expectedFilename);
    },
  );
});
