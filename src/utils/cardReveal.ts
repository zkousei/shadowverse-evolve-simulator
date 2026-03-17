import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { PublicCardView, SharedUiEffect } from '../types/sync';

const toPublicCardView = (card: CardInstance): PublicCardView => ({
  cardId: card.cardId,
  name: card.name,
  image: card.image,
});

export const buildSingleCardRevealEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  cardId: string,
  type: 'REVEAL_TOP_DECK_CARDS' | 'REVEAL_SEARCHED_CARD_TO_HAND'
): SharedUiEffect | null => {
  const card = cards.find((currentCard) => currentCard.id === cardId);
  if (!card) return null;

  return {
    type,
    actor,
    cards: [toPublicCardView(card)],
  };
};
