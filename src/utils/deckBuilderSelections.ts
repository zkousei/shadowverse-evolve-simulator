import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { getDeckValidationMessages, sanitizeImportedDeckState } from './deckBuilderRules';
import { restoreSavedDeckToSnapshot, type SavedDeckRecordV1 } from './deckStorage';

export type FilteredSavedDeckEntry = {
  savedDeck: SavedDeckRecordV1;
  canExport: boolean;
};

export type SavedDeckSelectionUiState = {
  showSelectionToggle: boolean;
  selectionToggleAction: 'enter-selection' | 'cancel-selection';
  showDeleteAll: boolean;
  showBulkActions: boolean;
  hasSelectedDecks: boolean;
  bulkSelectionAction: 'select-all-shown' | 'clear-selection';
};

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

export const buildFilteredSavedDecks = (
  savedDecks: SavedDeckRecordV1[],
  cards: DeckBuilderCardData[],
  savedDeckSearch: string
): FilteredSavedDeckEntry[] => {
  const normalizedSearch = normalizeSearch(savedDeckSearch);

  return savedDecks
    .filter(deck => deck.name.toLowerCase().includes(normalizedSearch))
    .map(savedDeck => {
      const restoredDeck = restoreSavedDeckToSnapshot(savedDeck, cards);
      const sanitizedDeckState = sanitizeImportedDeckState(
        restoredDeck.snapshot.deckState,
        cards,
        restoredDeck.snapshot.ruleConfig
      );
      const savedDeckIssues = getDeckValidationMessages(sanitizedDeckState, restoredDeck.snapshot.ruleConfig);

      return {
        savedDeck,
        canExport: savedDeckIssues.length === 0,
      };
    });
};

export const getShownSavedDeckIds = (
  filteredSavedDecks: FilteredSavedDeckEntry[]
): string[] => filteredSavedDecks.map(({ savedDeck }) => savedDeck.id);

export const areAllShownSavedDecksSelected = (
  shownSavedDeckIds: string[],
  selectedSavedDeckIds: string[]
): boolean => (
  shownSavedDeckIds.length > 0
  && shownSavedDeckIds.every(id => selectedSavedDeckIds.includes(id))
);

export const toggleSavedDeckSelectionId = (
  selectedSavedDeckIds: string[],
  deckId: string
): string[] => (
  selectedSavedDeckIds.includes(deckId)
    ? selectedSavedDeckIds.filter(id => id !== deckId)
    : [...selectedSavedDeckIds, deckId]
);

export const toggleShownSavedDeckIds = (
  selectedSavedDeckIds: string[],
  shownSavedDeckIds: string[]
): string[] => {
  if (shownSavedDeckIds.length === 0) return selectedSavedDeckIds;

  if (areAllShownSavedDecksSelected(shownSavedDeckIds, selectedSavedDeckIds)) {
    return selectedSavedDeckIds.filter(id => !shownSavedDeckIds.includes(id));
  }

  return Array.from(new Set([...selectedSavedDeckIds, ...shownSavedDeckIds]));
};

export const getSavedDeckSelectionUiState = ({
  filteredSavedDeckCount,
  savedDeckCount,
  isSavedDeckSelectMode,
  selectedSavedDeckCount,
  areAllShownSavedDecksSelected,
}: {
  filteredSavedDeckCount: number;
  savedDeckCount: number;
  isSavedDeckSelectMode: boolean;
  selectedSavedDeckCount: number;
  areAllShownSavedDecksSelected: boolean;
}): SavedDeckSelectionUiState => ({
  showSelectionToggle: filteredSavedDeckCount > 0,
  selectionToggleAction: isSavedDeckSelectMode ? 'cancel-selection' : 'enter-selection',
  showDeleteAll: savedDeckCount > 0,
  showBulkActions: isSavedDeckSelectMode && filteredSavedDeckCount > 0,
  hasSelectedDecks: selectedSavedDeckCount > 0,
  bulkSelectionAction: areAllShownSavedDecksSelected ? 'clear-selection' : 'select-all-shown',
});

const normalizeSubtypeTag = (value: string): string => value.trim();

export const getFilteredSubtypeOptions = (
  subtypeTags: string[],
  subtypeSearch: string
): string[] => {
  const normalizedSearch = normalizeSearch(subtypeSearch);
  if (normalizedSearch.length === 0) return subtypeTags;

  return subtypeTags.filter(tag => tag.toLowerCase().includes(normalizedSearch));
};

export const canAddSubtypeTag = (
  subtypeTags: string[],
  selectedSubtypeTags: string[],
  tagInput: string
): boolean => {
  const normalizedTag = normalizeSubtypeTag(tagInput);
  return normalizedTag.length > 0
    && subtypeTags.includes(normalizedTag)
    && !selectedSubtypeTags.includes(normalizedTag);
};

export const addSubtypeTagSelection = (
  selectedSubtypeTags: string[],
  subtypeTags: string[],
  tagInput: string
): string[] => {
  if (!canAddSubtypeTag(subtypeTags, selectedSubtypeTags, tagInput)) {
    return selectedSubtypeTags;
  }

  return [...selectedSubtypeTags, normalizeSubtypeTag(tagInput)];
};

export const removeSubtypeTagSelection = (
  selectedSubtypeTags: string[],
  tag: string
): string[] => selectedSubtypeTags.filter(value => value !== tag);
