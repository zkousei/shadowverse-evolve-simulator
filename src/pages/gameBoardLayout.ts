import type { CSSProperties } from 'react';

export type GameBoardLayoutProfile = 'desktop' | 'tablet';

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

export const getLayoutProfileForViewportWidth = (viewportWidth: number): GameBoardLayoutProfile => {
  if (viewportWidth >= TABLET_MIN_WIDTH && viewportWidth < DESKTOP_MIN_WIDTH) {
    return 'tablet';
  }

  return 'desktop';
};

export const resolveBoardLayout = (viewportWidth: number): GameBoardLayout => {
  const profile = getLayoutProfileForViewportWidth(viewportWidth);
  return profile === 'tablet' ? tabletGameBoardLayout : desktopGameBoardLayout;
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
