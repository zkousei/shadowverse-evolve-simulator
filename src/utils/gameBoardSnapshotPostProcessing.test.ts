import { describe, expect, it } from 'vitest';
import { getSnapshotPostProcessingDecision } from './gameBoardSnapshotPostProcessing';

describe('getSnapshotPostProcessingDecision', () => {
  it('returns guest ready processing for host snapshots on the guest side', () => {
    expect(getSnapshotPostProcessingDecision({
      isHost: false,
      source: 'host',
      isAwaitingInitialSnapshot: true,
      currentGameStatus: 'preparing',
      incomingGameStatus: 'playing',
    })).toEqual({
      type: 'guest-ready',
      statusKey: 'gameBoard.status.connectedHostReady',
      shouldResetTransientUi: true,
      preserveUndoState: true,
    });
  });

  it('returns no extra processing for host-side snapshots', () => {
    expect(getSnapshotPostProcessingDecision({
      isHost: true,
      source: 'guest',
      isAwaitingInitialSnapshot: true,
      currentGameStatus: 'preparing',
      incomingGameStatus: 'playing',
    })).toEqual({
      type: 'none',
    });
  });

  it('returns no extra processing for non-host snapshots on the guest side', () => {
    expect(getSnapshotPostProcessingDecision({
      isHost: false,
      source: 'guest',
      isAwaitingInitialSnapshot: true,
      currentGameStatus: 'preparing',
      incomingGameStatus: 'playing',
    })).toEqual({
      type: 'none',
    });
  });

  it('keeps transient UI during normal same-status host snapshots', () => {
    expect(getSnapshotPostProcessingDecision({
      isHost: false,
      source: 'host',
      isAwaitingInitialSnapshot: false,
      currentGameStatus: 'playing',
      incomingGameStatus: 'playing',
    })).toEqual({
      type: 'guest-ready',
      statusKey: 'gameBoard.status.connectedHostReady',
      shouldResetTransientUi: false,
      preserveUndoState: true,
    });
  });
});
