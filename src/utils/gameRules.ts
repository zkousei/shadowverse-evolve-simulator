import type { PlayerRole, SyncState } from '../types/game';

export const canImportDeck = (
  state: SyncState,
  targetRole: PlayerRole
): boolean => {
  if (state.gameStatus !== 'preparing') return false;

  const player = state[targetRole];
  return !player.initialHandDrawn && !player.mulliganUsed && !player.isReady;
};

export const isHandCardMovementLocked = (
  state: SyncState
): boolean => state.gameStatus === 'preparing';

export const canUndoLastTurn = (
  state: SyncState,
  lastGameState: any,
  role: PlayerRole,
  isSoloMode: boolean
): boolean => {
  return !!lastGameState && state.gameStatus === 'playing' && (isSoloMode || state.turnPlayer !== role);
};
