import { describe, expect, it } from 'vitest';
import { getPeerOpenDecision } from './gameBoardPeerOpen';

describe('getPeerOpenDecision', () => {
  it('returns the host waiting decision', () => {
    expect(getPeerOpenDecision({ isHost: true })).toEqual({
      type: 'host',
      statusKey: 'gameBoard.status.connectedWaitingGuest',
      nextConnectionState: 'disconnected',
    });
  });

  it('returns the guest join decision', () => {
    expect(getPeerOpenDecision({ isHost: false })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.connectedJoiningRoom',
      shouldConnectToHost: true,
    });
  });
});
