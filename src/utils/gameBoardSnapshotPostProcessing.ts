import type { PlayerRole } from '../types/game';
import type { SyncState } from '../types/game';

type NoSnapshotPostProcessingDecision = {
  type: 'none';
};

type GuestReadySnapshotPostProcessingDecision = {
  type: 'guest-ready';
  statusKey: 'gameBoard.status.connectedHostReady';
  shouldResetTransientUi: boolean;
  preserveUndoState: true;
};

export type SnapshotPostProcessingDecision =
  | NoSnapshotPostProcessingDecision
  | GuestReadySnapshotPostProcessingDecision;

export const getSnapshotPostProcessingDecision = ({
  isHost,
  source,
  isAwaitingInitialSnapshot,
  currentGameStatus,
  incomingGameStatus,
}: {
  isHost: boolean;
  source: PlayerRole;
  isAwaitingInitialSnapshot: boolean;
  currentGameStatus: SyncState['gameStatus'];
  incomingGameStatus: SyncState['gameStatus'];
}): SnapshotPostProcessingDecision => {
  if (!isHost && source === 'host') {
    return {
      type: 'guest-ready',
      statusKey: 'gameBoard.status.connectedHostReady',
      shouldResetTransientUi: isAwaitingInitialSnapshot || currentGameStatus !== incomingGameStatus,
      preserveUndoState: true,
    };
  }

  return { type: 'none' };
};
