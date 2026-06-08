import React from 'react';
import type { ClassFilter } from '../models/class';
import type {
  DeckBuilderCardTypeFilter,
  DeckBuilderDeckSectionFilter,
  DeckBuilderLibraryFilterState,
} from '../utils/deckBuilderFilters';
import {
  buildDefaultDeckBuilderLibraryFilterState,
  buildSubtypeAddedDeckBuilderLibraryFilterState,
  buildSubtypeRemovedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterStateWithPageReset,
} from '../utils/deckBuilderFilters';
import { getFilteredSubtypeOptions } from '../utils/deckBuilderSelections';

type UseDeckBuilderLibraryFiltersArgs = {
  subtypeTags: string[];
  releasedSubtypeTags?: string[];
};

export const useDeckBuilderLibraryFilters = ({
  subtypeTags,
  releasedSubtypeTags = subtypeTags,
}: UseDeckBuilderLibraryFiltersArgs) => {
  const [search, setSearch] = React.useState('');
  const [costFilter, setCostFilter] = React.useState('All');
  const [expansionFilter, setExpansionFilter] = React.useState('All');
  const [classFilter, setClassFilter] = React.useState<ClassFilter>('All');
  const [cardTypeFilter, setCardTypeFilter] = React.useState<DeckBuilderCardTypeFilter>('All');
  const [rarityFilter, setRarityFilter] = React.useState('All');
  const [productNameFilter, setProductNameFilter] = React.useState('All');
  const [subtypeSearch, setSubtypeSearch] = React.useState('');
  const [selectedSubtypeTags, setSelectedSubtypeTags] = React.useState<string[]>([]);
  const [deckSectionFilter, setDeckSectionFilter] = React.useState<DeckBuilderDeckSectionFilter>('All');
  const [hideSameNameVariants, setHideSameNameVariants] = React.useState(false);
  const [showPreviewCards, setShowPreviewCards] = React.useState(false);
  const [page, setPage] = React.useState(0);

  const buildCurrentLibraryFilterState = React.useCallback((): DeckBuilderLibraryFilterState => ({
    search,
    costFilter,
    expansionFilter,
    classFilter,
    cardTypeFilter,
    rarityFilter,
    productNameFilter,
    subtypeSearch,
    selectedSubtypeTags,
    deckSectionFilter,
    hideSameNameVariants,
    showPreviewCards,
    page,
  }), [
    cardTypeFilter,
    classFilter,
    costFilter,
    deckSectionFilter,
    expansionFilter,
    hideSameNameVariants,
    page,
    productNameFilter,
    rarityFilter,
    search,
    selectedSubtypeTags,
    showPreviewCards,
    subtypeSearch,
  ]);

  const applyDeckBuilderLibraryFilterState = React.useCallback((state: DeckBuilderLibraryFilterState) => {
    setSearch(state.search);
    setCostFilter(state.costFilter);
    setExpansionFilter(state.expansionFilter);
    setClassFilter(state.classFilter);
    setCardTypeFilter(state.cardTypeFilter);
    setRarityFilter(state.rarityFilter);
    setProductNameFilter(state.productNameFilter);
    setSubtypeSearch(state.subtypeSearch);
    setSelectedSubtypeTags(state.selectedSubtypeTags);
    setDeckSectionFilter(state.deckSectionFilter);
    setHideSameNameVariants(state.hideSameNameVariants);
    setShowPreviewCards(state.showPreviewCards);
    setPage(state.page);
  }, []);

  const resetLibraryFilters = React.useCallback(() => {
    applyDeckBuilderLibraryFilterState(buildDefaultDeckBuilderLibraryFilterState());
  }, [applyDeckBuilderLibraryFilterState]);

  const updateLibraryFilters = React.useCallback((
    patch: Partial<DeckBuilderLibraryFilterState>
  ) => {
    applyDeckBuilderLibraryFilterState(
      buildUpdatedDeckBuilderLibraryFilterState(buildCurrentLibraryFilterState(), patch)
    );
  }, [applyDeckBuilderLibraryFilterState, buildCurrentLibraryFilterState]);

  const updateLibraryFiltersWithPageReset = React.useCallback((
    patch: Omit<Partial<DeckBuilderLibraryFilterState>, 'page'>
  ) => {
    applyDeckBuilderLibraryFilterState(
      buildUpdatedDeckBuilderLibraryFilterStateWithPageReset(
        buildCurrentLibraryFilterState(),
        patch
      )
    );
  }, [applyDeckBuilderLibraryFilterState, buildCurrentLibraryFilterState]);

  const addSubtypeTag = React.useCallback((tag: string) => {
    const availableSubtypeTags = showPreviewCards ? subtypeTags : releasedSubtypeTags;
    applyDeckBuilderLibraryFilterState(
      buildSubtypeAddedDeckBuilderLibraryFilterState(
        buildCurrentLibraryFilterState(),
        availableSubtypeTags,
        tag
      )
    );
  }, [applyDeckBuilderLibraryFilterState, buildCurrentLibraryFilterState, releasedSubtypeTags, showPreviewCards, subtypeTags]);

  const removeSubtypeTag = React.useCallback((tag: string) => {
    applyDeckBuilderLibraryFilterState(
      buildSubtypeRemovedDeckBuilderLibraryFilterState(buildCurrentLibraryFilterState(), tag)
    );
  }, [applyDeckBuilderLibraryFilterState, buildCurrentLibraryFilterState]);

  const filteredSubtypeOptions = React.useMemo(
    () => getFilteredSubtypeOptions(showPreviewCards ? subtypeTags : releasedSubtypeTags, subtypeSearch),
    [releasedSubtypeTags, showPreviewCards, subtypeSearch, subtypeTags]
  );

  return {
    search,
    costFilter,
    expansionFilter,
    classFilter,
    cardTypeFilter,
    rarityFilter,
    productNameFilter,
    subtypeSearch,
    selectedSubtypeTags,
    deckSectionFilter,
    hideSameNameVariants,
    showPreviewCards,
    page,
    filteredSubtypeOptions,
    resetLibraryFilters,
    updateLibraryFilters,
    updateLibraryFiltersWithPageReset,
    addSubtypeTag,
    removeSubtypeTag,
  };
};
