import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { PublicCardView, SharedUiEffect } from '../types/sync';

const toPublicCardView = (card: CardInstance, includeImage = true): PublicCardView => ({
  cardId: card.cardId,
  name: card.name,
  image: includeImage ? card.image : '',
});

export const buildSingleCardRevealEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  cardId: string,
  type: 'REVEAL_TOP_DECK_CARDS' | 'REVEAL_SEARCHED_CARD_TO_HAND'
): SharedUiEffect | null => {
  const card = cards.find((currentCard) => currentCard.id === cardId);
  if (!card) return null;

  if (type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
    return {
      type,
      actor,
      // Search reveals can resolve the public card from the authoritative
      // snapshot that already moved the card into hand, so only send the
      // instance id to keep the WebRTC payload as small as possible.
      cardIds: [card.id],
    };
  }

  return {
    type,
    actor,
    cards: [toPublicCardView(card)],
  };
};
