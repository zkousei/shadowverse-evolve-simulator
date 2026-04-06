import { CONSTRUCTED_CLASS_VALUES, type ClassFilter, type CardClass } from '../models/class';
import { getBaseCardType, type BaseCardType } from '../models/cardClassification';
import {
  dedupeCardsByDisplayIdentity,
  getSubtypeTags,
  type DeckBuilderCardData,
} from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import { isCardAllowedByRule, isRuleConfigured } from './deckBuilderRules';

export type DeckBuilderCardTypeFilter = 'All' | BaseCardType;
export type DeckBuilderDeckSectionFilter = 'All' | 'main' | 'evolve' | 'leader' | 'token';

export type DeckBuilderCatalogFilters = {
  search: string;
  costFilter: string;
  expansionFilter: string;
  classFilter: ClassFilter;
  cardTypeFilter: DeckBuilderCardTypeFilter;
  rarityFilter: string;
  productNameFilter: string;
  selectedSubtypeTags: string[];
  deckSectionFilter: DeckBuilderDeckSectionFilter;
  hideSameNameVariants: boolean;
  page: number;
  pageSize: number;
};

export type DeckBuilderCatalogView = {
  filteredCards: DeckBuilderCardData[];
  displayCards: DeckBuilderCardData[];
  paginatedCards: DeckBuilderCardData[];
  totalPages: number;
};

export const buildDeckBuilderCatalogView = (
  cards: DeckBuilderCardData[],
  deckRuleConfig: DeckRuleConfig,
  filters: DeckBuilderCatalogFilters
): DeckBuilderCatalogView => {
  const isConstructed = deckRuleConfig.format === 'constructed';
  const isCrossover = deckRuleConfig.format === 'crossover';
  const isRuleReady = isRuleConfigured(deckRuleConfig);
  const normalizedSearch = filters.search.toLowerCase();

  const filteredCards = cards.filter(card => {
    if ((isConstructed || isCrossover) && isRuleReady && !isCardAllowedByRule(card, deckRuleConfig)) return false;

    if (!card.name.toLowerCase().includes(normalizedSearch)) return false;

    if (filters.costFilter !== 'All') {
      if (filters.costFilter === '7+') {
        if (!card.cost || card.cost === '-' || Number.parseInt(card.cost, 10) < 7) return false;
      } else if (card.cost !== filters.costFilter) {
        return false;
      }
    }

    if (filters.expansionFilter !== 'All' && !card.id.startsWith(`${filters.expansionFilter}-`)) {
      return false;
    }

    if (filters.classFilter !== 'All' && card.class !== filters.classFilter) {
      return false;
    }

    if (filters.cardTypeFilter !== 'All' && getBaseCardType(card.card_kind_normalized) !== filters.cardTypeFilter) {
      return false;
    }

    if (filters.rarityFilter !== 'All' && card.rarity !== filters.rarityFilter) {
      return false;
    }

    if (filters.productNameFilter !== 'All' && card.product_name !== filters.productNameFilter) {
      return false;
    }

    if (filters.selectedSubtypeTags.length > 0) {
      const cardSubtypeTags = getSubtypeTags(card);
      if (!filters.selectedSubtypeTags.some(tag => cardSubtypeTags.includes(tag))) return false;
    }

    if (filters.deckSectionFilter !== 'All' && card.deck_section !== filters.deckSectionFilter) {
      return false;
    }

    return true;
  });

  const displayCards = filters.hideSameNameVariants
    ? dedupeCardsByDisplayIdentity(filteredCards)
    : filteredCards;
  const paginatedCards = displayCards.slice(
    filters.page * filters.pageSize,
    (filters.page + 1) * filters.pageSize
  );

  return {
    filteredCards,
    displayCards,
    paginatedCards,
    totalPages: Math.ceil(displayCards.length / filters.pageSize) || 1,
  };
};

export const getCrossoverClassOptions = (
  selectedClasses: [CardClass | null, CardClass | null]
): {
  firstOptions: CardClass[];
  secondOptions: CardClass[];
} => ({
  firstOptions: CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === selectedClasses[0] || cardClass !== selectedClasses[1]
  ),
  secondOptions: CONSTRUCTED_CLASS_VALUES.filter(
    cardClass => cardClass === selectedClasses[1] || cardClass !== selectedClasses[0]
  ),
});
