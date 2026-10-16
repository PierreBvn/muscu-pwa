import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}
