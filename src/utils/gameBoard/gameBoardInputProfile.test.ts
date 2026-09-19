import { describe, expect, it } from 'vitest';
import { getInputProfileForViewportWidth } from './gameBoardInputProfile';

describe('gameBoardInputProfile', () => {
  it('returns coarse only when viewport is tablet and pointer is coarse', () => {
    const coarseMatchMedia = () => ({ matches: true });
    const fineMatchMedia = () => ({ matches: false });

    expect(getInputProfileForViewportWidth(1024, coarseMatchMedia)).toBe('coarse');
    expect(getInputProfileForViewportWidth(1024, fineMatchMedia)).toBe('fine');
  });

  it('keeps desktop and sub-tablet widths on fine even with coarse pointer', () => {
    const coarseMatchMedia = () => ({ matches: true });

    expect(getInputProfileForViewportWidth(1280, coarseMatchMedia)).toBe('fine');
    expect(getInputProfileForViewportWidth(899, coarseMatchMedia)).toBe('fine');
  });

  it('falls back to fine when matchMedia is unavailable', () => {
    expect(getInputProfileForViewportWidth(1024)).toBe('fine');
  });
});
