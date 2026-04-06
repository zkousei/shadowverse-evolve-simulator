import { describe, expect, it } from 'vitest';
import { getSnapshotApplicationDecision } from './gameBoardSnapshotApplication';
import { initialState, type SyncState } from '../types/game';

const buildState = (revision: number): SyncState => ({
  ...initialState,
  revision,
});

describe('getSnapshotApplicationDecision', () => {
  it('applies and clears awaiting state for the first host snapshot on the guest side', () => {
    expect(getSnapshotApplicationDecision({
      currentState: buildState(7),
      incomingState: buildState(3),
      source: 'host',
      isHost: false,
      isAwaitingInitialSnapshot: true,
    })).toEqual({
      shouldApply: true,
      shouldClearAwaitingInitialSnapshot: true,
    });
  });

  it('ignores stale snapshots and does not clear awaiting state', () => {
    expect(getSnapshotApplicationDecision({
      currentState: buildState(7),
      incomingState: buildState(6),
      source: 'host',
      isHost: false,
      isAwaitingInitialSnapshot: false,
    })).toEqual({
      shouldApply: false,
      shouldClearAwaitingInitialSnapshot: false,
    });
  });
});
