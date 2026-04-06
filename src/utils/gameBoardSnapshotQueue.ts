import type { SyncMessage } from '../types/sync';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

type SnapshotBufferState = {
  open?: boolean;
  bufferSize?: unknown;
  dataChannel?: {
    bufferedAmount?: number;
  };
};

export const shouldDeferSnapshotMessageSend = (
  connection: SnapshotBufferState | null
): boolean => {
  if (!connection?.open) return false;

  const bufferedMessageCount = typeof connection.bufferSize === 'number'
    ? connection.bufferSize
    : 0;

  return bufferedMessageCount > 0 || (connection.dataChannel?.bufferedAmount ?? 0) > 0;
};

export const mergeQueuedSnapshotMessage = (
  existingSnapshot: SnapshotMessage,
  incomingSnapshot: SnapshotMessage
): SnapshotMessage => ({
  ...incomingSnapshot,
  // Preserve the current queue semantics exactly: once a snapshot has entered
  // the deferred queue, the merged message always carries a concrete array.
  pendingEffects: [
    ...(existingSnapshot.pendingEffects ?? []),
    ...(incomingSnapshot.pendingEffects ?? []),
  ],
});
