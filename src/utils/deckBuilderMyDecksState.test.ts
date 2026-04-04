import { describe, expect, it } from 'vitest';
import {
  buildClearedSavedDeckSelectionUiState,
  buildClosedMyDecksUiState,
  buildCompletedDeleteAllSavedDecksUiState,
  buildCompletedDeleteSelectedSavedDecksUiState,
  buildCompletedSavedDeckLoadUiState,
  buildEnteredSavedDeckSelectionUiState,
  buildDismissedDeleteAllSavedDecksUiState,
  buildDismissedDeleteSelectedSavedDecksUiState,
  buildDismissedPendingSavedDeckDeleteUiState,
  buildDismissedPendingSavedDeckLoadUiState,
  buildOpenedDeleteAllSavedDecksUiState,
  buildOpenedDeleteSelectedSavedDecksUiState,
  buildOpenedMyDecksUiState,
  buildOpenedPendingSavedDeckDeleteUiState,
  buildOpenedPendingSavedDeckLoadUiState,
  buildToggledSavedDeckSelectionUiState,
  buildToggledShownSavedDeckSelectionUiState,
  buildUpdatedSavedDeckSearchUiState,
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

    expect(buildOpenedMyDecksUiState()).toEqual({
      isMyDecksOpen: true,
    });
    expect(buildEnteredSavedDeckSelectionUiState()).toEqual({
      isSavedDeckSelectMode: true,
    });
    expect(buildUpdatedSavedDeckSearchUiState('drag')).toEqual({
      savedDeckSearch: 'drag',
    });
  });

  it('builds dismiss patches for load, delete, and bulk-delete dialogs', () => {
    expect(buildOpenedPendingSavedDeckLoadUiState('deck-1')).toEqual({
      pendingLoadDeckId: 'deck-1',
    });
    expect(buildDismissedPendingSavedDeckLoadUiState()).toEqual({
      pendingLoadDeckId: null,
    });
    expect(buildOpenedPendingSavedDeckDeleteUiState('deck-2')).toEqual({
      pendingDeleteDeckId: 'deck-2',
    });
    expect(buildDismissedPendingSavedDeckDeleteUiState()).toEqual({
      pendingDeleteDeckId: null,
    });
    expect(buildOpenedDeleteAllSavedDecksUiState()).toEqual({
      showDeleteAllSavedDecksDialog: true,
    });
    expect(buildDismissedDeleteAllSavedDecksUiState()).toEqual({
      showDeleteAllSavedDecksDialog: false,
    });
    expect(buildOpenedDeleteSelectedSavedDecksUiState()).toEqual({
      showDeleteSelectedSavedDecksDialog: true,
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

  it('builds selection toggle patches for individual and shown decks', () => {
    expect(buildToggledSavedDeckSelectionUiState(['deck-1'], 'deck-2')).toEqual({
      selectedSavedDeckIds: ['deck-1', 'deck-2'],
    });

    expect(buildToggledSavedDeckSelectionUiState(['deck-1', 'deck-2'], 'deck-2')).toEqual({
      selectedSavedDeckIds: ['deck-1'],
    });

    expect(buildToggledShownSavedDeckSelectionUiState(['deck-3'], ['deck-1', 'deck-2'])).toEqual({
      selectedSavedDeckIds: ['deck-3', 'deck-1', 'deck-2'],
    });

    expect(buildToggledShownSavedDeckSelectionUiState(['deck-1', 'deck-2', 'deck-3'], ['deck-1', 'deck-2'])).toEqual({
      selectedSavedDeckIds: ['deck-3'],
    });
  });
});
