import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDeckBuilderSessionTracking } from './useDeckBuilderSessionTracking';
import * as DeckStorage from '../utils/deckStorage';
import { createDefaultDeckRuleConfig } from '../models/deckRule';
import { createEmptyDeckState } from '../models/deckState';

import type { DeckBuilderCardData } from '../models/deckBuilderCard';

vi.mock('../utils/deckStorage', () => ({
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
