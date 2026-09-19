export type SnapshotRetryTimeoutDecision = 'cancel' | 'retry' | 'reconnect';

export const getSnapshotRetryTimeoutDecision = ({
  isCurrentConnection,
  retryCount,
  maxRetries,
}: {
  isCurrentConnection: boolean;
  retryCount: number;
  maxRetries: number;
}): SnapshotRetryTimeoutDecision => {
  if (!isCurrentConnection) {
    return 'cancel';
  }

  if (retryCount >= maxRetries) {
    return 'reconnect';
  }

  return 'retry';
};
