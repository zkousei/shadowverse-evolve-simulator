import { describe, expect, it } from 'vitest';
import { getConnectionTerminationDecision } from './gameBoardConnectionTermination';

describe('getConnectionTerminationDecision', () => {
  it('returns the host-side disconnect status for close events', () => {
    expect(getConnectionTerminationDecision({ isHost: true, kind: 'close' })).toEqual({
      type: 'host',
      nextConnectionState: 'disconnected',
      statusKey: 'gameBoard.status.guestDisconnectedWaiting',
    });
  });

  it('returns the host-side error status for error events', () => {
    expect(getConnectionTerminationDecision({ isHost: true, kind: 'error' })).toEqual({
      type: 'host',
      nextConnectionState: 'disconnected',
      statusKey: 'gameBoard.status.connectionErrorWaiting',
    });
  });

  it('returns reconnect statuses for guest connections', () => {
    expect(getConnectionTerminationDecision({ isHost: false, kind: 'close' })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.connectionLostReconnecting',
    });
    expect(getConnectionTerminationDecision({ isHost: false, kind: 'error' })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.connectionErrorReconnecting',
    });
  });
});
