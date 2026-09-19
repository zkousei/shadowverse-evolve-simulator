export type DeckBuilderModalUiStatePatch = {
  showResetDeckDialog?: boolean;
  showResetBuilderDialog?: boolean;
  isDeckLogImportOpen?: boolean;
  deckLogInput?: string;
  isImportingDeckLog?: boolean;
};

export const buildOpenedResetDeckDialogUiState = (): DeckBuilderModalUiStatePatch => ({
  showResetDeckDialog: true,
});

export const buildDismissedResetDeckDialogUiState = (): DeckBuilderModalUiStatePatch => ({
  showResetDeckDialog: false,
});

export const buildOpenedResetBuilderDialogUiState = (): DeckBuilderModalUiStatePatch => ({
  showResetBuilderDialog: true,
});

export const buildDismissedResetBuilderDialogUiState = (): DeckBuilderModalUiStatePatch => ({
  showResetBuilderDialog: false,
});

export const buildOpenedDeckLogImportUiState = (): DeckBuilderModalUiStatePatch => ({
  isDeckLogImportOpen: true,
});

export const buildDismissedDeckLogImportUiState = (): DeckBuilderModalUiStatePatch => ({
  isDeckLogImportOpen: false,
  deckLogInput: '',
});

export const buildStartedDeckLogImportUiState = (): DeckBuilderModalUiStatePatch => ({
  isImportingDeckLog: true,
});

export const buildFinishedDeckLogImportUiState = (): DeckBuilderModalUiStatePatch => ({
  isImportingDeckLog: false,
});
