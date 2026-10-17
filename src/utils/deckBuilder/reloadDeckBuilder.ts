import { clearDraft, loadDraft, saveDraft } from '../deck/deckStorage';

type ReloadState = {
  initialized: boolean;
  pendingRestore: boolean;
  hasBuilderState: boolean;
  payload: Parameters<typeof saveDraft>[0];
};

/** A storage error must stop the reload rather than lose the current edit. */
export const reloadDeckBuilderPreservingDraft = (state: ReloadState, reload: () => void): void => {
  const canInitializeNewDraft = !state.initialized && !loadDraft() && state.hasBuilderState;
  if (!state.pendingRestore && (state.initialized || canInitializeNewDraft)) {
    if (state.hasBuilderState) {
      const saved = saveDraft(state.payload);
      if (JSON.stringify(loadDraft()) !== JSON.stringify(saved)) throw new Error('Draft could not be verified');
    } else {
      clearDraft();
    }
  }
  reload();
};
