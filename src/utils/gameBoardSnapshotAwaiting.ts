import type { PlayerRole } from '../types/game';

export const shouldClearAwaitingInitialSnapshot = ({
  isHost,
  source,
  isAwaitingInitialSnapshot,
}: {
  isHost: boolean;
  source: PlayerRole;
  isAwaitingInitialSnapshot: boolean;
}): boolean => {
  return !isHost && source === 'host' && isAwaitingInitialSnapshot;
};
