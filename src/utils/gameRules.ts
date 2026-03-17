import type { PlayerRole, SyncState } from '../types/game';

export const canImportDeck = (
  state: SyncState,
  targetRole: PlayerRole
): boolean => {
  if (state.gameStatus !== 'preparing') return false;

  const player = state[targetRole];
  return !player.initialHandDrawn && !player.mulliganUsed && !player.isReady;
};
