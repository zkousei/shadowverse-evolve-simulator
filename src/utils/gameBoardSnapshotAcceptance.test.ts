import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../types/game';
import { shouldApplyIncomingSnapshot } from './gameBoardSnapshotAcceptance';

const buildState = (overrides: Partial<SyncState> = {}): SyncState => ({
  ...initialState,
  ...overrides,
  host: {
    ...initialState.host,
    ...overrides.host,
  },
  guest: {
    ...initialState.guest,
    ...overrides.guest,
  },
  tokenOptions: {
    ...initialState.tokenOptions,
    ...overrides.tokenOptions,
  },
});

describe('shouldApplyIncomingSnapshot', () => {
  it('accepts the first host snapshot while a guest is awaiting initial sync', () => {
    expect(shouldApplyIncomingSnapshot({
      currentState: buildState({ revision: 7 }),
      incomingState: buildState({ revision: 0 }),
      source: 'host',
      isHost: false,
      isAwaitingInitialSnapshot: true,
    })).toBe(true);
  });

  it('rejects stale snapshots with a lower revision once initial sync has completed', () => {
    expect(shouldApplyIncomingSnapshot({
      currentState: buildState({ revision: 7 }),
      incomingState: buildState({ revision: 6 }),
      source: 'host',
      isHost: false,
      isAwaitingInitialSnapshot: false,
    })).toBe(false);
  });

  it('accepts same-revision snapshots from the host on the guest side', () => {
    expect(shouldApplyIncomingSnapshot({
      currentState: buildState({ revision: 7 }),
      incomingState: buildState({ revision: 7 }),
      source: 'host',
      isHost: false,
      isAwaitingInitialSnapshot: false,
    })).toBe(true);
  });

  it('rejects same-revision snapshots in the other cases', () => {
    expect(shouldApplyIncomingSnapshot({
      currentState: buildState({ revision: 7 }),
      incomingState: buildState({ revision: 7 }),
      source: 'guest',
      isHost: false,
      isAwaitingInitialSnapshot: false,
    })).toBe(false);

    expect(shouldApplyIncomingSnapshot({
      currentState: buildState({ revision: 7 }),
      incomingState: buildState({ revision: 7 }),
      source: 'host',
      isHost: true,
      isAwaitingInitialSnapshot: false,
    })).toBe(false);
  });
});
