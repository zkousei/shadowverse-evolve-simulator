import { describe, expect, it } from 'vitest';
import {
  coarseCardSize,
  desktopCardSize,
  getCardSizeForInputProfile,
  getExZoneGapForInputProfile,
  getFieldZoneGapForInputProfile,
  getRequiredFieldWidthForCardCount,
} from './gameBoardCardLayout';
import { resolveBoardLayout } from '../pages/gameBoardLayout';

describe('gameBoardCardLayout', () => {
  it('keeps desktop card size unchanged for fine input', () => {
    expect(desktopCardSize).toEqual({ width: 100, height: 140 });
    expect(getCardSizeForInputProfile('fine')).toEqual(desktopCardSize);
    expect(getFieldZoneGapForInputProfile('fine')).toBe('1.9rem');
    expect(getExZoneGapForInputProfile('fine')).toBe('1rem');
  });

  it('uses a compact card size and tighter zone gaps for coarse input', () => {
    expect(coarseCardSize).toEqual({ width: 82, height: 115 });
    expect(getCardSizeForInputProfile('coarse')).toEqual(coarseCardSize);
    expect(getFieldZoneGapForInputProfile('coarse')).toBe('0.5rem');
    expect(getExZoneGapForInputProfile('coarse')).toBe('0.5rem');
  });

  it('fits five field cards within tablet center zone width at 1024px', () => {
    const tabletLayout = resolveBoardLayout(1024, 'coarse');
    expect(tabletLayout.profile).toBe('tablet');

    const requiredWidth = getRequiredFieldWidthForCardCount(5, 'coarse', 16);
    expect(requiredWidth).toBeLessThanOrEqual(tabletLayout.centerZoneWidth);
  });
});
