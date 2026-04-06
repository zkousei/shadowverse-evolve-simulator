import type { PlayerRole } from '../types/game';

type NoSnapshotPostProcessingDecision = {
  type: 'none';
};

type GuestReadySnapshotPostProcessingDecision = {
  type: 'guest-ready';
  statusKey: 'gameBoard.status.connectedHostReady';
  shouldResetTransientUi: true;
  preserveUndoState: true;
};

export type SnapshotPostProcessingDecision =
  | NoSnapshotPostProcessingDecision
  | GuestReadySnapshotPostProcessingDecision;

export const getSnapshotPostProcessingDecision = ({
  isHost,
  source,
}: {
  isHost: boolean;
  source: PlayerRole;
}): SnapshotPostProcessingDecision => {
  if (!isHost && source === 'host') {
    return {
      type: 'guest-ready',
      statusKey: 'gameBoard.status.connectedHostReady',
      shouldResetTransientUi: true,
      preserveUndoState: true,
    };
  }

  return { type: 'none' };
};
