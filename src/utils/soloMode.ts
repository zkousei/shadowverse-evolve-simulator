import type { PlayerRole } from '../types/game';

export const getZoneOwner = (zoneId: string): PlayerRole | null => {
  if (zoneId.endsWith('-host')) return 'host';
  if (zoneId.endsWith('-guest')) return 'guest';
  return null;
};

export const getPlayerLabel = (
  role: PlayerRole,
  isSoloMode: boolean,
  fallbackSelf: string,
  fallbackOpponent: string,
  currentRole: PlayerRole
): string => {
  if (!isSoloMode) {
    return role === currentRole ? fallbackSelf : fallbackOpponent;
  }
  return role === 'host' ? 'Player 1' : 'Player 2';
};
