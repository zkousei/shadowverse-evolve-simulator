import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDeckBuilderSavedDeckUi } from './useDeckBuilderSavedDeckUi';
import type { SavedDeckRecordV1 } from '../utils/deckStorage';
import { createDefaultDeckRuleConfig } from '../models/deckRule';

describe('useDeckBuilderSavedDeckUi', () => {
  const ruleConfig = createDefaultDeckRuleConfig();
  const mockDecks: SavedDeckRecordV1[] = [
    {
      schemaVersion: 1,
      id: 'deck-1',
      name: 'Aggro Elf',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      ruleConfig,
      sections: { main: [], evolve: [], leader: [], token: [] },
    },
    {
      schemaVersion: 1,
      id: 'deck-2',
      name: 'Control Havencraft',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      ruleConfig,
      sections: { main: [], evolve: [], leader: [], token: [] },
    },
  ];

  it('initializes with default values', () => {
    const { result } = renderHook(() => useDeckBuilderSavedDeckUi({ savedDecks: mockDecks, cards: [] }));

    expect(result.current.isMyDecksOpen).toBe(false);
    expect(result.current.savedDeckSearch).toBe('');
    expect(result.current.isSavedDeckSelectMode).toBe(false);
    expect(result.current.selectedSavedDeckIds).toEqual([]);
    expect(result.current.shownSavedDeckIds).toHaveLength(2);
  });

  it('toggles selection mode and clears selection when exiting', () => {
    const { result } = renderHook(() => useDeckBuilderSavedDeckUi({ savedDecks: mockDecks, cards: [] }));

    act(() => {
      result.current.handleToggleSavedDeckSelectionMode();
    });
    expect(result.current.isSavedDeckSelectMode).toBe(true);

    act(() => {
      result.current.toggleSavedDeckSelection('deck-1');
    });
    expect(result.current.selectedSavedDeckIds).toEqual(['deck-1']);

    act(() => {
      result.current.handleToggleSavedDeckSelectionMode();
    });
    expect(result.current.isSavedDeckSelectMode).toBe(false);
    expect(result.current.selectedSavedDeckIds).toEqual([]);
  });

  it('filters shown decks based on search', () => {
    const { result } = renderHook(() => useDeckBuilderSavedDeckUi({ savedDecks: mockDecks, cards: [] }));

    act(() => {
      result.current.handleSavedDeckSearchChange('Havencraft');
    });

    expect(result.current.shownSavedDeckIds).toEqual(['deck-2']);
  });

  it('selects and deselects all shown decks', () => {
    const { result } = renderHook(() => useDeckBuilderSavedDeckUi({ savedDecks: mockDecks, cards: [] }));

    act(() => {
      result.current.handleToggleSavedDeckSelectionMode();
      result.current.handleToggleShownSavedDeckSelection();
    });
    expect(result.current.selectedSavedDeckIds).toEqual(['deck-1', 'deck-2']);

    act(() => {
      result.current.handleToggleShownSavedDeckSelection();
    });
    expect(result.current.selectedSavedDeckIds).toEqual([]);
  });

  it('closes my decks panel', () => {
    const { result } = renderHook(() => useDeckBuilderSavedDeckUi({ savedDecks: mockDecks, cards: [] }));

    act(() => {
      result.current.applyDeckBuilderMyDecksUiState({ isMyDecksOpen: true });
    });
    expect(result.current.isMyDecksOpen).toBe(true);

    act(() => {
      result.current.handleCloseMyDecks();
    });
    expect(result.current.isMyDecksOpen).toBe(false);
  });
});
