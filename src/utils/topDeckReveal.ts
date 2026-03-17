import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import type { TopDeckResult } from './cardLogic';

export const buildTopDeckRevealEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  results: TopDeckResult[]
): SharedUiEffect | null => {
  const revealedCards = results
    .filter((result) => result.action === 'revealedHand')
    .map((result) => cards.find((card) => card.id === result.cardId))
    .filter((card): card is CardInstance => Boolean(card))
    .map((card) => ({
      cardId: card.cardId,
      name: card.name,
      image: card.image,
    }));

  if (revealedCards.length === 0) {
    return null;
  }

  return {
    type: 'REVEAL_TOP_DECK_CARDS',
    actor,
    cards: revealedCards,
  };
};
