import type { CSSProperties } from 'react';
import type { GameBoardBoardDensity } from '../utils/gameBoardBoardDensity';

export type GameBoardLayoutProfile = 'desktop' | 'tablet';
export type GameBoardLayoutInputProfile = 'fine' | 'coarse';

export type GameBoardLayout = {
  profile: GameBoardLayoutProfile;
  sidePanelWidth: number;
  topPanelWidth: number;
  sideZoneWidth: number;
  centerZoneWidth: number;
  boardContentWidth: number;
  boardColumns: string;
  boardShellColumns: string;
};

const TABLET_MIN_WIDTH = 900;
const DESKTOP_MIN_WIDTH = 1280;
const BOARD_SHELL_COLUMN_GAP = 16;
const TABLET_VIEWPORT_HORIZONTAL_RESERVED = 80;
const TABLET_MIN_SHELL_WIDTH = 860;
const TABLET_MAX_SHELL_WIDTH = 1120;

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

const buildLayout = (
  profile: GameBoardLayoutProfile,
  {
    sidePanelWidth,
    topPanelWidth,
    sideZoneWidth,
    centerZoneWidth,
  }: Pick<GameBoardLayout, 'sidePanelWidth' | 'topPanelWidth' | 'sideZoneWidth' | 'centerZoneWidth'>
): GameBoardLayout => {
  const boardContentWidth = sideZoneWidth * 2 + centerZoneWidth;

  return {
    profile,
    sidePanelWidth,
    topPanelWidth,
    sideZoneWidth,
    centerZoneWidth,
    boardContentWidth,
    boardColumns: `${sideZoneWidth}px ${centerZoneWidth}px ${sideZoneWidth}px`,
    boardShellColumns: `${topPanelWidth}px ${boardContentWidth}px ${sidePanelWidth}px`,
  };
};

export const desktopGameBoardLayout = buildLayout('desktop', {
  sidePanelWidth: 220,
  topPanelWidth: 188,
  sideZoneWidth: 140,
  centerZoneWidth: 800,
});

export const tabletGameBoardLayout = buildLayout('tablet', {
  sidePanelWidth: 180,
  topPanelWidth: 148,
  sideZoneWidth: 120,
  centerZoneWidth: 640,
});

const resolveTabletLayout = (viewportWidth: number): GameBoardLayout => {
  const boardShellWidth = clamp(
    Math.round(viewportWidth - TABLET_VIEWPORT_HORIZONTAL_RESERVED),
    TABLET_MIN_SHELL_WIDTH,
    TABLET_MAX_SHELL_WIDTH
  );

  const topPanelWidth = clamp(Math.round(boardShellWidth * 0.14), 112, 148);
  const sidePanelWidth = clamp(Math.round(boardShellWidth * 0.16), 128, 180);
  const boardContentWidth = boardShellWidth - topPanelWidth - sidePanelWidth - (BOARD_SHELL_COLUMN_GAP * 2);

  let sideZoneWidth = clamp(Math.round(boardContentWidth * 0.125), 80, 104);
  let centerZoneWidth = boardContentWidth - (sideZoneWidth * 2);

  if (centerZoneWidth < 360) {
    sideZoneWidth = Math.max(90, Math.floor((boardContentWidth - 360) / 2));
    centerZoneWidth = boardContentWidth - (sideZoneWidth * 2);
  }

  return buildLayout('tablet', {
    sidePanelWidth,
    topPanelWidth,
    sideZoneWidth,
    centerZoneWidth,
  });
};

export const isTabletViewportWidth = (viewportWidth: number): boolean => (
  viewportWidth >= TABLET_MIN_WIDTH && viewportWidth < DESKTOP_MIN_WIDTH
);

export const getLayoutProfileForViewportWidth = (
  viewportWidth: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse'
): GameBoardLayoutProfile => {
  if (!isTabletViewportWidth(viewportWidth)) {
    return 'desktop';
  }

  return inputProfile === 'coarse' ? 'tablet' : 'desktop';
};

export const resolveBoardLayout = (
  viewportWidth: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse'
): GameBoardLayout => {
  const profile = getLayoutProfileForViewportWidth(viewportWidth, inputProfile);
  return profile === 'tablet' ? resolveTabletLayout(viewportWidth) : desktopGameBoardLayout;
};

export const getBoardDensityForViewportWidth = (
  viewportWidth: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse'
): GameBoardBoardDensity => (
  viewportWidth >= DESKTOP_MIN_WIDTH && inputProfile === 'fine' ? 'overview' : 'standard'
);

// Keep legacy exports as desktop defaults to avoid changing the existing PC path.
export const sidePanelWidth = desktopGameBoardLayout.sidePanelWidth;
export const topPanelWidth = desktopGameBoardLayout.topPanelWidth;
export const sideZoneWidth = desktopGameBoardLayout.sideZoneWidth;
export const centerZoneWidth = desktopGameBoardLayout.centerZoneWidth;
export const boardContentWidth = desktopGameBoardLayout.boardContentWidth;
export const boardColumns = desktopGameBoardLayout.boardColumns;
export const boardShellColumns = desktopGameBoardLayout.boardShellColumns;

export const soloMulliganButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '-10px',
  right: '10px',
  padding: '0.5rem 1rem',
  background: '#eab308',
  color: 'black',
  fontWeight: 'bold',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  border: '2px solid black',
};

export const activeBoardSectionStyle = (isActive: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  width: '100%',
  alignItems: 'center',
  padding: '0.55rem 0.6rem',
  borderRadius: '16px',
  border: isActive ? '1px solid rgba(34, 211, 238, 0.38)' : '1px solid transparent',
  background: isActive ? 'linear-gradient(180deg, rgba(34, 211, 238, 0.08), rgba(15, 23, 42, 0.02))' : 'transparent',
  boxShadow: isActive ? '0 0 0 1px rgba(34, 211, 238, 0.12), 0 0 28px rgba(34, 211, 238, 0.14)' : 'none',
  transition: 'all 0.2s ease',
});
