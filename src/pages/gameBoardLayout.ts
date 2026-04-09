import type { CSSProperties } from 'react';

export const sidePanelWidth = 220;
export const topPanelWidth = 188;
export const sideZoneWidth = 140;
export const centerZoneWidth = 800;
export const boardContentWidth = sideZoneWidth * 2 + centerZoneWidth;
export const boardColumns = `${sideZoneWidth}px ${centerZoneWidth}px ${sideZoneWidth}px`;
export const boardShellColumns = `${topPanelWidth}px ${boardContentWidth}px ${sidePanelWidth}px`;

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
