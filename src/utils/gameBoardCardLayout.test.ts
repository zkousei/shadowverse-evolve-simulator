import { describe, expect, it } from 'vitest';
import {
  coarseCardSize,
  desktopCardSize,
  getCardSizeForInputProfile,
  getExZoneGapForInputProfile,
  getFieldZoneGapForInputProfile,
  getRequiredFieldWidthForCardCount,
  overviewDesktopCardSize,
} from './gameBoardCardLayout';
import { resolveBoardLayout } from '../pages/gameBoardLayout';

describe('gameBoardCardLayout', () => {
  it('keeps desktop card size unchanged for fine input', () => {
    expect(desktopCardSize).toEqual({ width: 100, height: 140 });
    expect(getCardSizeForInputProfile('fine')).toEqual(desktopCardSize);
    expect(getFieldZoneGapForInputProfile('fine')).toBe('1.9rem');
    expect(getExZoneGapForInputProfile('fine')).toBe('1rem');
  });

  it('uses a compact card size with slightly wider field spacing for coarse input', () => {
    expect(coarseCardSize).toEqual({ width: 76, height: 106 });
    expect(getCardSizeForInputProfile('coarse')).toEqual(coarseCardSize);
    expect(getFieldZoneGapForInputProfile('coarse')).toBe('1.14rem');
    expect(getExZoneGapForInputProfile('coarse')).toBe('0.36rem');
  });

  it('uses overview desktop sizing without switching to coarse input behavior', () => {
    expect(overviewDesktopCardSize).toEqual({ width: 70, height: 98 });
    expect(getCardSizeForInputProfile('fine', 'overview')).toEqual(overviewDesktopCardSize);
    expect(getFieldZoneGapForInputProfile('fine', 'overview')).toBe('1.9rem');
    expect(getExZoneGapForInputProfile('fine', 'overview')).toBe('0.4rem');
  });

  it('fits five field cards within tablet center zone width at 1024px', () => {
    const tabletLayout = resolveBoardLayout(1024, 'coarse');
    expect(tabletLayout.profile).toBe('tablet');

    const requiredWidth = getRequiredFieldWidthForCardCount(5, 'coarse', 16);
    expect(requiredWidth).toBeLessThanOrEqual(tabletLayout.centerZoneWidth);
  });

  it('keeps five overview desktop field cards within the desktop center zone width', () => {
    const desktopLayout = resolveBoardLayout(1440, 'fine');
    expect(desktopLayout.profile).toBe('desktop');

    const requiredWidth = getRequiredFieldWidthForCardCount(5, 'fine', 16, 'overview');
    expect(requiredWidth).toBeLessThanOrEqual(desktopLayout.centerZoneWidth);
  });
});
