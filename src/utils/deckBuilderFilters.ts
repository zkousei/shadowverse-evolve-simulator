import type { ClassFilter } from '../models/class';
import {
  addSubtypeTagSelection,
  canAddSubtypeTag,
  removeSubtypeTagSelection,
} from './deckBuilderSelections';

export type DeckBuilderCardTypeFilter = 'All' | 'follower' | 'spell' | 'amulet';

export type DeckBuilderDeckSectionFilter = 'All' | 'main' | 'evolve' | 'leader' | 'token';

export type DeckBuilderLibraryFilterState = {
  search: string;
  costFilter: string;
  expansionFilter: string;
  classFilter: ClassFilter;
  cardTypeFilter: DeckBuilderCardTypeFilter;
  rarityFilter: string;
  productNameFilter: string;
  subtypeSearch: string;
  selectedSubtypeTags: string[];
  deckSectionFilter: DeckBuilderDeckSectionFilter;
  hideSameNameVariants: boolean;
  page: number;
};

export const buildDefaultDeckBuilderLibraryFilterState = (): DeckBuilderLibraryFilterState => ({
  search: '',
  costFilter: 'All',
  expansionFilter: 'All',
  classFilter: 'All',
  cardTypeFilter: 'All',
  rarityFilter: 'All',
  productNameFilter: 'All',
  subtypeSearch: '',
  selectedSubtypeTags: [],
  deckSectionFilter: 'All',
  hideSameNameVariants: false,
  page: 0,
});

export const buildUpdatedDeckBuilderLibraryFilterState = (
  currentState: DeckBuilderLibraryFilterState,
  patch: Partial<DeckBuilderLibraryFilterState>
): DeckBuilderLibraryFilterState => ({
  ...currentState,
  ...patch,
});

export const buildUpdatedDeckBuilderLibraryFilterStateWithPageReset = (
  currentState: DeckBuilderLibraryFilterState,
  patch: Omit<Partial<DeckBuilderLibraryFilterState>, 'page'>
): DeckBuilderLibraryFilterState => ({
  ...currentState,
  ...patch,
  page: 0,
});

export const buildSubtypeAddedDeckBuilderLibraryFilterState = (
  currentState: DeckBuilderLibraryFilterState,
  subtypeTags: string[],
  tag: string
): DeckBuilderLibraryFilterState => {
  if (!canAddSubtypeTag(subtypeTags, currentState.selectedSubtypeTags, tag)) {
    return currentState;
  }

  return {
    ...currentState,
    selectedSubtypeTags: addSubtypeTagSelection(
      currentState.selectedSubtypeTags,
      subtypeTags,
      tag
    ),
    subtypeSearch: '',
    page: 0,
  };
};

export const buildSubtypeRemovedDeckBuilderLibraryFilterState = (
  currentState: DeckBuilderLibraryFilterState,
  tag: string
): DeckBuilderLibraryFilterState => ({
  ...currentState,
  selectedSubtypeTags: removeSubtypeTagSelection(currentState.selectedSubtypeTags, tag),
  page: 0,
});
