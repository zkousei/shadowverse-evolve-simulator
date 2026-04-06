import { describe, expect, it } from 'vitest';
import { shouldClearAwaitingInitialSnapshot } from './gameBoardSnapshotAwaiting';

describe('shouldClearAwaitingInitialSnapshot', () => {
  it('clears awaiting state after the first host snapshot on the guest side', () => {
    expect(shouldClearAwaitingInitialSnapshot({
      isHost: false,
      source: 'host',
      isAwaitingInitialSnapshot: true,
    })).toBe(true);
  });

  it('does not clear awaiting state for guest-sourced snapshots', () => {
    expect(shouldClearAwaitingInitialSnapshot({
      isHost: false,
      source: 'guest',
      isAwaitingInitialSnapshot: true,
    })).toBe(false);
  });

  it('does not clear awaiting state on the host side', () => {
    expect(shouldClearAwaitingInitialSnapshot({
      isHost: true,
      source: 'host',
      isAwaitingInitialSnapshot: true,
    })).toBe(false);
  });

  it('does not clear awaiting state when it is already false', () => {
    expect(shouldClearAwaitingInitialSnapshot({
      isHost: false,
      source: 'host',
      isAwaitingInitialSnapshot: false,
    })).toBe(false);
  });
});
