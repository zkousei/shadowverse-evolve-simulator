import {
  toggleSavedDeckSelectionId,
  toggleShownSavedDeckIds,
} from './deckBuilderSelections';

export type DeckBuilderMyDecksUiState = {
  isMyDecksOpen: boolean;
  pendingLoadDeckId: string | null;
  pendingDeleteDeckId: string | null;
  showDeleteAllSavedDecksDialog: boolean;
  showDeleteSelectedSavedDecksDialog: boolean;
  isSavedDeckSelectMode: boolean;
  selectedSavedDeckIds: string[];
  savedDeckSearch: string;
};

export type DeckBuilderMyDecksUiStatePatch = Partial<DeckBuilderMyDecksUiState>;

export const buildClearedSavedDeckSelectionUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isSavedDeckSelectMode: false,
  selectedSavedDeckIds: [],
});

export const buildOpenedMyDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isMyDecksOpen: true,
});

export const buildClosedMyDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isMyDecksOpen: false,
  ...buildClearedSavedDeckSelectionUiState(),
});

export const buildEnteredSavedDeckSelectionUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isSavedDeckSelectMode: true,
});

export const buildUpdatedSavedDeckSearchUiState = (
  savedDeckSearch: string
): DeckBuilderMyDecksUiStatePatch => ({
  savedDeckSearch,
});

export const buildToggledSavedDeckSelectionUiState = (
  selectedSavedDeckIds: string[],
  deckId: string
): DeckBuilderMyDecksUiStatePatch => ({
  selectedSavedDeckIds: toggleSavedDeckSelectionId(selectedSavedDeckIds, deckId),
});

export const buildToggledShownSavedDeckSelectionUiState = (
  selectedSavedDeckIds: string[],
  shownSavedDeckIds: string[]
): DeckBuilderMyDecksUiStatePatch => ({
  selectedSavedDeckIds: toggleShownSavedDeckIds(selectedSavedDeckIds, shownSavedDeckIds),
});

export const buildOpenedPendingSavedDeckLoadUiState = (
  deckId: string
): DeckBuilderMyDecksUiStatePatch => ({
  pendingLoadDeckId: deckId,
});

export const buildDismissedPendingSavedDeckLoadUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingLoadDeckId: null,
});

export const buildOpenedPendingSavedDeckDeleteUiState = (
  deckId: string
): DeckBuilderMyDecksUiStatePatch => ({
  pendingDeleteDeckId: deckId,
});

export const buildDismissedPendingSavedDeckDeleteUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingDeleteDeckId: null,
});

export const buildOpenedDeleteAllSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  showDeleteAllSavedDecksDialog: true,
});

export const buildDismissedDeleteAllSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  showDeleteAllSavedDecksDialog: false,
});

export const buildOpenedDeleteSelectedSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  showDeleteSelectedSavedDecksDialog: true,
});

export const buildDismissedDeleteSelectedSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  showDeleteSelectedSavedDecksDialog: false,
});

export const buildCompletedSavedDeckLoadUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isMyDecksOpen: false,
  pendingLoadDeckId: null,
});

export const buildCompletedDeleteAllSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingDeleteDeckId: null,
  pendingLoadDeckId: null,
  showDeleteAllSavedDecksDialog: false,
  ...buildClearedSavedDeckSelectionUiState(),
});

export const buildCompletedDeleteSelectedSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingDeleteDeckId: null,
  pendingLoadDeckId: null,
  showDeleteSelectedSavedDecksDialog: false,
  ...buildClearedSavedDeckSelectionUiState(),
});
