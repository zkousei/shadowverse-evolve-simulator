import { describe, expect, it } from 'vitest';
import { resolveBoardEnvironment } from './gameBoardEnvironment';

const createMatchMedia = (matchesByQuery: Record<string, boolean>) => (
  (query: string) => ({ matches: matchesByQuery[query] ?? false })
);

describe('gameBoardEnvironment', () => {
  it('resolves desktop overview from the existing fine desktop rules', () => {
    const environment = resolveBoardEnvironment({
      viewportWidth: 1440,
      viewportHeight: 900,
      matchMediaFn: () => ({ matches: false }),
    });

    expect(environment).toEqual({
      inputProfile: 'fine',
      layoutProfile: 'desktop',
      boardDensity: 'overview',
    });
  });

  it('keeps taller fine desktop viewports on standard density', () => {
    const environment = resolveBoardEnvironment({
      viewportWidth: 1440,
      viewportHeight: 1024,
      matchMediaFn: () => ({ matches: false }),
    });

    expect(environment).toEqual({
      inputProfile: 'fine',
      layoutProfile: 'desktop',
      boardDensity: 'standard',
    });
  });

  it('preserves coarse tablet layout behavior without forcing overview density', () => {
    const environment = resolveBoardEnvironment({
      viewportWidth: 1024,
      viewportHeight: 900,
      matchMediaFn: () => ({ matches: true }),
    });

    expect(environment).toEqual({
      inputProfile: 'coarse',
      layoutProfile: 'tablet',
      boardDensity: 'standard',
    });
  });

  it('treats wider touch-first viewports as coarse input without collapsing the desktop layout', () => {
    const environment = resolveBoardEnvironment({
      viewportWidth: 1366,
      viewportHeight: 1024,
      matchMediaFn: createMatchMedia({
        '(pointer: coarse)': true,
        '(any-pointer: coarse)': true,
        '(hover: hover)': false,
        '(any-hover: hover)': false,
      }),
    });

    expect(environment).toEqual({
      inputProfile: 'coarse',
      layoutProfile: 'desktop',
      boardDensity: 'standard',
    });
  });

  it('keeps hybrid pointer tablet widths on fine input when hover remains available', () => {
    const environment = resolveBoardEnvironment({
      viewportWidth: 1024,
      viewportHeight: 900,
      matchMediaFn: createMatchMedia({
        '(pointer: coarse)': false,
        '(any-pointer: coarse)': true,
        '(hover: hover)': true,
        '(any-hover: hover)': true,
      }),
    });

    expect(environment).toEqual({
      inputProfile: 'fine',
      layoutProfile: 'desktop',
      boardDensity: 'standard',
    });
  });
});
