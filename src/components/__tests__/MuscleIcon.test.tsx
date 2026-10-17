import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MUSCLE_GROUPS } from '../../db/schema';
import { MuscleIcon } from '../MuscleIcon';

describe('MuscleIcon', () => {
  it.each(MUSCLE_GROUPS)(
    'renders an <svg> containing at least one graphic element for "%s"',
    (group) => {
      const { container } = render(<MuscleIcon group={group} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      // At least one graphic element (path, line, circle, rect, etc.)
      const graphicElements = svg!.querySelectorAll('path, line, circle, rect, polyline, polygon, ellipse');
      expect(graphicElements.length).toBeGreaterThan(0);
    },
  );
});
