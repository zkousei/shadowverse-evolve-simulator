import React from 'react';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import type { DeckState } from '../models/deckState';
import { clearDraft, getSavedDeckById, loadDraft, type DeckBuilderSnapshot } from '../utils/deckStorage';
import {
  buildContinuedDraftRestoreSessionState,
  buildPendingDraftRestoreState,
  buildResetDeckBuilderSessionState,
  type DeckBuilderSessionState,
  type DeckBuilderTrackingStatePatch,
  type PendingDraftRestoreState,
} from '../utils/deckBuilderPersistence';

type UseDeckBuilderSessionTrackingArgs = {
  cards: DeckBuilderCardData[];
  setDeckName: React.Dispatch<React.SetStateAction<string>>;
  setDeckRuleConfig: React.Dispatch<React.SetStateAction<DeckRuleConfig>>;
  setDeckState: React.Dispatch<React.SetStateAction<DeckState>>;
};

export const useDeckBuilderSessionTracking = ({
  cards,
  setDeckName,
  setDeckRuleConfig,
  setDeckState,
}: UseDeckBuilderSessionTrackingArgs) => {
  const [selectedSavedDeckId, setSelectedSavedDeckId] = React.useState<string | null>(null);
  const [savedBaselineSnapshot, setSavedBaselineSnapshot] = React.useState<DeckBuilderSnapshot | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = React.useState(false);
  const [pendingDraftRestore, setPendingDraftRestore] = React.useState<PendingDraftRestoreState | null>(null);

  React.useEffect(() => {
    if (cards.length === 0 || hasInitializedDraft) return;

    const draft = loadDraft();
    if (!draft) {
      setHasInitializedDraft(true);
      return;
    }

    const savedDeck = draft.selectedDeckId ? getSavedDeckById(draft.selectedDeckId) : null;
    setPendingDraftRestore(buildPendingDraftRestoreState(draft, cards, savedDeck));
    setHasInitializedDraft(true);
  }, [cards, hasInitializedDraft]);

  const applyDeckBuilderTrackingState = React.useCallback((state: DeckBuilderTrackingStatePatch) => {
    if (state.selectedSavedDeckId !== undefined) {
      setSelectedSavedDeckId(state.selectedSavedDeckId);
    }
    if (state.savedBaselineSnapshot !== undefined) {
      setSavedBaselineSnapshot(state.savedBaselineSnapshot);
    }
    if (state.draftRestored !== undefined) {
      setDraftRestored(state.draftRestored);
    }
    if (state.pendingDraftRestore !== undefined) {
      setPendingDraftRestore(state.pendingDraftRestore);
    }
  }, []);

  const applyDeckBuilderSessionState = React.useCallback((state: DeckBuilderSessionState) => {
    if (state.deckName !== undefined) {
      setDeckName(state.deckName);
    }

    setDeckRuleConfig(state.ruleConfig);
    setDeckState(state.deckState);
    applyDeckBuilderTrackingState(state);
  }, [applyDeckBuilderTrackingState, setDeckName, setDeckRuleConfig, setDeckState]);

  const resetBuilderState = React.useCallback(() => {
    applyDeckBuilderSessionState(buildResetDeckBuilderSessionState());
  }, [applyDeckBuilderSessionState]);

  const handleStartFresh = React.useCallback(() => {
    clearDraft();
    resetBuilderState();
  }, [resetBuilderState]);

  const handleContinueDraftRestore = React.useCallback(() => {
    if (!pendingDraftRestore) return;

    applyDeckBuilderSessionState(buildContinuedDraftRestoreSessionState(pendingDraftRestore));
  }, [applyDeckBuilderSessionState, pendingDraftRestore]);

  return {
    selectedSavedDeckId,
    savedBaselineSnapshot,
    draftRestored,
    hasInitializedDraft,
    pendingDraftRestore,
    applyDeckBuilderTrackingState,
    applyDeckBuilderSessionState,
    resetBuilderState,
    handleStartFresh,
    handleContinueDraftRestore,
  };
};
