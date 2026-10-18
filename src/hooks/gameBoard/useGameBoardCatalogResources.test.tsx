import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { loadCardCatalog } from '../../utils/card/cardCatalog';
import { useGameBoardCatalogResources } from './useGameBoardCatalogResources';

vi.mock('../../utils/card/cardCatalog', () => ({ loadCardCatalog: vi.fn() }));
const card: DeckBuilderCardData = { id: 'TEST-1', name: 'Test', image: '/test.png', atk: '3', hp: '4', ability_text: 'Full ability', deck_section: 'main', card_kind_normalized: 'follower' };
const deferred = () => {
  let resolve!: (cards: DeckBuilderCardData[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<DeckBuilderCardData[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadCardCatalog).mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

describe('useGameBoardCatalogResources', () => {
  it('publishes complete catalog, details and rules together after loading', async () => {
    const pending = deferred();
    vi.mocked(loadCardCatalog).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useGameBoardCatalogResources());
    expect(result.current.catalogStatus).toBe('loading');
    expect(result.current.catalogCards).toEqual([]);
    await act(async () => pending.resolve([card]));
    expect(result.current.catalogStatus).toBe('ready');
    expect(result.current.catalogCards).toEqual([card]);
    expect(result.current.cardDetailLookup[card.id].abilityText).toBe('Full ability');
    expect(result.current.cardCatalogByIdRef.current[card.id]).toEqual(card);
    expect(result.current.cardStatLookup[card.id]).toBeDefined();
  });

  it('retries an initial failure explicitly and coalesces repeated retry clicks', async () => {
    const pending = deferred();
    vi.mocked(loadCardCatalog).mockRejectedValueOnce(new Error('Offline')).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useGameBoardCatalogResources());
    await waitFor(() => expect(result.current.catalogStatus).toBe('error'));
    expect(result.current.catalogCards).toEqual([]);
    act(() => { result.current.retryCatalog(); result.current.retryCatalog(); });
    expect(result.current.catalogStatus).toBe('loading');
    expect(loadCardCatalog).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve([card]));
    expect(result.current.catalogStatus).toBe('ready');
    expect(result.current.catalogCards).toEqual([card]);
    expect(result.current.cardDetailLookupRef.current[card.id].abilityText).toBe('Full ability');
  });

  it('does not refetch automatically after failure and allows retrying another failure', async () => {
    vi.mocked(loadCardCatalog).mockRejectedValue(new Error('Offline'));
    const { result, rerender } = renderHook(() => useGameBoardCatalogResources());
    await waitFor(() => expect(result.current.catalogStatus).toBe('error'));
    rerender();
    expect(loadCardCatalog).toHaveBeenCalledTimes(1);
    act(() => result.current.retryCatalog());
    await waitFor(() => expect(result.current.catalogStatus).toBe('error'));
    expect(loadCardCatalog).toHaveBeenCalledTimes(2);
    vi.mocked(loadCardCatalog).mockResolvedValue([card]);
    act(() => result.current.retryCatalog());
    await waitFor(() => expect(result.current.catalogStatus).toBe('ready'));
  });

  it('ignores retry while loading or ready, preserving the installed resources', async () => {
    const pending = deferred();
    vi.mocked(loadCardCatalog).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useGameBoardCatalogResources());
    act(() => result.current.retryCatalog());
    await act(async () => pending.resolve([card]));
    const details = result.current.cardDetailLookup;
    act(() => result.current.retryCatalog());
    expect(loadCardCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.cardDetailLookup).toBe(details);
  });

  it('ignores late results after unmount and leaves mutable resource refs cleared', async () => {
    const pending = deferred();
    vi.mocked(loadCardCatalog).mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useGameBoardCatalogResources());
    const resources = result.current;
    unmount();
    await act(async () => pending.resolve([card]));
    expect(resources.cardCatalogByIdRef.current).toEqual({});
    expect(resources.evolveAutoAttachResolverRef.current).toBeNull();
    expect(resources.cardDetailLookupRef.current).toEqual({});
  });

  it('ignores the discarded Strict Mode request when it finishes after the active request', async () => {
    const old = deferred();
    vi.mocked(loadCardCatalog).mockReturnValueOnce(old.promise).mockResolvedValueOnce([card]);
    const { result } = renderHook(() => useGameBoardCatalogResources(), { reactStrictMode: true });
    expect(loadCardCatalog).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.catalogStatus).toBe('ready'));
    await act(async () => old.resolve([{ ...card, ability_text: 'Stale' }]));
    expect(result.current.cardDetailLookup[card.id].abilityText).toBe('Full ability');
  });
});
