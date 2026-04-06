type HostPeerOpenDecision = {
  type: 'host';
  statusKey: 'gameBoard.status.connectedWaitingGuest';
  nextConnectionState: 'disconnected';
};

type GuestPeerOpenDecision = {
  type: 'guest';
  statusKey: 'gameBoard.status.connectedJoiningRoom';
  shouldConnectToHost: true;
};

export type PeerOpenDecision = HostPeerOpenDecision | GuestPeerOpenDecision;

export const getPeerOpenDecision = ({ isHost }: { isHost: boolean }): PeerOpenDecision => {
  if (isHost) {
    return {
      type: 'host',
      statusKey: 'gameBoard.status.connectedWaitingGuest',
      nextConnectionState: 'disconnected',
    };
  }

  return {
    type: 'guest',
    statusKey: 'gameBoard.status.connectedJoiningRoom',
    shouldConnectToHost: true,
  };
};
