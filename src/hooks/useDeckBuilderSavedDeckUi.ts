import React from 'react';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { SavedDeckRecordV1 } from '../utils/deckStorage';
import {
  type DeckBuilderMyDecksUiStatePatch,
  buildClearedSavedDeckSelectionUiState,
  buildClosedMyDecksUiState,
  buildEnteredSavedDeckSelectionUiState,
  buildToggledSavedDeckSelectionUiState,
  buildToggledShownSavedDeckSelectionUiState,
  buildUpdatedSavedDeckSearchUiState,
} from '../utils/deckBuilderMyDecksState';
import {
  areAllShownSavedDecksSelected,
  buildFilteredSavedDecks,
  getSavedDeckSelectionUiState,
  getShownSavedDeckIds,
} from '../utils/deckBuilderSelections';

type UseDeckBuilderSavedDeckUiArgs = {
  savedDecks: SavedDeckRecordV1[];
  cards: DeckBuilderCardData[];
};

export const useDeckBuilderSavedDeckUi = ({
  savedDecks,
  cards,
}: UseDeckBuilderSavedDeckUiArgs) => {
  const [isMyDecksOpen, setIsMyDecksOpen] = React.useState(false);
  const [savedDeckSearch, setSavedDeckSearch] = React.useState('');
  const [pendingDeleteDeckId, setPendingDeleteDeckId] = React.useState<string | null>(null);
  const [showDeleteAllSavedDecksDialog, setShowDeleteAllSavedDecksDialog] = React.useState(false);
  const [showDeleteSelectedSavedDecksDialog, setShowDeleteSelectedSavedDecksDialog] = React.useState(false);
  const [pendingLoadDeckId, setPendingLoadDeckId] = React.useState<string | null>(null);
  const [isSavedDeckSelectMode, setIsSavedDeckSelectMode] = React.useState(false);
  const [selectedSavedDeckIds, setSelectedSavedDeckIds] = React.useState<string[]>([]);

  const filteredSavedDecks = React.useMemo(
    () => buildFilteredSavedDecks(savedDecks, cards, savedDeckSearch),
    [cards, savedDeckSearch, savedDecks]
  );
  const shownSavedDeckIds = React.useMemo(
    () => getShownSavedDeckIds(filteredSavedDecks),
    [filteredSavedDecks]
  );
  const savedDeckSelectionUiState = React.useMemo(() => getSavedDeckSelectionUiState({
    filteredSavedDeckCount: filteredSavedDecks.length,
    savedDeckCount: savedDecks.length,
    isSavedDeckSelectMode,
    selectedSavedDeckCount: selectedSavedDeckIds.length,
    areAllShownSavedDecksSelected: areAllShownSavedDecksSelected(shownSavedDeckIds, selectedSavedDeckIds),
  }), [filteredSavedDecks.length, isSavedDeckSelectMode, savedDecks.length, selectedSavedDeckIds, shownSavedDeckIds]);

  const applyDeckBuilderMyDecksUiState = React.useCallback((state: DeckBuilderMyDecksUiStatePatch) => {
    if (state.isMyDecksOpen !== undefined) {
      setIsMyDecksOpen(state.isMyDecksOpen);
    }
    if (state.pendingLoadDeckId !== undefined) {
      setPendingLoadDeckId(state.pendingLoadDeckId);
    }
    if (state.pendingDeleteDeckId !== undefined) {
      setPendingDeleteDeckId(state.pendingDeleteDeckId);
    }
    if (state.showDeleteAllSavedDecksDialog !== undefined) {
      setShowDeleteAllSavedDecksDialog(state.showDeleteAllSavedDecksDialog);
    }
    if (state.showDeleteSelectedSavedDecksDialog !== undefined) {
      setShowDeleteSelectedSavedDecksDialog(state.showDeleteSelectedSavedDecksDialog);
    }
    if (state.isSavedDeckSelectMode !== undefined) {
      setIsSavedDeckSelectMode(state.isSavedDeckSelectMode);
    }
    if (state.selectedSavedDeckIds !== undefined) {
      setSelectedSavedDeckIds(state.selectedSavedDeckIds);
    }
    if (state.savedDeckSearch !== undefined) {
      setSavedDeckSearch(state.savedDeckSearch);
    }
  }, []);

  const clearSavedDeckSelection = React.useCallback(() => {
    applyDeckBuilderMyDecksUiState(buildClearedSavedDeckSelectionUiState());
  }, [applyDeckBuilderMyDecksUiState]);

  const toggleSavedDeckSelection = React.useCallback((deckId: string) => {
    setSelectedSavedDeckIds((current) => (
      buildToggledSavedDeckSelectionUiState(current, deckId).selectedSavedDeckIds ?? current
    ));
  }, []);

  const handleToggleShownSavedDeckSelection = React.useCallback(() => {
    setSelectedSavedDeckIds((current) => (
      buildToggledShownSavedDeckSelectionUiState(current, shownSavedDeckIds).selectedSavedDeckIds ?? current
    ));
  }, [shownSavedDeckIds]);

  const handleCloseMyDecks = React.useCallback(() => {
    applyDeckBuilderMyDecksUiState(buildClosedMyDecksUiState());
  }, [applyDeckBuilderMyDecksUiState]);

  const handleToggleSavedDeckSelectionMode = React.useCallback(() => {
    if (isSavedDeckSelectMode) {
      clearSavedDeckSelection();
      return;
    }

    applyDeckBuilderMyDecksUiState(buildEnteredSavedDeckSelectionUiState());
  }, [applyDeckBuilderMyDecksUiState, clearSavedDeckSelection, isSavedDeckSelectMode]);

  const handleSavedDeckSearchChange = React.useCallback((value: string) => {
    applyDeckBuilderMyDecksUiState(buildUpdatedSavedDeckSearchUiState(value));
  }, [applyDeckBuilderMyDecksUiState]);

  return {
    isMyDecksOpen,
    savedDeckSearch,
    pendingDeleteDeckId,
    showDeleteAllSavedDecksDialog,
    showDeleteSelectedSavedDecksDialog,
    pendingLoadDeckId,
    isSavedDeckSelectMode,
    selectedSavedDeckIds,
    filteredSavedDecks,
    shownSavedDeckIds,
    savedDeckSelectionUiState,
    applyDeckBuilderMyDecksUiState,
    clearSavedDeckSelection,
    toggleSavedDeckSelection,
    handleToggleShownSavedDeckSelection,
    handleCloseMyDecks,
    handleToggleSavedDeckSelectionMode,
    handleSavedDeckSearchChange,
  };
};
