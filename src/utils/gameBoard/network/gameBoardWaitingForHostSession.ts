type IgnoreWaitingForHostSessionDecision = {
  type: 'ignore';
};

type SetWaitingForHostDecision = {
  type: 'set-status';
  statusKey: 'gameBoard.status.waitingForHostDecision';
};

export type WaitingForHostSessionDecision =
  | IgnoreWaitingForHostSessionDecision
  | SetWaitingForHostDecision;

export const getWaitingForHostSessionDecision = ({
  isHost,
}: {
  isHost: boolean;
}): WaitingForHostSessionDecision => {
  if (isHost) {
    return { type: 'ignore' };
  }

  return {
    type: 'set-status',
    statusKey: 'gameBoard.status.waitingForHostDecision',
  };
};
