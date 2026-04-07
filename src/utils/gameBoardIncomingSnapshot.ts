import type { SyncMessage } from '../types/sync';
import { getIncomingSharedUiEffects } from './gameBoardIncomingSharedUiEffects';
import { getSnapshotPostProcessingDecision } from './gameBoardSnapshotPostProcessing';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

export const getIncomingSnapshotHandling = ({
  isHost,
  message,
  isAwaitingInitialSnapshot,
  currentGameStatus,
}: {
  isHost: boolean;
  message: SnapshotMessage;
  isAwaitingInitialSnapshot: boolean;
  currentGameStatus: SnapshotMessage['state']['gameStatus'];
}) => ({
  state: message.state,
  source: message.source,
  sharedUiEffects: getIncomingSharedUiEffects(message),
  postProcessing: getSnapshotPostProcessingDecision({
    isHost,
    source: message.source,
    isAwaitingInitialSnapshot,
    currentGameStatus,
    incomingGameStatus: message.state.gameStatus,
  }),
});
