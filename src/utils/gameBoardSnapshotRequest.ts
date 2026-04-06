type IgnoreSnapshotRequestDecision = {
  type: 'ignore';
};

type WaitForHostSessionDecision = {
  type: 'wait-for-host-session';
  statusKey: 'gameBoard.status.guestConnectedChooseResume';
};

type SendSnapshotDecision = {
  type: 'send-snapshot';
};

export type SnapshotRequestDecision =
  | IgnoreSnapshotRequestDecision
  | WaitForHostSessionDecision
  | SendSnapshotDecision;

export const getSnapshotRequestDecision = ({
  isHost,
  hasSavedSessionCandidate,
}: {
  isHost: boolean;
  hasSavedSessionCandidate: boolean;
}): SnapshotRequestDecision => {
  if (!isHost) {
    return { type: 'ignore' };
  }

  if (hasSavedSessionCandidate) {
    return {
      type: 'wait-for-host-session',
      statusKey: 'gameBoard.status.guestConnectedChooseResume',
    };
  }

  return { type: 'send-snapshot' };
};
