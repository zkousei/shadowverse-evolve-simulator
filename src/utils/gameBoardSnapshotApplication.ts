import type { PlayerRole, SyncState } from '../types/game';
import { shouldApplyIncomingSnapshot } from './gameBoardSnapshotAcceptance';
import { shouldClearAwaitingInitialSnapshot } from './gameBoardSnapshotAwaiting';

export const getSnapshotApplicationDecision = ({
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
}) => {
  const shouldApply = shouldApplyIncomingSnapshot({
    currentState,
    incomingState,
    source,
    isHost,
    isAwaitingInitialSnapshot,
  });

  return {
    shouldApply,
    shouldClearAwaitingInitialSnapshot: shouldApply
      ? shouldClearAwaitingInitialSnapshot({
          isHost,
          source,
          isAwaitingInitialSnapshot,
        })
      : false,
  };
};
