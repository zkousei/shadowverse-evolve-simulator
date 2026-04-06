import { describe, expect, it } from 'vitest';
import { getSnapshotRetryTimeoutDecision } from './gameBoardSnapshotRetry';

describe('getSnapshotRetryTimeoutDecision', () => {
  it('cancels stale timers from replaced connections', () => {
    expect(getSnapshotRetryTimeoutDecision({
      isCurrentConnection: false,
      retryCount: 0,
      maxRetries: 2,
    })).toBe('cancel');
  });

  it('retries while the active connection is still under the retry limit', () => {
    expect(getSnapshotRetryTimeoutDecision({
      isCurrentConnection: true,
      retryCount: 1,
      maxRetries: 2,
    })).toBe('retry');
  });

  it('reconnects once the retry limit has been exhausted', () => {
    expect(getSnapshotRetryTimeoutDecision({
      isCurrentConnection: true,
      retryCount: 2,
      maxRetries: 2,
    })).toBe('reconnect');
  });
});
