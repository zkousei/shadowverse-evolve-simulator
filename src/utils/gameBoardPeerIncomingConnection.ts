type IgnorePeerIncomingConnectionDecision = {
  type: 'ignore';
};

type SetupPeerIncomingConnectionDecision = {
  type: 'setup-connection';
};

export type PeerIncomingConnectionDecision =
  | IgnorePeerIncomingConnectionDecision
  | SetupPeerIncomingConnectionDecision;

export const getPeerIncomingConnectionDecision = ({
  isHost,
}: {
  isHost: boolean;
}): PeerIncomingConnectionDecision => {
  if (!isHost) {
    return { type: 'ignore' };
  }

  return { type: 'setup-connection' };
};
