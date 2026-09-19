import type { CardInstance } from '../../components/Card';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';

export const findUnitRootCard = (cards: CardInstance[], card: CardInstance): CardInstance => {
  let rootCard = card;
  const visited = new Set<string>();

  while (true) {
    const parentId = rootCard.attachedTo ?? rootCard.linkedTo;
    if (!parentId || visited.has(parentId)) break;
    visited.add(rootCard.id);
    const parentCard = cards.find(candidate => candidate.id === parentId);
    if (!parentCard) break;
    rootCard = parentCard;
  }

  return rootCard;
};

const TOKEN_MANUAL_LINK_CARD_KINDS = new Set(['token_equipment', 'token_treasure']);

export const isTokenManualLinkCard = (
  card: CardInstance | undefined,
  tokenManualLinkCardIds: Set<string>
): boolean => {
  if (!card) return false;
  return (
    TOKEN_MANUAL_LINK_CARD_KINDS.has(card.cardKindNormalized ?? '') ||
    tokenManualLinkCardIds.has(card.cardId)
  );
};

export const isEquipmentLinkTargetCard = (
  card: CardInstance | undefined,
  catalogCard: DeckBuilderCardData | undefined
): boolean => {
  if (!card) return false;
  if (catalogCard) {
    return catalogCard.deck_section === 'main' && catalogCard.card_kind_normalized === 'follower';
  }

  return !card.isLeaderCard && !card.isEvolveCard && !card.isTokenCard && card.baseCardType === 'follower';
};
