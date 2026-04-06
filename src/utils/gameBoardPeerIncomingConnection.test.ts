import { describe, expect, it } from 'vitest';
import { getPeerIncomingConnectionDecision } from './gameBoardPeerIncomingConnection';

describe('getPeerIncomingConnectionDecision', () => {
  it('sets up incoming peer connections on the host side', () => {
    expect(getPeerIncomingConnectionDecision({ isHost: true })).toEqual({
      type: 'setup-connection',
    });
  });

  it('ignores incoming peer connections on the guest side', () => {
    expect(getPeerIncomingConnectionDecision({ isHost: false })).toEqual({
      type: 'ignore',
    });
  });
});
