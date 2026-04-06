import type { SyncMessage } from '../types/sync';
import { getIncomingSharedUiEffects } from './gameBoardIncomingSharedUiEffects';
import { getSnapshotPostProcessingDecision } from './gameBoardSnapshotPostProcessing';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

export const getIncomingSnapshotHandling = ({
  isHost,
  message,
}: {
  isHost: boolean;
  message: SnapshotMessage;
}) => ({
  state: message.state,
  source: message.source,
  sharedUiEffects: getIncomingSharedUiEffects(message),
  postProcessing: getSnapshotPostProcessingDecision({
    isHost,
    source: message.source,
  }),
});
