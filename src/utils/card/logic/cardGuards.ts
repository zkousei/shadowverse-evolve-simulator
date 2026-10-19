import type { CardInstance } from '../../../components/Card';
import type { SyncState } from '../../../types/game';
import { sanitizeCardRelations } from './cardRelations';

/**
 * Final guard to ensure state integrity.
 */
export const applyStateWithGuards = (newState: CardInstance[]): CardInstance[] => {
  const ids = new Set<string>();
  const uniqueCards: CardInstance[] = [];

  for (const card of newState) {
    if (ids.has(card.id)) {
      console.warn(`[Guard] Duplicate card ID detected: ${card.id}. Skipping duplicate.`);
      continue;
    }
    ids.add(card.id);
    uniqueCards.push(card);
  }

  return sanitizeCardRelations(uniqueCards);
};

export const normalizeCardsForGameState = (
  cards: CardInstance[],
  gameStatus: SyncState['gameStatus']
): CardInstance[] => {
  if (gameStatus !== 'playing') return cards;
  return cards.map(card =>
    card.zone.startsWith('field-') && card.isFlipped ? { ...card, isFlipped: false } : card
  );
};
