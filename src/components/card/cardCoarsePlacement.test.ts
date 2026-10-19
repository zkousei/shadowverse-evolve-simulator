import { describe, expect, it } from 'vitest';
import { computeCoarseSheetPlacement } from './cardCoarsePlacement';

describe('computeCoarseSheetPlacement', () => {
  const baseViewport = {
    left: 0,
    top: 0,
    width: 375,
    height: 667,
  };

  it('places sheet below card when sufficient space exists below for normal card', () => {
    const cardRect = {
      left: 100,
      top: 100,
      right: 180,
      bottom: 210,
      width: 80,
      height: 110,
    };

    const placement = computeCoarseSheetPlacement({
      cardRect,
      viewport: baseViewport,
      measuredSheetHeight: 180,
      isExZoneCard: false,
    });

    // Desired width: 375 * 0.74 = 277.5 -> Math.round -> 278, bounded between [220, 300] -> 278
    expect(placement.width).toBe(278);
    // Placed below: anchorOffset = 6 -> rect.bottom (210) + 6 = 216
    expect(placement.top).toBe(216);
    expect(placement.maxHeight).toBeGreaterThan(170);
  });

  it('places sheet above card when below space is insufficient', () => {
    const cardRect = {
      left: 100,
      top: 450,
      right: 180,
      bottom: 560,
      width: 80,
      height: 110,
    };

    const placement = computeCoarseSheetPlacement({
      cardRect,
      viewport: baseViewport,
      measuredSheetHeight: 200,
      isExZoneCard: false,
    });

    // Below space: 667 - (560 + 6) - 6 = 95 < 172
    // Above space: 450 - 6 - (0 + 6) = 438 >= 172 -> place above
    // effectiveHeight: min(200, 438) = 200
    // top: 450 - 6 - 200 = 244
    expect(placement.top).toBe(244);
  });

  it('handles ex-zone card specific sizing and anchor offset', () => {
    const cardRect = {
      left: 20,
      top: 300,
      right: 80,
      bottom: 380,
      width: 60,
      height: 80,
    };

    const placement = computeCoarseSheetPlacement({
      cardRect,
      viewport: baseViewport,
      measuredSheetHeight: 150,
      isExZoneCard: true,
    });

    // EX desired width: 375 * 0.7 = 262.5 -> Math.round -> 263 (bounded [208, 272])
    expect(placement.width).toBe(263);
    // Anchor offset for EX is 4
    // Above space = 300 - 4 - 6 = 290 >= minPreferredSpace (150) -> EX default places above if aboveSpace >= minPreferredSpace
    expect(placement.top).toBe(300 - 4 - 150);
  });

  it('clamps horizontal position within viewport margins', () => {
    const cardNearLeftEdge = {
      left: -10,
      top: 100,
      right: 50,
      bottom: 180,
      width: 60,
      height: 80,
    };

    const placement = computeCoarseSheetPlacement({
      cardRect: cardNearLeftEdge,
      viewport: baseViewport,
      measuredSheetHeight: 100,
      isExZoneCard: false,
    });

    // minLeft = viewportLeft (0) + viewportMargin (6) = 6
    expect(placement.left).toBe(6);
  });
});
