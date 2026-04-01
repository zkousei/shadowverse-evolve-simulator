import type { CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';

export interface EvolveAutoAttachCandidate {
  card: CardInstance;
  matchSource: 'direct' | 'reprint';
}

export interface EvolveAutoAttachResolver {
  isEligibleSource: (card: CardInstance) => boolean;
  resolveCandidates: (card: CardInstance, boardCards: CardInstance[]) => EvolveAutoAttachCandidate[];
}

const SUPPORTED_SOURCE_KINDS = new Set(['evolve_follower', 'evolve_amulet']);

const buildCardIdentityKey = (
  card: Pick<DeckBuilderCardData, 'name' | 'title' | 'card_kind_normalized'> | null | undefined
): string | null => {
  if (!card?.name) return null;
  return [card.name, card.title ?? '', card.card_kind_normalized ?? ''].join('::');
};

const buildEvolveFamilyKey = (
  card: Pick<DeckBuilderCardData, 'name' | 'title' | 'card_kind_normalized' | 'deck_section'> | null | undefined
): string | null => {
  if (!card?.name) return null;
  return [card.name, card.title ?? '', card.card_kind_normalized ?? '', card.deck_section ?? ''].join('::');
};

const isAdvanceKind = (cardKindNormalized?: string): boolean => (
  Boolean(cardKindNormalized?.startsWith('advance_'))
);

const getMainRelatedTargetIds = (
  card: DeckBuilderCardData | undefined,
  cardsById: Record<string, DeckBuilderCardData>
): string[] => {
  if (!card?.related_cards) return [];

  return card.related_cards
    .map(related => related.id)
    .filter((relatedId): relatedId is string => {
      if (!relatedId) return false;
      const relatedCard = cardsById[relatedId];
      if (!relatedCard || relatedCard.deck_section !== 'main') return false;
      return !isAdvanceKind(relatedCard.card_kind_normalized);
    });
};

const buildFamilyFallbackTargetKeysByCardId = (
  cards: DeckBuilderCardData[],
  cardsById: Record<string, DeckBuilderCardData>
): Record<string, Set<string>> => {
  const familyMembers = new Map<string, DeckBuilderCardData[]>();

  cards.forEach(card => {
    const familyKey = buildEvolveFamilyKey(card);
    if (!familyKey) return;

    const existing = familyMembers.get(familyKey);
    if (existing) {
      existing.push(card);
      return;
    }

    familyMembers.set(familyKey, [card]);
  });

  const fallbackTargetKeysByCardId: Record<string, Set<string>> = {};

  familyMembers.forEach((members) => {
    const nonEmptyTargetSets = members
      .map(member => {
        const targetKeys = Array.from(
          new Set(
            getMainRelatedTargetIds(member, cardsById)
              .map(relatedId => buildCardIdentityKey(cardsById[relatedId]))
              .filter((identityKey): identityKey is string => Boolean(identityKey))
          )
        ).sort();

        return targetKeys;
      })
      .filter(targetKeys => targetKeys.length > 0);

    const distinctTargetSets = Array.from(
      new Set(nonEmptyTargetSets.map(targetKeys => JSON.stringify(targetKeys)))
    );

    const canonicalTargetKeys = distinctTargetSets.length === 1
      ? new Set<string>(JSON.parse(distinctTargetSets[0]) as string[])
      : new Set<string>();

    members.forEach(member => {
      fallbackTargetKeysByCardId[member.id] = canonicalTargetKeys;
    });
  });

  return fallbackTargetKeysByCardId;
};

const getRootFieldCards = (boardCards: CardInstance[], owner: CardInstance['owner']): CardInstance[] => {
  const fieldCards = boardCards.filter(card => card.zone === `field-${owner}`);
  const fieldCardIds = new Set(fieldCards.map(card => card.id));

  return fieldCards.filter(card => !card.attachedTo || !fieldCardIds.has(card.attachedTo));
};

const isValidFieldTarget = (
  card: CardInstance,
  cardsById: Record<string, DeckBuilderCardData>
): boolean => {
  if (card.isLeaderCard || card.isEvolveCard || card.isTokenCard) return false;

  const catalogCard = cardsById[card.cardId];
  if (!catalogCard || catalogCard.deck_section !== 'main') return false;

  return !isAdvanceKind(catalogCard.card_kind_normalized);
};

const dedupeCandidates = (candidates: EvolveAutoAttachCandidate[]): EvolveAutoAttachCandidate[] => {
  const seenCardIds = new Set<string>();

  return candidates.filter(candidate => {
    if (seenCardIds.has(candidate.card.id)) return false;
    seenCardIds.add(candidate.card.id);
    return true;
  });
};

export const buildEvolveAutoAttachResolver = (
  cards: DeckBuilderCardData[]
): EvolveAutoAttachResolver => {
  const cardsById = cards.reduce<Record<string, DeckBuilderCardData>>((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});
  const fallbackTargetKeysByCardId = buildFamilyFallbackTargetKeysByCardId(cards, cardsById);

  const isEligibleSource = (card: CardInstance): boolean => {
    const catalogCard = cardsById[card.cardId];
    if (!catalogCard) return false;
    if (catalogCard.deck_section !== 'evolve') return false;
    if (isAdvanceKind(catalogCard.card_kind_normalized)) return false;
    return SUPPORTED_SOURCE_KINDS.has(catalogCard.card_kind_normalized ?? '');
  };

  const resolveCandidates = (card: CardInstance, boardCards: CardInstance[]): EvolveAutoAttachCandidate[] => {
    if (!isEligibleSource(card)) return [];

    const catalogCard = cardsById[card.cardId];
    if (!catalogCard) return [];

    const rootFieldCards = getRootFieldCards(boardCards, card.owner)
      .filter(fieldCard => isValidFieldTarget(fieldCard, cardsById));

    const directTargetIds = new Set(getMainRelatedTargetIds(catalogCard, cardsById));
    const directCandidates = rootFieldCards
      .filter(fieldCard => directTargetIds.has(fieldCard.cardId))
      .map(fieldCard => ({
        card: fieldCard,
        matchSource: 'direct' as const,
      }));

    const fallbackTargetKeys = fallbackTargetKeysByCardId[catalogCard.id] ?? new Set<string>();
    if (fallbackTargetKeys.size === 0) {
      return dedupeCandidates(directCandidates);
    }

    const fallbackCandidates = rootFieldCards
      .filter(fieldCard => {
        const fieldCatalogCard = cardsById[fieldCard.cardId];
        const fieldIdentityKey = buildCardIdentityKey(fieldCatalogCard);
        if (!fieldIdentityKey) return false;
        return fallbackTargetKeys.has(fieldIdentityKey);
      })
      .map(fieldCard => ({
        card: fieldCard,
        matchSource: directTargetIds.has(fieldCard.cardId) ? 'direct' as const : 'reprint' as const,
      }));

    return dedupeCandidates([...directCandidates, ...fallbackCandidates]);
  };

  return {
    isEligibleSource,
    resolveCandidates,
  };
};
