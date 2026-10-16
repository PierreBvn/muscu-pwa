import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalScrollLock } from '../useModalScrollLock';

describe('useModalScrollLock', () => {
  it('locks body scroll when open and restores it when closed or unmounted', () => {
    document.body.style.overflow = '';

    const { rerender, unmount } = renderHook(
      ({ isOpen }) => useModalScrollLock(isOpen),
      { initialProps: { isOpen: false } }
    );

    expect(document.body.style.overflow).toBe('');

    rerender({ isOpen: true });
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ isOpen: false });
    expect(document.body.style.overflow).toBe('');

    rerender({ isOpen: true });
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
