import type { CSSProperties } from 'react';
import type { GameBoardBoardDensity } from './gameBoardBoardDensity';

export type GameBoardLayoutProfile = 'desktop' | 'tablet' | 'mobile';
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
const MOBILE_VIEWPORT_HORIZONTAL_RESERVED = 20;
const MOBILE_MIN_CONTENT_WIDTH = 300;
const MOBILE_MAX_CONTENT_WIDTH = 860;
const NARROW_DESKTOP_HORIZONTAL_RESERVED = 80;
const NARROW_DESKTOP_BOARD_SHELL_WIDTH = 1552;
const MIN_NARROW_DESKTOP_DISPLAY_SCALE = 0.25;

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

const MOBILE_LANDSCAPE_MIN_WIDTH = 640;
const MOBILE_LANDSCAPE_MAX_HEIGHT = 500;

const buildLayout = (
  profile: GameBoardLayoutProfile,
  {
    sidePanelWidth,
    topPanelWidth,
    sideZoneWidth,
    centerZoneWidth,
    isSingleColumn = false,
  }: Pick<GameBoardLayout, 'sidePanelWidth' | 'topPanelWidth' | 'sideZoneWidth' | 'centerZoneWidth'> & {
    isSingleColumn?: boolean;
  }
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
    boardShellColumns: isSingleColumn ? '1fr' : `${topPanelWidth}px ${boardContentWidth}px ${sidePanelWidth}px`,
  };
};

export const desktopGameBoardLayout = buildLayout('desktop', {
  sidePanelWidth: 220,
  topPanelWidth: 220,
  sideZoneWidth: 140,
  centerZoneWidth: 800,
});

export const overviewDesktopGameBoardLayout = buildLayout('desktop', {
  sidePanelWidth: 176,
  topPanelWidth: 176,
  sideZoneWidth: 112,
  centerZoneWidth: 640,
});

export const tabletGameBoardLayout = buildLayout('tablet', {
  sidePanelWidth: 180,
  topPanelWidth: 180,
  sideZoneWidth: 120,
  centerZoneWidth: 640,
});

const resolveMobileLayout = (viewportWidth: number): GameBoardLayout => {
  if (viewportWidth >= MOBILE_LANDSCAPE_MIN_WIDTH) {
    const boardShellWidth = clamp(
      Math.round(viewportWidth - MOBILE_VIEWPORT_HORIZONTAL_RESERVED),
      620,
      960
    );
    const controlPanelWidth = clamp(Math.round(boardShellWidth * 0.145), 96, 128);
    const availableBoardContentWidth = boardShellWidth - (controlPanelWidth * 2) - 16;
    const sideZoneWidth = clamp(Math.round(availableBoardContentWidth * 0.145), 76, 92);
    const centerZoneWidth = Math.max(240, availableBoardContentWidth - (sideZoneWidth * 2));

    return buildLayout('mobile', {
      sidePanelWidth: controlPanelWidth,
      topPanelWidth: controlPanelWidth,
      sideZoneWidth,
      centerZoneWidth,
      isSingleColumn: false,
    });
  }

  const boardContentWidth = clamp(
    Math.round(viewportWidth - MOBILE_VIEWPORT_HORIZONTAL_RESERVED),
    MOBILE_MIN_CONTENT_WIDTH,
    MOBILE_MAX_CONTENT_WIDTH
  );
  const sideZoneWidth = clamp(Math.round(boardContentWidth * 0.22), 76, 92);
  const centerZoneWidth = Math.max(148, boardContentWidth - (sideZoneWidth * 2));

  return buildLayout('mobile', {
    sidePanelWidth: boardContentWidth,
    topPanelWidth: boardContentWidth,
    sideZoneWidth,
    centerZoneWidth,
    isSingleColumn: true,
  });
};

const resolveTabletLayout = (viewportWidth: number): GameBoardLayout => {
  const boardShellWidth = clamp(
    Math.round(viewportWidth - TABLET_VIEWPORT_HORIZONTAL_RESERVED),
    TABLET_MIN_SHELL_WIDTH,
    TABLET_MAX_SHELL_WIDTH
  );

  const legacyTopPanelWidth = clamp(Math.round(boardShellWidth * 0.14), 112, 148);
  const legacySidePanelWidth = clamp(Math.round(boardShellWidth * 0.16), 128, 180);
  const controlPanelWidth = (legacyTopPanelWidth + legacySidePanelWidth) / 2;
  const topPanelWidth = controlPanelWidth;
  const sidePanelWidth = controlPanelWidth;
  const boardContentWidth = boardShellWidth - legacyTopPanelWidth - legacySidePanelWidth - (BOARD_SHELL_COLUMN_GAP * 2);

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
  inputProfile: GameBoardLayoutInputProfile = 'coarse',
  viewportHeight?: number
): GameBoardLayoutProfile => {
  if (
    inputProfile === 'coarse' &&
    viewportHeight !== undefined &&
    viewportHeight <= MOBILE_LANDSCAPE_MAX_HEIGHT &&
    viewportWidth < DESKTOP_MIN_WIDTH
  ) {
    return 'mobile';
  }

  if (viewportWidth < TABLET_MIN_WIDTH) {
    return inputProfile === 'coarse' ? 'mobile' : 'desktop';
  }

  if (!isTabletViewportWidth(viewportWidth)) {
    return 'desktop';
  }

  return inputProfile === 'coarse' ? 'tablet' : 'desktop';
};

export const resolveBoardLayout = (
  viewportWidth: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse',
  boardDensity: GameBoardBoardDensity = 'standard',
  viewportHeight?: number
): GameBoardLayout => {
  const profile = getLayoutProfileForViewportWidth(viewportWidth, inputProfile, viewportHeight);
  if (profile === 'mobile') return resolveMobileLayout(viewportWidth);
  if (profile === 'tablet') return resolveTabletLayout(viewportWidth);
  return boardDensity === 'overview' ? overviewDesktopGameBoardLayout : desktopGameBoardLayout;
};

export const resolveBoardDisplayScale = (
  viewportWidth: number,
  inputProfile: GameBoardLayoutInputProfile = 'coarse'
): number => {
  if (inputProfile !== 'fine' || viewportWidth >= DESKTOP_MIN_WIDTH) return 1;

  const availableWidth = Math.max(0, viewportWidth - NARROW_DESKTOP_HORIZONTAL_RESERVED);
  return Number(clamp(
    availableWidth / NARROW_DESKTOP_BOARD_SHELL_WIDTH,
    MIN_NARROW_DESKTOP_DISPLAY_SCALE,
    1
  ).toFixed(3));
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
  boardDensity: GameBoardBoardDensity = 'standard',
  viewportHeight?: number
): GameBoardLayoutSpacing => {
  const isCompactBoard = inputProfile === 'coarse';
  const isTabletCompactBoard = isCompactBoard && layoutProfile === 'tablet';
  const isMobileCompactBoard = isCompactBoard && layoutProfile === 'mobile';
  const isMobileLandscapeCompactBoard = (
    isMobileCompactBoard &&
    viewportHeight !== undefined &&
    viewportHeight <= MOBILE_LANDSCAPE_MAX_HEIGHT
  );
  const isOverviewBoard = boardDensity === 'overview';

  if (isMobileLandscapeCompactBoard) {
    return {
      boardShellPadding: '0.2rem',
      boardShellGap: '0.2rem',
      playmatPadding: '0.18rem',
      playmatGap: '0.14rem',
      boardSectionPadding: '0.14rem 0.18rem',
      boardSectionGap: '0.12rem',
      boardShellColumnGap: '0.28rem',
      bottomPanelMarginLeft: '0',
      boardColumnStackGap: '0.16rem',
      bottomBoardRowSecondaryMarginTop: '0.1rem',
      boardSectionDividerMargin: '0.1rem 0',
      boardRowGap: '0.22rem',
      stackZoneMinHeight: '76px',
      fieldZoneMinHeight: '88px',
      handZoneMinHeight: '76px',
      bottomHandZoneMinHeight: '84px',
      leaderZoneMinHeight: '76px',
    };
  }

  if (isMobileCompactBoard) {
    return {
      boardShellPadding: '0.28rem',
      boardShellGap: '0.28rem',
      playmatPadding: '0.24rem',
      playmatGap: '0.2rem',
      boardSectionPadding: '0.2rem',
      boardSectionGap: '0.18rem',
      boardShellColumnGap: '0.32rem',
      bottomPanelMarginLeft: '0',
      boardColumnStackGap: '0.24rem',
      bottomBoardRowSecondaryMarginTop: '0.16rem',
      boardSectionDividerMargin: '0.18rem 0',
      boardRowGap: '0.28rem',
      stackZoneMinHeight: '104px',
      fieldZoneMinHeight: '116px',
      handZoneMinHeight: '108px',
      bottomHandZoneMinHeight: '112px',
      leaderZoneMinHeight: '112px',
    };
  }

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
      stackZoneMinHeight: '116px',
      fieldZoneMinHeight: '116px',
      handZoneMinHeight: '114px',
      bottomHandZoneMinHeight: '116px',
      leaderZoneMinHeight: '116px',
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
  borderRadius: '20px',
  border: isActive ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.05)',
  background: isActive ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.1), rgba(15, 23, 42, 0.3))' : 'rgba(15, 23, 42, 0.2)',
  boxShadow: isActive ? '0 0 0 1px rgba(56, 189, 248, 0.2), 0 8px 32px rgba(14, 165, 233, 0.15)' : 'none',
  transition: 'all 0.25s ease',
});
