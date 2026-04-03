export type DeckBuilderMyDecksUiState = {
  isMyDecksOpen: boolean;
  pendingLoadDeckId: string | null;
  pendingDeleteDeckId: string | null;
  showDeleteAllSavedDecksDialog: boolean;
  showDeleteSelectedSavedDecksDialog: boolean;
  isSavedDeckSelectMode: boolean;
  selectedSavedDeckIds: string[];
};

export type DeckBuilderMyDecksUiStatePatch = Partial<DeckBuilderMyDecksUiState>;

export const buildClearedSavedDeckSelectionUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isSavedDeckSelectMode: false,
  selectedSavedDeckIds: [],
});

export const buildClosedMyDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  isMyDecksOpen: false,
  ...buildClearedSavedDeckSelectionUiState(),
});

export const buildDismissedPendingSavedDeckLoadUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingLoadDeckId: null,
});

export const buildDismissedPendingSavedDeckDeleteUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  pendingDeleteDeckId: null,
});

export const buildDismissedDeleteAllSavedDecksUiState = (): DeckBuilderMyDecksUiStatePatch => ({
  showDeleteAllSavedDecksDialog: false,
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
