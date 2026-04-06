import { describe, expect, it } from 'vitest';
import type { DeckBuilderLibraryFilterState } from './deckBuilderFilters';
import {
  buildDefaultDeckBuilderLibraryFilterState,
  buildSubtypeAddedDeckBuilderLibraryFilterState,
  buildSubtypeRemovedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterState,
  buildUpdatedDeckBuilderLibraryFilterStateWithPageReset,
} from './deckBuilderFilters';

describe('deckBuilderFilters', () => {
  it('builds the default library filter state', () => {
    expect(buildDefaultDeckBuilderLibraryFilterState()).toEqual({
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
  });

  it('adds a subtype filter by clearing the input and resetting the page', () => {
    const currentState: DeckBuilderLibraryFilterState = {
      search: 'beta',
      costFilter: '2',
      expansionFilter: 'BP02',
      classFilter: 'ウィッチ',
      cardTypeFilter: 'spell',
      rarityFilter: 'GR',
      productNameFilter: 'Booster Pack 2',
      subtypeSearch: ' 学院 ',
      selectedSubtypeTags: ['兵士'],
      deckSectionFilter: 'main',
      hideSameNameVariants: true,
      page: 3,
    };

    expect(
      buildSubtypeAddedDeckBuilderLibraryFilterState(currentState, ['兵士', '学院'], ' 学院 ')
    ).toEqual({
      ...currentState,
      subtypeSearch: '',
      selectedSubtypeTags: ['兵士', '学院'],
      page: 0,
    });
  });

  it('updates filter state with or without resetting the page', () => {
    const currentState: DeckBuilderLibraryFilterState = {
      ...buildDefaultDeckBuilderLibraryFilterState(),
      search: 'alpha',
      classFilter: 'ロイヤル',
      page: 4,
    };

    expect(
      buildUpdatedDeckBuilderLibraryFilterState(currentState, {
        page: 2,
        subtypeSearch: '兵士',
      })
    ).toEqual({
      ...currentState,
      page: 2,
      subtypeSearch: '兵士',
    });

    expect(
      buildUpdatedDeckBuilderLibraryFilterStateWithPageReset(currentState, {
        costFilter: '3',
        hideSameNameVariants: true,
      })
    ).toEqual({
      ...currentState,
      costFilter: '3',
      hideSameNameVariants: true,
      page: 0,
    });
  });

  it('keeps the current state when adding an invalid subtype filter', () => {
    const currentState: DeckBuilderLibraryFilterState = {
      ...buildDefaultDeckBuilderLibraryFilterState(),
      selectedSubtypeTags: ['兵士'],
      subtypeSearch: 'unknown',
      page: 2,
    };

    expect(
      buildSubtypeAddedDeckBuilderLibraryFilterState(currentState, ['兵士', '学院'], 'unknown')
    ).toBe(currentState);
  });

  it('removes a subtype filter and resets the page', () => {
    const currentState: DeckBuilderLibraryFilterState = {
      ...buildDefaultDeckBuilderLibraryFilterState(),
      subtypeSearch: '学院',
      selectedSubtypeTags: ['兵士', '学院'],
      page: 4,
    };

    expect(
      buildSubtypeRemovedDeckBuilderLibraryFilterState(currentState, '兵士')
    ).toEqual({
      ...currentState,
      selectedSubtypeTags: ['学院'],
      page: 0,
    });
  });
});
