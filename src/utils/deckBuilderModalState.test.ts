import { describe, expect, it } from 'vitest';
import {
  buildDismissedDeckLogImportUiState,
  buildDismissedResetBuilderDialogUiState,
  buildDismissedResetDeckDialogUiState,
  buildFinishedDeckLogImportUiState,
  buildOpenedDeckLogImportUiState,
  buildOpenedResetBuilderDialogUiState,
  buildOpenedResetDeckDialogUiState,
  buildStartedDeckLogImportUiState,
} from './deckBuilderModalState';

describe('deckBuilderModalState', () => {
  it('builds reset dialog open and close patches', () => {
    expect(buildOpenedResetDeckDialogUiState()).toEqual({
      showResetDeckDialog: true,
    });
    expect(buildDismissedResetDeckDialogUiState()).toEqual({
      showResetDeckDialog: false,
    });
    expect(buildOpenedResetBuilderDialogUiState()).toEqual({
      showResetBuilderDialog: true,
    });
    expect(buildDismissedResetBuilderDialogUiState()).toEqual({
      showResetBuilderDialog: false,
    });
  });

  it('builds deck log modal patches for open, cancel, and request lifecycle', () => {
    expect(buildOpenedDeckLogImportUiState()).toEqual({
      isDeckLogImportOpen: true,
    });
    expect(buildDismissedDeckLogImportUiState()).toEqual({
      isDeckLogImportOpen: false,
      deckLogInput: '',
    });
    expect(buildStartedDeckLogImportUiState()).toEqual({
      isImportingDeckLog: true,
    });
    expect(buildFinishedDeckLogImportUiState()).toEqual({
      isImportingDeckLog: false,
    });
  });
});
