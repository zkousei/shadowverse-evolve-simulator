import { describe, expect, it } from 'vitest';
import { getConnectionOpenDecision } from './gameBoardConnectionOpen';

describe('getConnectionOpenDecision', () => {
  it('returns the host ready decision', () => {
    expect(getConnectionOpenDecision({ isHost: true })).toEqual({
      type: 'host',
      statusKey: 'gameBoard.status.guestConnectedReady',
    });
  });

  it('returns the guest snapshot sync decision', () => {
    expect(getConnectionOpenDecision({ isHost: false })).toEqual({
      type: 'guest',
      statusKey: 'gameBoard.status.connectedHostSyncing',
      shouldAwaitInitialSnapshot: true,
      shouldRequestSnapshot: true,
    });
  });
});
