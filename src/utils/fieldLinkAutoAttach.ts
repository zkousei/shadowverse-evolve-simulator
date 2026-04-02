import type { CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { getFieldLinkGroupId } from '../data/fieldLinkRules';

const isAdvanceKind = (cardKindNormalized?: string): boolean => (
  Boolean(cardKindNormalized?.startsWith('advance_'))
);

const getRootFieldCards = (boardCards: CardInstance[], owner: CardInstance['owner']): CardInstance[] => {
  const fieldCards = boardCards.filter(card => card.zone === `field-${owner}`);
  const fieldCardIds = new Set(fieldCards.map(card => card.id));

  return fieldCards.filter(card => !card.attachedTo || !fieldCardIds.has(card.attachedTo));
};

const isValidFieldLinkTarget = (
  card: CardInstance,
  cardsById: Record<string, DeckBuilderCardData>
): boolean => {
  if (card.isLeaderCard || card.isEvolveCard || card.isTokenCard) return false;

  const catalogCard = cardsById[card.cardId];
  if (!catalogCard || catalogCard.deck_section !== 'main') return false;

  return !isAdvanceKind(catalogCard.card_kind_normalized);
};

export interface FieldLinkAutoAttachResolver {
  isEligibleSource: (card: CardInstance) => boolean;
  resolveCandidates: (card: CardInstance, boardCards: CardInstance[]) => CardInstance[];
}

export const buildFieldLinkAutoAttachResolver = (
  cards: DeckBuilderCardData[]
): FieldLinkAutoAttachResolver => {
  const cardsById = cards.reduce<Record<string, DeckBuilderCardData>>((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});

  const fieldLinkGroupIdByCardId = cards.reduce<Record<string, string>>((lookup, card) => {
    const groupId = getFieldLinkGroupId(card);
    if (groupId) {
      lookup[card.id] = groupId;
    }
    return lookup;
  }, {});

  const relatedFieldLinkGroupsByCardId = cards.reduce<Record<string, Set<string>>>((lookup, card) => {
    const relatedGroupIds = new Set(
      (card.related_cards ?? [])
        .map(related => fieldLinkGroupIdByCardId[related.id])
        .filter((groupId): groupId is string => Boolean(groupId))
    );

    lookup[card.id] = relatedGroupIds;
    return lookup;
  }, {});

  const isEligibleSource = (card: CardInstance): boolean => {
    const catalogCard = cardsById[card.cardId];
    if (!catalogCard || catalogCard.deck_section !== 'evolve') return false;
    return Boolean(fieldLinkGroupIdByCardId[catalogCard.id]);
  };

  const resolveCandidates = (card: CardInstance, boardCards: CardInstance[]): CardInstance[] => {
    if (!isEligibleSource(card)) return [];

    const sourceCatalogCard = cardsById[card.cardId];
    if (!sourceCatalogCard) return [];

    const sourceGroupId = fieldLinkGroupIdByCardId[sourceCatalogCard.id];
    if (!sourceGroupId) return [];

    return getRootFieldCards(boardCards, card.owner)
      .filter(fieldCard => isValidFieldLinkTarget(fieldCard, cardsById))
      .filter(fieldCard => relatedFieldLinkGroupsByCardId[fieldCard.cardId]?.has(sourceGroupId));
  };

  return {
    isEligibleSource,
    resolveCandidates,
  };
};
