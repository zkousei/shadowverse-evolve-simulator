import type { SyncState } from '../types/game';

export const canImportDeck = (gameStatus: SyncState['gameStatus']): boolean => {
  return gameStatus === 'preparing';
};
