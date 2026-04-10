import React from 'react';
import type { DeckBuilderModalUiStatePatch } from '../utils/deckBuilderModalState';

type SaveFeedback = {
  kind: 'success' | 'warning';
  message: string;
};

export const useDeckBuilderModalUi = () => {
  const [showResetDeckDialog, setShowResetDeckDialog] = React.useState(false);
  const [showResetBuilderDialog, setShowResetBuilderDialog] = React.useState(false);
  const [saveFeedback, setSaveFeedback] = React.useState<SaveFeedback | null>(null);
  const [isDeckLogImportOpen, setIsDeckLogImportOpen] = React.useState(false);
  const [deckLogInput, setDeckLogInput] = React.useState('');
  const [isImportingDeckLog, setIsImportingDeckLog] = React.useState(false);

  React.useEffect(() => {
    if (!saveFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const applyDeckBuilderModalUiState = React.useCallback((state: DeckBuilderModalUiStatePatch) => {
    if (state.showResetDeckDialog !== undefined) {
      setShowResetDeckDialog(state.showResetDeckDialog);
    }
    if (state.showResetBuilderDialog !== undefined) {
      setShowResetBuilderDialog(state.showResetBuilderDialog);
    }
    if (state.isDeckLogImportOpen !== undefined) {
      setIsDeckLogImportOpen(state.isDeckLogImportOpen);
    }
    if (state.deckLogInput !== undefined) {
      setDeckLogInput(state.deckLogInput);
    }
    if (state.isImportingDeckLog !== undefined) {
      setIsImportingDeckLog(state.isImportingDeckLog);
    }
  }, []);

  return {
    showResetDeckDialog,
    showResetBuilderDialog,
    saveFeedback,
    setSaveFeedback,
    isDeckLogImportOpen,
    deckLogInput,
    setDeckLogInput,
    isImportingDeckLog,
    applyDeckBuilderModalUiState,
  };
};
