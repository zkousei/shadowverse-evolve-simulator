import { describe, expect, it } from 'vitest';
import {
  boardColumns,
  boardContentWidth,
  boardShellColumns,
  centerZoneWidth,
  getBoardDensityForViewportWidth,
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
    expect(getLayoutProfileForViewportWidth(1280, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1280, 'coarse')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1600, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1600, 'coarse')).toBe('desktop');

    const layout = resolveBoardLayout(1280, 'fine');
    expect(layout.profile).toBe('desktop');
    expect(layout.sidePanelWidth).toBe(220);
    expect(layout.topPanelWidth).toBe(188);
    expect(layout.sideZoneWidth).toBe(140);
    expect(layout.centerZoneWidth).toBe(800);
    expect(layout.boardContentWidth).toBe(1080);
    expect(layout.boardColumns).toBe('140px 800px 140px');
    expect(layout.boardShellColumns).toBe('188px 1080px 220px');
  });

  it('uses tablet profile in 900-1279px only when input profile is coarse', () => {
    expect(getLayoutProfileForViewportWidth(900, 'coarse')).toBe('tablet');
    expect(getLayoutProfileForViewportWidth(1024, 'coarse')).toBe('tablet');
    expect(getLayoutProfileForViewportWidth(1279, 'coarse')).toBe('tablet');

    expect(getLayoutProfileForViewportWidth(900, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1024, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1279, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(899, 'coarse')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1280, 'coarse')).toBe('desktop');
  });

  it('fits tablet board shell within the viewport budget', () => {
    const viewportWidth = 1024;
    const layout = resolveBoardLayout(viewportWidth, 'coarse');

    expect(layout.profile).toBe('tablet');
    expect(layout.boardShellColumns).toBe('132px 629px 151px');

    const boardShellWidth = layout.topPanelWidth + layout.boardContentWidth + layout.sidePanelWidth + (16 * 2);
    expect(boardShellWidth).toBeLessThanOrEqual(944);
  });

  it('keeps desktop board shell at 1024px when input profile is fine', () => {
    const layout = resolveBoardLayout(1024, 'fine');
    expect(layout.profile).toBe('desktop');
    expect(layout.boardShellColumns).toBe('188px 1080px 220px');
  });

  it('uses overview density only for shorter PC desktop viewports while keeping taller or tablet layouts standard', () => {
    expect(getBoardDensityForViewportWidth(1280, 900, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1440, 900, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1440, 1024, 'fine')).toBe('standard');
    expect(getBoardDensityForViewportWidth(1024, 900, 'fine')).toBe('standard');
    expect(getBoardDensityForViewportWidth(1024, 900, 'coarse')).toBe('standard');
  });
});
