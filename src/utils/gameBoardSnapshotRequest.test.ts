import { describe, expect, it } from 'vitest';
import { getSnapshotRequestDecision } from './gameBoardSnapshotRequest';

describe('getSnapshotRequestDecision', () => {
  it('ignores snapshot requests on the guest side', () => {
    expect(getSnapshotRequestDecision({
      isHost: false,
      hasSavedSessionCandidate: false,
    })).toEqual({ type: 'ignore' });
  });

  it('waits for the host session decision when a saved session candidate exists', () => {
    expect(getSnapshotRequestDecision({
      isHost: true,
      hasSavedSessionCandidate: true,
    })).toEqual({
      type: 'wait-for-host-session',
      statusKey: 'gameBoard.status.guestConnectedChooseResume',
    });
  });

  it('sends a snapshot when the host has no saved session candidate', () => {
    expect(getSnapshotRequestDecision({
      isHost: true,
      hasSavedSessionCandidate: false,
    })).toEqual({ type: 'send-snapshot' });
  });
});
