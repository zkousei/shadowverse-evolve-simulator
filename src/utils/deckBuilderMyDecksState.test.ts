import { describe, expect, it } from 'vitest';
import {
  buildClearedSavedDeckSelectionUiState,
  buildClosedMyDecksUiState,
  buildCompletedDeleteAllSavedDecksUiState,
  buildCompletedDeleteSelectedSavedDecksUiState,
  buildCompletedSavedDeckLoadUiState,
  buildDismissedDeleteAllSavedDecksUiState,
  buildDismissedDeleteSelectedSavedDecksUiState,
  buildDismissedPendingSavedDeckDeleteUiState,
  buildDismissedPendingSavedDeckLoadUiState,
} from './deckBuilderMyDecksState';

describe('deckBuilderMyDecksState', () => {
  it('builds selection reset and modal close patches', () => {
    expect(buildClearedSavedDeckSelectionUiState()).toEqual({
      isSavedDeckSelectMode: false,
      selectedSavedDeckIds: [],
    });

    expect(buildClosedMyDecksUiState()).toEqual({
      isMyDecksOpen: false,
      isSavedDeckSelectMode: false,
      selectedSavedDeckIds: [],
    });
  });

  it('builds dismiss patches for load, delete, and bulk-delete dialogs', () => {
    expect(buildDismissedPendingSavedDeckLoadUiState()).toEqual({
      pendingLoadDeckId: null,
    });
    expect(buildDismissedPendingSavedDeckDeleteUiState()).toEqual({
      pendingDeleteDeckId: null,
    });
    expect(buildDismissedDeleteAllSavedDecksUiState()).toEqual({
      showDeleteAllSavedDecksDialog: false,
    });
    expect(buildDismissedDeleteSelectedSavedDecksUiState()).toEqual({
      showDeleteSelectedSavedDecksDialog: false,
    });
  });

  it('builds completion patches for loading and deleting saved decks', () => {
    expect(buildCompletedSavedDeckLoadUiState()).toEqual({
      isMyDecksOpen: false,
      pendingLoadDeckId: null,
    });

    expect(buildCompletedDeleteAllSavedDecksUiState()).toEqual({
      pendingDeleteDeckId: null,
      pendingLoadDeckId: null,
      showDeleteAllSavedDecksDialog: false,
      isSavedDeckSelectMode: false,
      selectedSavedDeckIds: [],
    });

    expect(buildCompletedDeleteSelectedSavedDecksUiState()).toEqual({
      pendingDeleteDeckId: null,
      pendingLoadDeckId: null,
      showDeleteSelectedSavedDecksDialog: false,
      isSavedDeckSelectMode: false,
      selectedSavedDeckIds: [],
    });
  });
});
