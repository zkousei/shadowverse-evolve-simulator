import type { SyncMessage } from '../types/sync';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

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
