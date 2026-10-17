import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../db/schema';
import { MuscleIcon } from '../MuscleIcon';

const EXPECTED_FILES: Record<MuscleGroup, string> = {
  Pectoraux: 'pectoraux.png',
  Dos: 'dos.png',
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
    'renders an <img alt="" aria-hidden> with src containing the file for "%s"',
    (group) => {
      const { container } = render(<MuscleIcon group={group} className="test-icon" />);
      const img = container.querySelector('img[aria-hidden="true"]');
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveClass('test-icon');

      const expectedFilename = EXPECTED_FILES[group];
      const srcAttr = img!.getAttribute('src') ?? '';
      expect(srcAttr).toContain(expectedFilename);
    },
  );
});
