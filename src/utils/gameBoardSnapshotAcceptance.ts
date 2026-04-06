import type { PlayerRole, SyncState } from '../types/game';

export const shouldApplyIncomingSnapshot = ({
  currentState,
  incomingState,
  source,
  isHost,
  isAwaitingInitialSnapshot,
}: {
  currentState: SyncState;
  incomingState: SyncState;
  source: PlayerRole;
  isHost: boolean;
  isAwaitingInitialSnapshot: boolean;
}): boolean => {
  if (!isHost && source === 'host' && isAwaitingInitialSnapshot) {
    return true;
  }

  const currentRevision = currentState.revision;
  if (incomingState.revision < currentRevision) return false;
  if (incomingState.revision === currentRevision && !(source === 'host' && !isHost)) return false;

  return true;
};
