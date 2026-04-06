type HostConnectionOpenDecision = {
  type: 'host';
  statusKey: 'gameBoard.status.guestConnectedReady';
};

type GuestConnectionOpenDecision = {
  type: 'guest';
  statusKey: 'gameBoard.status.connectedHostSyncing';
  shouldAwaitInitialSnapshot: true;
  shouldRequestSnapshot: true;
};

export type ConnectionOpenDecision =
  | HostConnectionOpenDecision
  | GuestConnectionOpenDecision;

export const getConnectionOpenDecision = ({
  isHost,
}: {
  isHost: boolean;
}): ConnectionOpenDecision => {
  if (isHost) {
    return {
      type: 'host',
      statusKey: 'gameBoard.status.guestConnectedReady',
    };
  }

  return {
    type: 'guest',
    statusKey: 'gameBoard.status.connectedHostSyncing',
    shouldAwaitInitialSnapshot: true,
    shouldRequestSnapshot: true,
  };
};
