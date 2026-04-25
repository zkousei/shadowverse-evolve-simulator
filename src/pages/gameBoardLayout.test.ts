import { describe, expect, it } from 'vitest';
import {
  boardColumns,
  boardContentWidth,
  boardShellColumns,
  centerZoneWidth,
  getBoardDensityForViewportWidth,
  getLayoutProfileForViewportWidth,
  resolveBoardLayoutSpacing,
  resolveBoardLayout,
  sidePanelWidth,
  sideZoneWidth,
  topPanelWidth,
} from './gameBoardLayout';

describe('gameBoardLayout', () => {
  it('keeps desktop constants with matching control column widths', () => {
    expect(sidePanelWidth).toBe(220);
    expect(topPanelWidth).toBe(220);
    expect(sideZoneWidth).toBe(140);
    expect(centerZoneWidth).toBe(800);
    expect(boardContentWidth).toBe(1080);
    expect(boardColumns).toBe('140px 800px 140px');
    expect(boardShellColumns).toBe('220px 1080px 220px');
  });

  it('uses desktop profile for widths >= 1280px', () => {
    expect(getLayoutProfileForViewportWidth(1280, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1280, 'coarse')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1600, 'fine')).toBe('desktop');
    expect(getLayoutProfileForViewportWidth(1600, 'coarse')).toBe('desktop');

    const layout = resolveBoardLayout(1280, 'fine');
    expect(layout.profile).toBe('desktop');
    expect(layout.sidePanelWidth).toBe(220);
    expect(layout.topPanelWidth).toBe(220);
    expect(layout.sideZoneWidth).toBe(140);
    expect(layout.centerZoneWidth).toBe(800);
    expect(layout.boardContentWidth).toBe(1080);
    expect(layout.boardColumns).toBe('140px 800px 140px');
    expect(layout.boardShellColumns).toBe('220px 1080px 220px');
  });

  it('uses explicit compact desktop columns for overview density without CSS scaling', () => {
    const layout = resolveBoardLayout(1440, 'fine', 'overview');

    expect(layout.profile).toBe('desktop');
    expect(layout.sidePanelWidth).toBe(176);
    expect(layout.topPanelWidth).toBe(176);
    expect(layout.sideZoneWidth).toBe(112);
    expect(layout.centerZoneWidth).toBe(640);
    expect(layout.boardContentWidth).toBe(864);
    expect(layout.boardColumns).toBe('112px 640px 112px');
    expect(layout.boardShellColumns).toBe('176px 864px 176px');
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
    expect(layout.topPanelWidth).toBe(layout.sidePanelWidth);
    expect(layout.boardShellColumns).toBe('141.5px 629px 141.5px');
    expect(layout.boardColumns).toBe('80px 469px 80px');

    const boardShellWidth = layout.topPanelWidth + layout.boardContentWidth + layout.sidePanelWidth + (16 * 2);
    expect(boardShellWidth).toBeLessThanOrEqual(944);
  });

  it('keeps desktop board shell at 1024px when input profile is fine', () => {
    const layout = resolveBoardLayout(1024, 'fine');
    expect(layout.profile).toBe('desktop');
    expect(layout.topPanelWidth).toBe(layout.sidePanelWidth);
    expect(layout.boardShellColumns).toBe('220px 1080px 220px');
  });

  it('uses overview density for PC desktop viewports while keeping tablet layouts standard', () => {
    expect(getBoardDensityForViewportWidth(1280, 900, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1440, 900, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1440, 1024, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1920, 1200, 'fine')).toBe('overview');
    expect(getBoardDensityForViewportWidth(1024, 900, 'fine')).toBe('standard');
    expect(getBoardDensityForViewportWidth(1024, 900, 'coarse')).toBe('standard');
  });

  it('centralizes compact overview spacing without changing card sizes', () => {
    expect(resolveBoardLayoutSpacing('fine', 'desktop', 'overview')).toMatchObject({
      boardShellPadding: '0.44rem',
      boardShellGap: '0.36rem',
      playmatPadding: '0.38rem',
      playmatGap: '0.18rem',
      boardSectionPadding: '0.22rem 0.26rem',
      boardSectionGap: '0.18rem',
      boardColumnStackGap: '0.24rem',
      boardRowGap: '0.5rem',
      boardSectionDividerMargin: '0.12rem 0',
      stackZoneMinHeight: '96px',
      fieldZoneMinHeight: '106px',
      handZoneMinHeight: '100px',
      bottomHandZoneMinHeight: '106px',
      leaderZoneMinHeight: '110px',
    });
  });

  it('centralizes tablet spacing around touch-safe zone heights', () => {
    expect(resolveBoardLayoutSpacing('coarse', 'tablet', 'standard')).toMatchObject({
      boardShellPadding: '0.42rem',
      boardShellGap: '0.34rem',
      playmatPadding: '0.32rem',
      playmatGap: '0.18rem',
      boardSectionPadding: '0.2rem 0.24rem',
      boardSectionGap: '0.16rem',
      boardColumnStackGap: '0.28rem',
      boardRowGap: '0.42rem',
      boardSectionDividerMargin: '0.24rem 0',
      stackZoneMinHeight: '104px',
      fieldZoneMinHeight: '116px',
      handZoneMinHeight: '108px',
      bottomHandZoneMinHeight: '116px',
      leaderZoneMinHeight: '120px',
    });
  });
});
