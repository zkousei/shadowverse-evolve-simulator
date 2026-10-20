import type { DeckBuilderCardTypeFilter } from './deckBuilderFilters';

export type DeckBuilderMobileTab = 'library' | 'deck';

export const DECK_BUILDER_SPLIT_MIN_WIDTH = 900;

type MatchMediaResult = {
  matches: boolean;
};

type MatchMediaFn = (query: string) => MatchMediaResult;

const POINTER_COARSE_QUERY = '(pointer: coarse)';

export interface AdvancedDeckBuilderFilterSnapshot {
  cardTypeFilter: DeckBuilderCardTypeFilter;
  expansionFilter: string;
  rarityFilter: string;
  productNameFilter: string;
  selectedSubtypeTags: readonly string[];
  hideSameNameVariants: boolean;
  showPreviewCards: boolean;
}

export const isCompactDeckBuilderViewport = (viewportWidth: number): boolean => (
  viewportWidth < DECK_BUILDER_SPLIT_MIN_WIDTH
);

export const getAdvancedDeckBuilderFilterCount = (
  filters: AdvancedDeckBuilderFilterSnapshot
): number => {
  let count = 0;

  if (filters.cardTypeFilter !== 'All') count += 1;
  if (filters.expansionFilter !== 'All') count += 1;
  if (filters.rarityFilter !== 'All') count += 1;
  if (filters.productNameFilter !== 'All') count += 1;
  count += filters.selectedSubtypeTags.length;
  if (filters.hideSameNameVariants) count += 1;
  if (filters.showPreviewCards) count += 1;

  return count;
};

export const shouldEnableDeckCardHoverPreview = (
  matchMediaFn?: MatchMediaFn
): boolean => {
  if (!matchMediaFn) return true;
  return !matchMediaFn(POINTER_COARSE_QUERY).matches;
};
