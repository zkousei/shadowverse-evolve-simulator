type PeerTerminationKind = 'disconnected' | 'error';

type HostPeerTerminationDecision = {
  type: 'host';
  statusKey: 'gameBoard.status.disconnectedFromPeer' | 'gameBoard.status.p2pErrorWaiting';
};

type GuestPeerTerminationDecision = {
  type: 'guest';
  statusKey: 'gameBoard.status.peerConnectionLostReconnecting' | 'gameBoard.status.unableToReachHostReconnecting';
};

export type PeerTerminationDecision =
  | HostPeerTerminationDecision
  | GuestPeerTerminationDecision;

export const getPeerTerminationDecision = ({
  isHost,
  kind,
}: {
  isHost: boolean;
  kind: PeerTerminationKind;
}): PeerTerminationDecision => {
  if (isHost) {
    return {
      type: 'host',
      statusKey:
        kind === 'disconnected'
          ? 'gameBoard.status.disconnectedFromPeer'
          : 'gameBoard.status.p2pErrorWaiting',
    };
  }

  return {
    type: 'guest',
    statusKey:
      kind === 'disconnected'
        ? 'gameBoard.status.peerConnectionLostReconnecting'
        : 'gameBoard.status.unableToReachHostReconnecting',
  };
};
