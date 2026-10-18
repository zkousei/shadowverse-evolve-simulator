import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { SAVED_DECKS_KEY, type SavedDeckRecordV1 } from '../../utils/deck/deckStorage';
import { buildSyncState } from './gameBoardTestUtils';
import { useGameBoardSavedDeckPicker } from './useGameBoardSavedDeckPicker';


const token: DeckBuilderCardData = {
  id: 'TOKEN-1', name: 'Token', image: '/token.png', deck_section: 'token',
  card_kind_normalized: 'token_follower', is_token: true, ability_text: 'Token ability',
};
const main: DeckBuilderCardData = {
  id: 'MAIN-1', name: 'Main', image: '/main.png', deck_section: 'main',
  card_kind_normalized: 'follower', ability_text: 'Main ability',
  faces: [{ side: 'back', name: 'Back', ability_text: 'Back ability' }],
  related_cards: [{ id: token.id, name: token.name }],
};
const record: SavedDeckRecordV1 = {
  schemaVersion: 1, id: 'saved-1', name: 'Original',
  createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
  ruleConfig: { format: 'other', identityType: 'class', selectedClass: null, selectedTitle: null, selectedClasses: [null, null] },
  sections: { main: [{ cardId: main.id, count: 1 }], evolve: [], leader: [], token: [] },
};
const store = (decks: SavedDeckRecordV1[]) => localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify({ schemaVersion: 1, decks }));
const args = () => ({
  catalogCards: [main, token], gameState: buildSyncState(), importDeckData: vi.fn(), isSoloMode: true,
  role: 'host' as const, t: (key: string) => key,
});
const open = async (options = args(), target: 'host' | 'guest' = 'host') => {
  const hook = renderHook(props => useGameBoardSavedDeckPicker(props), { initialProps: options });
  await waitFor(() => expect(hook.result.current.allCardsLength).toBe(2));
  act(() => hook.result.current.openSavedDeckPicker(target));
  expect(hook.result.current.filteredSavedDeckOptions).toHaveLength(1);
  return { ...hook, options, selected: hook.result.current.filteredSavedDeckOptions[0] };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  store([record]);
});

describe('useGameBoardSavedDeckPicker', () => {
  it('uses the shared catalog when it becomes available after a retry', () => {
    const options = args();
    options.catalogCards = [];
    const { result, rerender } = renderHook(props => useGameBoardSavedDeckPicker(props), { initialProps: options });
    act(() => result.current.openSavedDeckPicker('host'));
    expect(result.current.savedDeckImportTargetRole).toBeNull();
    expect(result.current.allCardsLength).toBe(0);
    rerender({ ...options, catalogCards: [main, token] });
    act(() => result.current.openSavedDeckPicker('host'));
    expect(result.current.allCardsLength).toBe(2);
    expect(result.current.filteredSavedDeckOptions).toHaveLength(1);
  });

  it.each(['host', 'guest'] as const)('imports complete current details and related tokens for %s, then closes', async target => {
    const { result, options, selected } = await open(args(), target);
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({
      mainDeck: [main], evolveDeck: [], leaderCards: [], tokenDeck: [token],
    }, target);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('refreshes a deleted record without importing the stale selection or hiding other decks', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, id: 'other', name: 'Other' }]);
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.savedDeckImportTargetRole).toBe('host');
    expect(result.current.filteredSavedDeckOptions.map(option => option.deck.id)).toEqual(['other']);
  });

  it.each(['contents', 'name', 'rules'] as const)('refreshes changed %s even with an unchanged timestamp and requires selecting again', async change => {
    const { result, options, selected } = await open();
    const updated = structuredClone(record);
    if (change === 'contents') updated.sections.main[0].count = 2;
    if (change === 'name') updated.name = 'Renamed';
    if (change === 'rules') updated.ruleConfig.selectedTitle = 'New title';
    store([updated]);
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.filteredSavedDeckOptions[0].deck).toEqual(updated);
    act(() => result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]));
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
    expect(options.importDeckData.mock.calls[0][0].mainDeck).toHaveLength(change === 'contents' ? 2 : 1);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('does not import a record that became invalid while the picker was open', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, sections: { ...record.sections, main: [{ cardId: 'MISSING', count: 1 }] } }]);
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.filteredSavedDeckOptions).toEqual([]);
  });

  it('does not invalidate the selection when only a different saved deck changes', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, id: 'other', name: 'Other' }, record]);
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
  });

  it('checks current import rules after the picker has opened', async () => {
    const { result, rerender, options, selected } = await open();
    rerender({ ...options, gameState: buildSyncState({ host: { isReady: true } }) });
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).not.toHaveBeenCalled();
  });

  it('ignores selection after closing the picker', async () => {
    const { result, options, selected } = await open();
    act(() => result.current.closeSavedDeckPicker());
    act(() => result.current.handleSavedDeckImport(selected));
    expect(options.importDeckData).not.toHaveBeenCalled();
  });
});
