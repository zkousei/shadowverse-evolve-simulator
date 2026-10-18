import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardSetupActions, type PendingDeckImport } from './useGameBoardSetupActions';
import type { PlayerRole } from '../../types/game';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { SAVED_DECKS_KEY, type SavedDeckRecordV1 } from '../../utils/deck/deckStorage';
import { buildSyncState } from './gameBoardTestUtils';
import { useGameBoardSavedDeckPicker } from './useGameBoardSavedDeckPicker';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import { createGameBoardSavedDeckReader } from '../../utils/gameBoard/gameBoardSavedDeckReader';
import { applyGameSyncEvent } from '../../utils/gameBoard/gameSyncReducer';


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
  beginDeckImport: vi.fn<(target: PlayerRole) => PendingDeckImport | null>(() => {
    let valid = true;
    return { isCurrent: () => valid, cancel: () => { valid = false; } };
  }),
  resolveSavedDeckCards: undefined as ((deck: SavedDeckRecordV1) => Promise<DeckBuilderCardData[]>) | undefined,
  catalogCards: [main, token], gameState: buildSyncState(), importDeckData: vi.fn(), isSoloMode: true,
  role: 'host' as PlayerRole, t: (key: string) => key,
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
  it('retains only saved-record and presentation data while the list is open', async () => {
    const { result, selected } = await open();
    expect(Object.keys(selected).sort()).toEqual(['counts', 'deck', 'summary']);
    expect(selected).not.toHaveProperty('deckData');
    act(() => result.current.setSavedDeckSearch('Original'));
    expect(result.current.filteredSavedDeckOptions[0]).toBe(selected);
  });


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
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({
      mainDeck: [main], evolveDeck: [], leaderCards: [], tokenDeck: [token],
    }, target);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('restores the selected record using current full details rather than list data', async () => {
    const { result, rerender, options, selected } = await open();
    const latest = { ...main, ability_text: 'Updated ability', faces: [{ side: 'back', name: 'Updated back', ability_text: 'Updated back ability' }] };
    rerender({ ...options, catalogCards: [latest, token] });
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({
      mainDeck: [latest], evolveDeck: [], leaderCards: [], tokenDeck: [token],
    }, 'host');
  });

  it('rejects a selected record when its card disappeared from the current catalog', async () => {
    const { result, rerender, options, selected } = await open();
    rerender({ ...options, catalogCards: [token] });
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.filteredSavedDeckOptions).toEqual([]);
    expect(result.current.savedDeckImportTargetRole).toBe('host');
  });

  it('refreshes a deleted record without importing the stale selection or hiding other decks', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, id: 'other', name: 'Other' }]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
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
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.filteredSavedDeckOptions[0].deck).toEqual(updated);
    await act(async () => { await result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]); });
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
    expect(options.importDeckData.mock.calls[0][0].mainDeck).toHaveLength(change === 'contents' ? 2 : 1);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('does not import a record that became invalid while the picker was open', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, sections: { ...record.sections, main: [{ cardId: 'MISSING', count: 1 }] } }]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.filteredSavedDeckOptions).toEqual([]);
  });

  it('does not invalidate the selection when only a different saved deck changes', async () => {
    const { result, options, selected } = await open();
    store([{ ...record, id: 'other', name: 'Other' }, record]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
  });

  it('checks current import rules after the picker has opened', async () => {
    const { result, rerender, options, selected } = await open();
    rerender({ ...options, gameState: buildSyncState({ host: { isReady: true } }) });
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
  });

  it('ignores selection after closing the picker', async () => {
    const { result, options, selected } = await open();
    act(() => result.current.closeSavedDeckPicker());
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
  });
});


const deferredCards = () => {
  let resolve!: (cards: DeckBuilderCardData[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<DeckBuilderCardData[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('pending saved-deck details', () => {
  it.each(['success', 'failure'] as const)('ignores late saved-deck %s after an authoritative reset of the same empty board, then permits retry', async outcome => {
    const pending = deferredCards();
    const options = args();
    const load = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue([main, token]);
    const stateRef = { current: options.gameState };
    const dispatch = vi.fn();
    const { result } = renderHook(() => {
      const setup = useGameBoardSetupActions({ canInteract: true, gameState: options.gameState, gameStateRef: stateRef,
        role: options.role, uuid: () => 'test-id', dispatchGameEvent: dispatch, setShowResetConfirm: vi.fn(), t: options.t });
      return useGameBoardSavedDeckPicker({ ...options, resolveSavedDeckCards: load, beginDeckImport: setup.beginDeckImport, importDeckData: setup.importDeckData });
    });
    act(() => result.current.openSavedDeckPicker('host'));
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]); });
    stateRef.current = applyGameSyncEvent(stateRef.current, { id: 'received-reset', type: 'RESET_GAME', actor: 'host' });
    await act(async () => {
      if (outcome === 'success') pending.resolve([main, token]);
      else pending.reject(new Error('Old read failed'));
      await finished;
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.savedDeckLoadFailed).toBe(false);
    expect(result.current.isSavedDeckLoading).toBe(false);
    await act(async () => { await result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]); });
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'IMPORT_DECK', actor: 'host' }));
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('accepts the pinned saved-deck reader as a resolver and retries a failure before importing complete data', async () => {
    const source = generatedCatalogFixture([main, token]);
    const related = vi.spyOn(source, 'loadCardsWithRelated').mockRejectedValueOnce(new Error('HTTP 404'));
    const reader = createGameBoardSavedDeckReader(source);
    const options = args();
    options.resolveSavedDeckCards = reader.loadCards;
    const { result, selected } = await open(options);
    expect(related).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.savedDeckLoadFailed).toBe(true);
    expect(result.current.savedDeckImportTargetRole).toBe('host');
    expect(related).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(related).toHaveBeenCalledTimes(2);
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({
      mainDeck: [main], evolveDeck: [], leaderCards: [], tokenDeck: [token],
    }, 'host');
    expect(result.current.savedDeckLoadFailed).toBe(false);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it('does not commit a pinned reader response after the picker closes, and permits a later load', async () => {
    const source = generatedCatalogFixture([main, token]);
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const read = source.loadCardsWithRelated;
    vi.spyOn(source, 'loadCardsWithRelated').mockImplementationOnce(async ids => {
      await gate;
      return read(ids);
    });
    const options = args();
    options.resolveSavedDeckCards = createGameBoardSavedDeckReader(source).loadCards;
    const { result, selected } = await open(options);
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleSavedDeckImport(selected); });
    expect(result.current.isSavedDeckLoading).toBe(true);
    act(() => result.current.closeSavedDeckPicker());
    await act(async () => { finish(); await pending; });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.savedDeckLoadFailed).toBe(false);
    act(() => result.current.openSavedDeckPicker('guest'));
    await act(async () => { await result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]); });
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({
      mainDeck: [main], evolveDeck: [], leaderCards: [], tokenDeck: [token],
    }, 'guest');
  });

  it('does not start resolving when the shared guard refuses the import', async () => {
    const options = args(); options.beginDeckImport.mockReturnValue(null);
    options.resolveSavedDeckCards = vi.fn().mockResolvedValue([main, token]);
    const { result, selected } = await open(options);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.resolveSavedDeckCards).not.toHaveBeenCalled();
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.isSavedDeckLoading).toBe(false);
  });

  it('rejects an incomplete related-token result and allows a complete retry', async () => {
    const options = args(); const load = vi.fn().mockResolvedValue([main]); options.resolveSavedDeckCards = load;
    const { result, selected } = await open(options);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.savedDeckLoadFailed).toBe(true);
    load.mockResolvedValue([main, token]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
  });

  it('waits for complete cards before importing and exposes loading state', async () => {
    const pending = deferredCards();
    const options = args();
    options.resolveSavedDeckCards = vi.fn(() => pending.promise);
    const { result, selected } = await open(options);
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(selected); });
    expect(result.current.isSavedDeckLoading).toBe(true);
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(options.resolveSavedDeckCards).toHaveBeenCalledWith(record);
    await act(async () => { pending.resolve([main, token]); await finished; });
    expect(result.current.isSavedDeckLoading).toBe(false);
    expect(options.importDeckData).toHaveBeenCalledExactlyOnceWith({ mainDeck: [main], evolveDeck: [], leaderCards: [], tokenDeck: [token] }, 'host');
  });

  it('clears the previous failure when a new attempt discovers a deleted record', async () => {
    const options = args(); const load = vi.fn().mockRejectedValue(new Error('Offline')); options.resolveSavedDeckCards = load;
    const { result, selected } = await open(options);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(result.current.savedDeckLoadFailed).toBe(true);
    store([]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(result.current.savedDeckLoadFailed).toBe(false);
    expect(result.current.filteredSavedDeckOptions).toEqual([]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps the picker open after failure and allows explicit retry', async () => {
    const pending = deferredCards();
    const options = args();
    const load = vi.fn(() => pending.promise);
    options.resolveSavedDeckCards = load;
    const { result, selected } = await open(options);
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(selected); });
    await act(async () => { pending.reject(new Error('404')); await finished; });
    expect(result.current.savedDeckLoadFailed).toBe(true);
    expect(result.current.savedDeckImportTargetRole).toBe('host');
    expect(options.importDeckData).not.toHaveBeenCalled();
    load.mockResolvedValue([main, token]);
    await act(async () => { await result.current.handleSavedDeckImport(selected); });
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
    expect(result.current.savedDeckLoadFailed).toBe(false);
    expect(result.current.savedDeckImportTargetRole).toBeNull();
  });

  it.each((['close', 'target', 'catalog', 'resolver', 'role', 'unmount'] as const).flatMap(change => (['success', 'failure'] as const).map(outcome => ({ change, outcome }))))('ignores late $outcome after $change', async ({ change, outcome }) => {
    const pending = deferredCards();
    const options = args();
    options.resolveSavedDeckCards = () => pending.promise;
    const { result, rerender, unmount, selected } = await open(options);
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(selected); });
    if (change === 'close') act(() => result.current.closeSavedDeckPicker());
    if (change === 'target') act(() => result.current.openSavedDeckPicker('guest'));
    if (change === 'catalog') rerender({ ...options, catalogCards: [...options.catalogCards] });
    if (change === 'resolver') rerender({ ...options, resolveSavedDeckCards: () => Promise.resolve([main, token]) });
    if (change === 'role') rerender({ ...options, role: 'guest' });
    if (change === 'unmount') unmount();
    await act(async () => { if (outcome === 'success') pending.resolve([main, token]); else pending.reject(new Error('Stale failure')); await finished; });
    expect(options.importDeckData).not.toHaveBeenCalled();
    if (change === 'target') expect(result.current.savedDeckImportTargetRole).toBe('guest');
    if (change !== 'unmount') expect(result.current.savedDeckLoadFailed).toBe(false);
  });

  it.each(['updated', 'deleted'] as const)('rechecks the saved record when it was %s during loading', async change => {
    const pending = deferredCards();
    const options = args(); options.resolveSavedDeckCards = () => pending.promise;
    const { result, selected } = await open(options);
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(selected); });
    store(change === 'deleted' ? [] : [{ ...record, name: 'Updated' }]);
    await act(async () => { pending.resolve([main, token]); await finished; });
    expect(options.importDeckData).not.toHaveBeenCalled();
    expect(result.current.savedDeckImportTargetRole).toBe('host');
    expect(result.current.filteredSavedDeckOptions.map(option => option.deck.name)).toEqual(change === 'deleted' ? [] : ['Updated']);
  });

  it('does not revive a request when preparation becomes invalid and then valid again', async () => {
    const pending = deferredCards(); const options = args(); options.resolveSavedDeckCards = () => pending.promise;
    const { result, rerender, selected } = await open(options);
    let finished!: Promise<void>;
    act(() => { finished = result.current.handleSavedDeckImport(selected); });
    rerender({ ...options, gameState: buildSyncState({ host: { isReady: true } }) });
    rerender(options);
    await act(async () => { pending.resolve([main, token]); await finished; });
    expect(options.importDeckData).not.toHaveBeenCalled();
  });

  it('keeps the newest selection when an older request later fails', async () => {
    const old = deferredCards(); const newer = deferredCards(); const options = args();
    options.resolveSavedDeckCards = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(newer.promise);
    const { result, selected } = await open(options);
    let first!: Promise<void>; let second!: Promise<void>;
    act(() => { first = result.current.handleSavedDeckImport(selected); });
    act(() => { second = result.current.handleSavedDeckImport(selected); });
    await act(async () => { newer.resolve([main, token]); await second; });
    await act(async () => { old.reject(new Error('Old failure')); await first; });
    expect(options.importDeckData).toHaveBeenCalledTimes(1);
    expect(result.current.savedDeckLoadFailed).toBe(false);
  });

  it('reports a commit failure even after the real setup action consumes its guard', async () => {
    const options = args();
    const { result } = renderHook(() => {
      const setup = useGameBoardSetupActions({ canInteract: true, gameState: options.gameState, role: options.role,
        uuid: () => 'test-id', dispatchGameEvent: () => { throw new Error('Dispatch failed'); }, setShowResetConfirm: vi.fn(), t: options.t });
      return useGameBoardSavedDeckPicker({ ...options, beginDeckImport: setup.beginDeckImport, importDeckData: setup.importDeckData });
    });
    act(() => result.current.openSavedDeckPicker('host'));
    await act(async () => { await result.current.handleSavedDeckImport(result.current.filteredSavedDeckOptions[0]); });
    expect(result.current.savedDeckLoadFailed).toBe(true);
    expect(result.current.savedDeckImportTargetRole).toBe('host');
    expect(result.current.isSavedDeckLoading).toBe(false);
  });

  it.each(['reset', 'direct import'] as const)('uses the real setup guard to ignore completion after %s', async action => {
    const pending = deferredCards(); const options = args(); options.resolveSavedDeckCards = () => pending.promise;
    const { result } = renderHook(() => {
      const setup = useGameBoardSetupActions({ canInteract: true, gameState: options.gameState, role: options.role,
        uuid: () => 'test-id', dispatchGameEvent: vi.fn(), setShowResetConfirm: vi.fn(), t: options.t });
      const picker = useGameBoardSavedDeckPicker({ ...options, beginDeckImport: setup.beginDeckImport });
      return { setup, picker };
    });
    act(() => result.current.picker.openSavedDeckPicker('host'));
    let finished!: Promise<void>;
    act(() => { finished = result.current.picker.handleSavedDeckImport(result.current.picker.filteredSavedDeckOptions[0]); });
    act(() => { if (action === 'reset') result.current.setup.confirmResetGame(); else result.current.setup.importDeckData({ mainDeck: [] }, 'host'); });
    await act(async () => { pending.resolve([main, token]); await finished; });
    expect(options.importDeckData).not.toHaveBeenCalled();
  });
});
