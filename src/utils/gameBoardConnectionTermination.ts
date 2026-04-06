export type ConnectionTerminationKind = 'close' | 'error';

export type ConnectionTerminationDecision =
  | {
      type: 'host';
      nextConnectionState: 'disconnected';
      statusKey: 'gameBoard.status.guestDisconnectedWaiting' | 'gameBoard.status.connectionErrorWaiting';
    }
  | {
      type: 'guest';
      statusKey: 'gameBoard.status.connectionLostReconnecting' | 'gameBoard.status.connectionErrorReconnecting';
    };

export const getConnectionTerminationDecision = ({
  isHost,
  kind,
}: {
  isHost: boolean;
  kind: ConnectionTerminationKind;
}): ConnectionTerminationDecision => {
  if (isHost) {
    return {
      type: 'host',
      nextConnectionState: 'disconnected',
      statusKey: kind === 'close'
        ? 'gameBoard.status.guestDisconnectedWaiting'
        : 'gameBoard.status.connectionErrorWaiting',
    };
  }

  return {
    type: 'guest',
    statusKey: kind === 'close'
      ? 'gameBoard.status.connectionLostReconnecting'
      : 'gameBoard.status.connectionErrorReconnecting',
  };
};
