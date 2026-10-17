import React from 'react';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { DeckRuleConfig } from '../../models/deckRule';
import type { DeckState } from '../../models/deckState';
import { clearDraft, getSavedDeckById, loadDraft, type DeckBuilderSnapshot, type DeckBuilderDraftV1, type SavedDeckRecordV1 } from '../../utils/deck/deckStorage';
import {
  buildContinuedDraftRestoreSessionState,
  buildPendingDraftRestoreState,
  buildResetDeckBuilderSessionState,
  type DeckBuilderSessionState,
  type DeckBuilderTrackingStatePatch,
  type PendingDraftRestoreState,
} from '../../utils/deckBuilder/deckBuilderPersistence';

type UseDeckBuilderSessionTrackingArgs = {
  cards: DeckBuilderCardData[];
  resolveDraftCards?: (draft: DeckBuilderDraftV1, saved: SavedDeckRecordV1 | null) => Promise<DeckBuilderCardData[]>;
  setDeckName: React.Dispatch<React.SetStateAction<string>>;
  setDeckRuleConfig: React.Dispatch<React.SetStateAction<DeckRuleConfig>>;
  setDeckState: React.Dispatch<React.SetStateAction<DeckState>>;
};

export const useDeckBuilderSessionTracking = ({
  cards,
  setDeckName,
  setDeckRuleConfig,
  setDeckState,
  resolveDraftCards,
}: UseDeckBuilderSessionTrackingArgs) => {
  const [selectedSavedDeckId, setSelectedSavedDeckId] = React.useState<string | null>(null);
  const [savedBaselineSnapshot, setSavedBaselineSnapshot] = React.useState<DeckBuilderSnapshot | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [hasInitializedDraft, setHasInitializedDraft] = React.useState(false);
  const [pendingDraftRestore, setPendingDraftRestore] = React.useState<PendingDraftRestoreState | null>(null);

  const restoreEpoch = React.useRef(0);
  const [draftRestoreFailure, setDraftRestoreFailure] = React.useState<{ error: unknown } | null>(null);

  React.useEffect(() => {
    if (cards.length === 0 || hasInitializedDraft) return;

    const draft = loadDraft();
    if (!draft) {
      setHasInitializedDraft(true);
      return;
    }

    const savedDeck = draft.selectedDeckId ? getSavedDeckById(draft.selectedDeckId) : null;
    if (!resolveDraftCards) {
      setPendingDraftRestore(buildPendingDraftRestoreState(draft, cards, savedDeck));
      setHasInitializedDraft(true);
      return;
    }
    let active = true;
    const epoch = restoreEpoch.current;
    void resolveDraftCards(draft, savedDeck).then(fullCards => {
      if (!active || epoch !== restoreEpoch.current) return;
      const currentSaved = draft.selectedDeckId ? getSavedDeckById(draft.selectedDeckId) : null;
      if (JSON.stringify(loadDraft()) !== JSON.stringify(draft) || JSON.stringify(currentSaved) !== JSON.stringify(savedDeck)) {
        throw new Error('Draft or saved baseline changed while loading; reload to restore the current data');
      }
      setPendingDraftRestore(buildPendingDraftRestoreState(draft, fullCards, savedDeck));
      setHasInitializedDraft(true);
    }).catch(error => {
      if (active && epoch === restoreEpoch.current) setDraftRestoreFailure({ error });
    });
    return () => { active = false; };
  }, [cards, hasInitializedDraft, resolveDraftCards]);

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
    restoreEpoch.current++;
    setDraftRestoreFailure(null);
    setHasInitializedDraft(true);
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
    draftRestoreFailure,
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
