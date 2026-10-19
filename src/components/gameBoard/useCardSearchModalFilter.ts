import React from 'react';
import type { CardInstance } from '../Card';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import { normalizeBaseCardType, type RuntimeBaseCardType } from '../../utils/card/cardType';
import { useTranslation } from 'react-i18next';

export type SearchTypeCounts = Record<RuntimeBaseCardType, number>;
export type SearchSortMode = 'added' | 'cost' | 'type';
export type SearchTypeOrder = RuntimeBaseCardType | 'unknown';

export const parseSortCost = (cost?: string): number => {
  if (!cost) return Number.MAX_SAFE_INTEGER;
  const parsed = Number.parseInt(cost, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export const getSortTypeOrder = (baseCardType: RuntimeBaseCardType | null): SearchTypeOrder => {
  if (baseCardType === 'follower' || baseCardType === 'spell' || baseCardType === 'amulet') {
    return baseCardType;
  }
  return 'unknown';
};

export const searchTypeRank: Record<SearchTypeOrder, number> = {
  follower: 0,
  spell: 1,
  amulet: 2,
  unknown: 3,
};

export const compareCardName = (left: CardInstance, right: CardInstance): number => (
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
);

export interface UseCardSearchModalFilterParams {
  cards: CardInstance[];
  cardDetailLookup?: CardDetailLookup;
  isOpen: boolean;
  zoneId?: string;
  allowHandExtraction?: boolean;
  readOnly?: boolean;
}

export function useCardSearchModalFilter({
  cards,
  cardDetailLookup = {},
  isOpen,
  zoneId,
  allowHandExtraction = true,
  readOnly = false,
}: UseCardSearchModalFilterParams) {
  const { t } = useTranslation();
  const [sortMode, setSortMode] = React.useState<SearchSortMode>('added');

  React.useEffect(() => {
    if (!isOpen) {
      setSortMode('added');
    }
  }, [isOpen]);

  const sourceZonePrefix = zoneId?.split('-')[0] ?? null;
  const isMainDeckSearch = sourceZonePrefix === 'mainDeck';
  const isPreparingMainDeckSearch = !allowHandExtraction && isMainDeckSearch;
  const isEvolveDeck = sourceZonePrefix === 'evolveDeck';
  const shouldShowTypeCounts = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'mainDeck';
  const isPublicRecoveryZone = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish';
  const canSortCards = sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish';
  const supportsBulkSelection = !readOnly && (sourceZonePrefix === 'mainDeck' || sourceZonePrefix === 'cemetery' || sourceZonePrefix === 'banish');

  const visibleCards = React.useMemo(() => {
    if (!canSortCards || sortMode === 'added') return cards;

    const indexedCards = cards.map((card, index) => ({ card, index }));
    const getBaseType = (card: CardInstance) => {
      const cardDetail = cardDetailLookup[card.cardId];
      return card.baseCardType
        ?? normalizeBaseCardType(card.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.type);
    };

    indexedCards.sort((left, right) => {
      if (sortMode === 'cost') {
        const leftCost = parseSortCost(cardDetailLookup[left.card.cardId]?.cost);
        const rightCost = parseSortCost(cardDetailLookup[right.card.cardId]?.cost);
        if (leftCost !== rightCost) return leftCost - rightCost;

        const comparedName = compareCardName(left.card, right.card);
        if (comparedName !== 0) return comparedName;
      }

      if (sortMode === 'type') {
        const leftType = getSortTypeOrder(getBaseType(left.card));
        const rightType = getSortTypeOrder(getBaseType(right.card));
        if (leftType !== rightType) return searchTypeRank[leftType] - searchTypeRank[rightType];

        const comparedName = compareCardName(left.card, right.card);
        if (comparedName !== 0) return comparedName;
      }

      return left.index - right.index;
    });

    return indexedCards.map((entry) => entry.card);
  }, [canSortCards, cardDetailLookup, cards, sortMode]);

  const searchTypeCounts = shouldShowTypeCounts
    ? cards.reduce<SearchTypeCounts>((counts, card) => {
      const cardDetail = cardDetailLookup[card.cardId];
      const baseCardType = card.baseCardType
        ?? normalizeBaseCardType(card.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.cardKindNormalized)
        ?? normalizeBaseCardType(cardDetail?.type);

      if (baseCardType) {
        counts[baseCardType] += 1;
      }

      return counts;
    }, { follower: 0, spell: 0, amulet: 0 })
    : null;

  const searchTypeCountLabel = shouldShowTypeCounts
    ? t('gameBoard.modals.search.typeCounts', searchTypeCounts ?? undefined)
    : null;

  return {
    sortMode,
    setSortMode,
    visibleCards,
    sourceZonePrefix,
    isMainDeckSearch,
    isPreparingMainDeckSearch,
    isEvolveDeck,
    shouldShowTypeCounts,
    isPublicRecoveryZone,
    canSortCards,
    supportsBulkSelection,
    searchTypeCounts,
    searchTypeCountLabel,
  };
}
