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

export type GameBoardLayoutSpacing = {
  boardShellPadding: string;
  boardShellGap: string;
  playmatPadding: string;
  playmatGap: string;
  boardSectionPadding: string;
  boardSectionGap: string;
  boardShellColumnGap: string;
  bottomPanelMarginLeft: string;
  boardColumnStackGap: string;
  bottomBoardRowSecondaryMarginTop: string;
  boardSectionDividerMargin: string;
  boardRowGap: string;
  stackZoneMinHeight: string;
  fieldZoneMinHeight: string;
  handZoneMinHeight: string;
  bottomHandZoneMinHeight: string;
  leaderZoneMinHeight: string;
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

export const overviewDesktopGameBoardLayout = buildLayout('desktop', {
  sidePanelWidth: 176,
  topPanelWidth: 150,
  sideZoneWidth: 112,
  centerZoneWidth: 640,
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
  inputProfile: GameBoardLayoutInputProfile = 'coarse',
  boardDensity: GameBoardBoardDensity = 'standard'
): GameBoardLayout => {
  const profile = getLayoutProfileForViewportWidth(viewportWidth, inputProfile);
  if (profile === 'tablet') return resolveTabletLayout(viewportWidth);
  return boardDensity === 'overview' ? overviewDesktopGameBoardLayout : desktopGameBoardLayout;
};

export const getBoardDensityForViewportWidth = (
  viewportWidth: number,
  _viewportHeight: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse'
): GameBoardBoardDensity => (
  viewportWidth >= DESKTOP_MIN_WIDTH && inputProfile === 'fine'
    ? 'overview'
    : 'standard'
);

export const resolveBoardLayoutSpacing = (
  inputProfile: GameBoardLayoutInputProfile = 'coarse',
  layoutProfile: GameBoardLayoutProfile = 'desktop',
  boardDensity: GameBoardBoardDensity = 'standard'
): GameBoardLayoutSpacing => {
  const isCompactBoard = inputProfile === 'coarse';
  const isTabletCompactBoard = isCompactBoard && layoutProfile === 'tablet';
  const isOverviewBoard = boardDensity === 'overview';

  if (isTabletCompactBoard) {
    return {
      boardShellPadding: '0.42rem',
      boardShellGap: '0.34rem',
      playmatPadding: '0.32rem',
      playmatGap: '0.18rem',
      boardSectionPadding: '0.2rem 0.24rem',
      boardSectionGap: '0.16rem',
      boardShellColumnGap: '0.5rem',
      bottomPanelMarginLeft: '1.35rem',
      boardColumnStackGap: '0.28rem',
      bottomBoardRowSecondaryMarginTop: '0.2rem',
      boardSectionDividerMargin: '0.24rem 0',
      boardRowGap: '0.42rem',
      stackZoneMinHeight: '104px',
      fieldZoneMinHeight: '116px',
      handZoneMinHeight: '108px',
      bottomHandZoneMinHeight: '116px',
      leaderZoneMinHeight: '120px',
    };
  }

  if (isOverviewBoard) {
    return {
      boardShellPadding: '0.44rem',
      boardShellGap: '0.36rem',
      playmatPadding: '0.38rem',
      playmatGap: '0.18rem',
      boardSectionPadding: '0.22rem 0.26rem',
      boardSectionGap: '0.18rem',
      boardShellColumnGap: '0.56rem',
      bottomPanelMarginLeft: '1.5rem',
      boardColumnStackGap: '0.24rem',
      bottomBoardRowSecondaryMarginTop: '0',
      boardSectionDividerMargin: '0.12rem 0',
      boardRowGap: '0.5rem',
      stackZoneMinHeight: '96px',
      fieldZoneMinHeight: '106px',
      handZoneMinHeight: '100px',
      bottomHandZoneMinHeight: '106px',
      leaderZoneMinHeight: '110px',
    };
  }

  if (isCompactBoard) {
    return {
      boardShellPadding: '0.52rem',
      boardShellGap: '0.48rem',
      playmatPadding: '0.42rem',
      playmatGap: '0.24rem',
      boardSectionPadding: '0.28rem 0.32rem',
      boardSectionGap: '0.22rem',
      boardShellColumnGap: '0.5rem',
      bottomPanelMarginLeft: '1.1rem',
      boardColumnStackGap: '0.34rem',
      bottomBoardRowSecondaryMarginTop: '0',
      boardSectionDividerMargin: '0.4rem 0',
      boardRowGap: '0.5rem',
      stackZoneMinHeight: '110px',
      fieldZoneMinHeight: '124px',
      handZoneMinHeight: '116px',
      bottomHandZoneMinHeight: '124px',
      leaderZoneMinHeight: '150px',
    };
  }

  return {
    boardShellPadding: '1rem',
    boardShellGap: '1rem',
    playmatPadding: '1rem',
    playmatGap: '0.5rem',
    boardSectionPadding: '0.55rem 0.6rem',
    boardSectionGap: '0.5rem',
    boardShellColumnGap: '1rem',
    bottomPanelMarginLeft: '1.25rem',
    boardColumnStackGap: '0.65rem',
    bottomBoardRowSecondaryMarginTop: '0',
    boardSectionDividerMargin: '1rem 0',
    boardRowGap: '0.75rem',
    stackZoneMinHeight: '150px',
    fieldZoneMinHeight: '160px',
    handZoneMinHeight: '150px',
    bottomHandZoneMinHeight: '160px',
    leaderZoneMinHeight: '150px',
  };
};

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
