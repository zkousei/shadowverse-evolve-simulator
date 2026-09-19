import { describe, expect, it } from 'vitest';
import { getPeerTerminationDecision } from './gameBoardPeerTermination';

describe('getPeerTerminationDecision', () => {
  it('returns the host disconnected waiting status', () => {
    expect(getPeerTerminationDecision({ isHost: true, kind: 'disconnected' })).toEqual({
      type: 'host',
      statusKey: 'gameBoard.status.disconnectedFromPeer',
    });
  });

  it('returns the host p2p error waiting status', () => {
    expect(getPeerTerminationDecision({ isHost: true, kind: 'error' })).toEqual({
      type: 'host',
      statusKey: 'gameBoard.status.p2pErrorWaiting',
    });
  });

  it('returns the guest reconnect status after peer disconnect', () => {
    expect(getPeerTerminationDecision({ isHost: false, kind: 'disconnected' })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.peerConnectionLostReconnecting',
    });
  });

  it('returns the guest reconnect status after peer error', () => {
    expect(getPeerTerminationDecision({ isHost: false, kind: 'error' })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.unableToReachHostReconnecting',
    });
  });
});
