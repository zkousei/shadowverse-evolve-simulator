import type { PlayerRole, SyncState } from '../types/game';

export const canImportDeck = (
  state: SyncState,
  targetRole: PlayerRole
): boolean => {
  if (state.gameStatus !== 'preparing') return false;

  const player = state[targetRole];
  return !player.initialHandDrawn && !player.mulliganUsed && !player.isReady;
};

export const canUndoLastTurn = (
  state: SyncState,
  lastGameState: SyncState | null,
  role: PlayerRole,
  isSoloMode: boolean
): boolean => {
  if (!lastGameState) return false;
  if (state.gameStatus !== 'playing') return false;
  return isSoloMode || state.turnPlayer !== role;
};
