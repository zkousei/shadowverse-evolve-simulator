import { describe, expect, it } from 'vitest';
import {
  boardColumns,
  boardContentWidth,
  boardShellColumns,
  centerZoneWidth,
  getLayoutProfileForViewportWidth,
  resolveBoardLayout,
  sidePanelWidth,
  sideZoneWidth,
  topPanelWidth,
} from './gameBoardLayout';

describe('gameBoardLayout', () => {
  it('keeps legacy desktop constants unchanged', () => {
    expect(sidePanelWidth).toBe(220);
    expect(topPanelWidth).toBe(188);
    expect(sideZoneWidth).toBe(140);
    expect(centerZoneWidth).toBe(800);
    expect(boardContentWidth).toBe(1080);
    expect(boardColumns).toBe('140px 800px 140px');
    expect(boardShellColumns).toBe('188px 1080px 220px');
  });

  it('uses desktop profile for widths >= 1280px', () => {
    expect(getLayoutProfileForViewportWidth(1280)).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1600)).toBe('desktop');

    const layout = resolveBoardLayout(1280);
    expect(layout.profile).toBe('desktop');
    expect(layout.sidePanelWidth).toBe(220);
    expect(layout.topPanelWidth).toBe(188);
    expect(layout.sideZoneWidth).toBe(140);
    expect(layout.centerZoneWidth).toBe(800);
    expect(layout.boardContentWidth).toBe(1080);
    expect(layout.boardColumns).toBe('140px 800px 140px');
    expect(layout.boardShellColumns).toBe('188px 1080px 220px');
  });

  it('uses tablet profile only for widths between 900px and 1279px', () => {
    expect(getLayoutProfileForViewportWidth(900)).toBe('tablet');
    expect(getLayoutProfileForViewportWidth(1024)).toBe('tablet');
    expect(getLayoutProfileForViewportWidth(1279)).toBe('tablet');

    expect(getLayoutProfileForViewportWidth(899)).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1280)).toBe('desktop');
  });
});
