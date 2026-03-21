import type { PlayerRole } from '../types/game';

export const getZoneOwner = (zoneId: string): PlayerRole | null => {
  if (zoneId.endsWith('-host')) return 'host';
  if (zoneId.endsWith('-guest')) return 'guest';
  return null;
};

export const getPlayerLabel = (
  role: PlayerRole,
  isSoloMode: boolean,
  selfLabel: string,
  opponentLabel: string,
  currentRole: PlayerRole,
  player1Label: string,
  player2Label: string
): string => {
  if (!isSoloMode) {
    return role === currentRole ? selfLabel : opponentLabel;
  }
  return role === 'host' ? player1Label : player2Label;
};
