import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDeckBuilderSessionTracking } from './useDeckBuilderSessionTracking';
import * as DeckStorage from '../../utils/deck/deckStorage';
import { createDefaultDeckRuleConfig } from '../../models/deckRule';
import { createEmptyDeckState } from '../../models/deckState';

import type { DeckBuilderCardData } from '../../models/deckBuilderCard';

vi.mock('../../utils/deck/deckStorage', () => ({
  loadDraft: vi.fn(),
  getSavedDeckById: vi.fn(),
  clearDraft: vi.fn(),
  createDeckSnapshot: vi.fn((name, config, state) => ({ name, ruleConfig: config, deckState: state })),
  restoreDraftToSnapshot: vi.fn((draft) => ({
    snapshot: { name: draft.name, ruleConfig: draft.ruleConfig, deckState: { mainDeck: [], evolveDeck: [], leaderCards: [], tokenDeck: [] } },
    missingCardIds: [],
  })),
  restoreSavedDeckToSnapshot: vi.fn((deck) => ({
    snapshot: { name: deck.name, ruleConfig: deck.ruleConfig, deckState: { mainDeck: [], evolveDeck: [], leaderCards: [], tokenDeck: [] } },
    missingCardIds: [],
  })),
}));

describe('useDeckBuilderSessionTracking', () => {
  const cards = [{ id: '1', name: 'Card 1' }] as unknown as DeckBuilderCardData[];
  const setDeckName = vi.fn();
  const setDeckRuleConfig = vi.fn();
  const setDeckState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes draft on mount if draft exists', () => {
    const mockDraft = {
      selectedDeckId: 'deck-1',
      name: 'Draft Deck',
      ruleConfig: createDefaultDeckRuleConfig(),
      sections: { main: [], evolve: [], leader: [], token: [] },
    };
    vi.mocked(DeckStorage.loadDraft).mockReturnValue(mockDraft as unknown as DeckStorage.DeckBuilderDraftV1);
    vi.mocked(DeckStorage.getSavedDeckById).mockReturnValue({ id: 'deck-1', name: 'Saved Name' } as unknown as DeckStorage.SavedDeckRecordV1);

    const { result } = renderHook(() => useDeckBuilderSessionTracking({
      cards,
      setDeckName,
      setDeckRuleConfig,
      setDeckState,
    }));

    expect(result.current.hasInitializedDraft).toBe(true);
    expect(result.current.pendingDraftRestore).not.toBeNull();
    expect(result.current.pendingDraftRestore?.selectedDeckId).toBe('deck-1');
  });

  it('handles start fresh correctly', () => {
    const { result } = renderHook(() => useDeckBuilderSessionTracking({
      cards,
      setDeckName,
      setDeckRuleConfig,
      setDeckState,
    }));

    act(() => {
      result.current.handleStartFresh();
    });

    expect(DeckStorage.clearDraft).toHaveBeenCalled();
    expect(setDeckName).toHaveBeenCalledWith('');
    expect(setDeckRuleConfig).toHaveBeenCalled();
    expect(setDeckState).toHaveBeenCalled();
  });

  it('continues draft restore', () => {
    const mockPendingRestore = {
      snapshot: {
        name: 'Restored',
        ruleConfig: createDefaultDeckRuleConfig(),
        deckState: createEmptyDeckState(),
      },
      selectedDeckId: 'deck-1',
      baselineSnapshot: null,
    };

    const { result } = renderHook(() => useDeckBuilderSessionTracking({
      cards,
      setDeckName,
      setDeckRuleConfig,
      setDeckState,
    }));

    act(() => {
      result.current.applyDeckBuilderTrackingState({ pendingDraftRestore: mockPendingRestore });
    });

    act(() => {
      result.current.handleContinueDraftRestore();
    });

    expect(setDeckName).toHaveBeenCalledWith('Restored');
    expect(result.current.draftRestored).toBe(true);
    expect(result.current.pendingDraftRestore).toBeNull();
  });
});


describe('asynchronous generated-catalog draft restoration', () => {
  const draft = { schemaVersion: 1 as const, selectedDeckId: null, lastEditedAt: 'now', name: 'Draft',
    ruleConfig: createDefaultDeckRuleConfig(), sections: { main: [], evolve: [], leader: [], token: [] } };
  const summaries = [{ id: 'A', name: 'Summary', image: '' }];
  const full = [{ id: 'A', name: 'Full', image: '', ability_text: 'Ability' }];
  const setters = { setDeckName: vi.fn(), setDeckRuleConfig: vi.fn(), setDeckState: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DeckStorage.loadDraft).mockReturnValue(draft);
  });

  it('waits for all full details before initializing or building the restore dialog', async () => {
    let resolve!: (cards: DeckBuilderCardData[]) => void;
    const resolveDraftCards = vi.fn(() => new Promise<DeckBuilderCardData[]>(yes => { resolve = yes; }));
    const { result } = renderHook(() => useDeckBuilderSessionTracking({ cards: summaries, ...setters, resolveDraftCards }));
    expect(result.current.hasInitializedDraft).toBe(false);
    expect(DeckStorage.restoreDraftToSnapshot).not.toHaveBeenCalled();
    await act(async () => resolve(full));
    expect(result.current.hasInitializedDraft).toBe(true);
    expect(DeckStorage.restoreDraftToSnapshot).toHaveBeenCalledWith(draft, full);
    expect(result.current.pendingDraftRestore).not.toBeNull();
  });

  it('keeps the original draft and initialization guard when detail acquisition fails', async () => {
    const error = new Error('404');
    const resolveDraftCards = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useDeckBuilderSessionTracking({ cards: summaries, ...setters, resolveDraftCards }));
    await waitFor(() => expect(result.current.draftRestoreFailure).toEqual({ error }));
    expect(result.current.hasInitializedDraft).toBe(false);
    expect(result.current.pendingDraftRestore).toBeNull();
    expect(DeckStorage.clearDraft).not.toHaveBeenCalled();
    expect(DeckStorage.restoreDraftToSnapshot).not.toHaveBeenCalled();
    act(() => result.current.resetBuilderState());
    expect(result.current.draftRestoreFailure).toBeNull();
  });

  it('does not apply draft details after unmounting', async () => {
    let resolve!: (cards: DeckBuilderCardData[]) => void;
    const resolveDraftCards = () => new Promise<DeckBuilderCardData[]>(yes => { resolve = yes; });
    const { unmount } = renderHook(() => useDeckBuilderSessionTracking({ cards: summaries, ...setters, resolveDraftCards }));
    unmount();
    await act(async () => resolve(full));
    expect(DeckStorage.restoreDraftToSnapshot).not.toHaveBeenCalled();
  });

  it('resetting the builder invalidates a pending draft hydration', async () => {
    let resolve!: (cards: DeckBuilderCardData[]) => void;
    const resolveDraftCards = () => new Promise<DeckBuilderCardData[]>(yes => { resolve = yes; });
    const { result } = renderHook(() => useDeckBuilderSessionTracking({ cards: summaries, ...setters, resolveDraftCards }));
    act(() => result.current.resetBuilderState());
    await act(async () => resolve(full));
    expect(result.current.pendingDraftRestore).toBeNull();
    expect(DeckStorage.restoreDraftToSnapshot).not.toHaveBeenCalled();
  });


  it.each(['saved record deleted', 'draft changed'])('does not restore a stale snapshot when %s while details load', async scenario => {
    const selectedDraft = { ...draft, selectedDeckId: 'saved' };
    vi.mocked(DeckStorage.loadDraft).mockReturnValue(selectedDraft);
    vi.mocked(DeckStorage.getSavedDeckById).mockReturnValue({ schemaVersion: 1, id: 'saved', name: 'Saved',
      createdAt: 'now', updatedAt: 'now', ruleConfig: draft.ruleConfig, sections: draft.sections });
    let resolve!: (cards: DeckBuilderCardData[]) => void;
    const resolveDraftCards = () => new Promise<DeckBuilderCardData[]>(yes => { resolve = yes; });
    const { result } = renderHook(() => useDeckBuilderSessionTracking({ cards: summaries, ...setters, resolveDraftCards }));
    if (scenario === 'saved record deleted') vi.mocked(DeckStorage.getSavedDeckById).mockReturnValue(null);
    else vi.mocked(DeckStorage.loadDraft).mockReturnValue({ ...selectedDraft, name: 'Another tab edit' });
    await act(async () => resolve(full));
    expect(result.current.draftRestoreFailure).not.toBeNull();
    expect(result.current.hasInitializedDraft).toBe(false);
    expect(result.current.pendingDraftRestore).toBeNull();
  });

});
