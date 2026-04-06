import type { PlayerRole, SyncState } from '../types/game';

export type TurnMessageDecision =
  | { type: 'clear' }
  | {
      type: 'show';
      key: 'gameBoard.turn.p1' | 'gameBoard.turn.your';
      options?: { label: 'PLAYER 1' | 'PLAYER 2' };
      durationMs: 2500;
    }
  | { type: 'skip' };

export const getTurnMessageDecision = ({
  gameStatus,
  isSoloMode,
  role,
  turnCount,
  turnPlayer,
}: {
  gameStatus: SyncState['gameStatus'];
  isSoloMode: boolean;
  role: PlayerRole;
  turnCount: number;
  turnPlayer: PlayerRole;
}): TurnMessageDecision => {
  if (gameStatus !== 'playing') {
    return { type: 'clear' };
  }

  if (!isSoloMode && turnPlayer !== role) {
    return { type: 'clear' };
  }

  // Keep the current behavior: initial turnCount 0 does not clear an existing
  // message; it simply avoids showing a new one.
  if (turnCount === 0) {
    return { type: 'skip' };
  }

  if (isSoloMode) {
    return {
      type: 'show',
      key: 'gameBoard.turn.p1',
      options: { label: turnPlayer === 'host' ? 'PLAYER 1' : 'PLAYER 2' },
      durationMs: 2500,
    };
  }

  return {
    type: 'show',
    key: 'gameBoard.turn.your',
    durationMs: 2500,
  };
};
