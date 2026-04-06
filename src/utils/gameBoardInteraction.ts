import type { SyncState } from '../types/game';

type ConnectionStateLike = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export const getCanInteractWithGameBoard = ({
  isSoloMode,
  isHost,
  connectionState,
}: {
  isSoloMode: boolean;
  isHost: boolean;
  connectionState: ConnectionStateLike;
}): boolean => {
  return isSoloMode || isHost || connectionState === 'connected';
};

export const canLookAtTopDeck = ({
  canInteract,
  gameStatus,
}: {
  canInteract: boolean;
  gameStatus: SyncState['gameStatus'];
}): boolean => {
  return canInteract && gameStatus === 'playing';
};
