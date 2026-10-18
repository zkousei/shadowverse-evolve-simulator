import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { openGeneratedCardCatalog, type GeneratedCardDetails } from '../../utils/card/generatedCardCatalog';
import { useGameBoardGeneratedCatalogResources } from './useGameBoardGeneratedCatalogResources';

vi.mock('../../utils/card/generatedCardCatalog', async original => ({
  ...await original<typeof import('../../utils/card/generatedCardCatalog')>(), openGeneratedCardCatalog: vi.fn(),
}));
const a: DeckBuilderCardData = { id: 'A-001', name: 'A', image: '/a.png', atk: '2', hp: '3', ability_text: 'Old A', deck_section: 'main', card_kind_normalized: 'follower' };
const b: DeckBuilderCardData = { ...a, id: 'B-001', name: 'B', ability_text: 'Old B' };
const catalog = (version: string, cards = [a, b]) => ({ ...generatedCatalogFixture(cards), version });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const ready = async (result: { current: { status: string; details: { status: string } } }) => {
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await waitFor(() => expect(result.current.details.status).toBe('ready'));
};
beforeEach(() => vi.resetAllMocks());

describe('useGameBoardGeneratedCatalogResources', () => {
  it('opens one source and builds rule metadata, saved-deck reader and requested details from that source', async () => {
    const source = catalog('old');
    const read = vi.spyOn(source, 'loadCards');
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValue(source);
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    act(() => { result.current.refreshCatalog(); result.current.refreshCatalog(); });
    await ready(result);
    expect(openGeneratedCardCatalog).toHaveBeenCalledExactlyOnceWith('/card-catalog');
    expect(result.current.resources?.catalog).toBe(source);
    expect(result.current.resources?.savedDeckCatalog.summaries).toBe(source.index);
    expect(result.current.resources?.savedDeckCatalog.version).toBe('old');
    expect(result.current.resources?.metadata.statLookup[a.id]).toMatchObject({ atk: 2, hp: 3 });
    expect(read).toHaveBeenCalledExactlyOnceWith([a.id]);
    expect(related).not.toHaveBeenCalled();
    expect(result.current.details.detailLookup[a.id].abilityText).toBe('Old A');
  });

  it('keeps an initial open failure explicit and ignores repeated refresh clicks until it settles', async () => {
    const next = deferred<ReturnType<typeof catalog>>();
    vi.mocked(openGeneratedCardCatalog).mockRejectedValueOnce(new Error('Offline')).mockReturnValueOnce(next.promise);
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.resources).toBeNull();
    expect(openGeneratedCardCatalog).toHaveBeenCalledTimes(1);
    act(() => { result.current.refreshCatalog(); result.current.refreshCatalog(); });
    expect(result.current.status).toBe('loading');
    expect(openGeneratedCardCatalog).toHaveBeenCalledTimes(2);
    act(() => result.current.refreshCatalog());
    expect(openGeneratedCardCatalog).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve(catalog('recovered')));
    await ready(result);
  });

  it('retries a failed detail request in the same source without reopening the manifest', async () => {
    const source = catalog('old');
    vi.spyOn(source, 'loadCards').mockRejectedValueOnce(new Error('404'));
    vi.mocked(openGeneratedCardCatalog).mockResolvedValue(source);
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    await waitFor(() => expect(result.current.details.status).toBe('error'));
    expect(result.current.status).toBe('ready');
    act(() => result.current.details.retry());
    await ready(result);
    expect(openGeneratedCardCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.resources?.catalog).toBe(source);
  });

  it('keeps the previous source and details during a failed refresh, then installs a fully verified replacement together', async () => {
    const old = catalog('old');
    const failed = catalog('candidate');
    const pending = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(failed, 'loadCards').mockReturnValueOnce(pending.promise);
    const next = catalog('new', [{ ...a, atk: '7', ability_text: 'New A' }, b]);
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(old).mockResolvedValueOnce(failed).mockResolvedValueOnce(next);
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    await ready(result);
    const resources = result.current.resources;
    const lookup = result.current.details.detailLookup;
    act(() => result.current.refreshCatalog());
    await waitFor(() => expect(failed.loadCards).toHaveBeenCalled());
    expect(result.current.status).toBe('loading');
    expect(result.current.resources).toBe(resources);
    expect(result.current.details.detailLookup).toBe(lookup);
    await act(async () => pending.reject(new Error('Candidate removed')));
    expect(result.current.status).toBe('error');
    expect(result.current.resources).toBe(resources);
    expect(result.current.details.detailLookup).toBe(lookup);
    expect(result.current.error).toBeInstanceOf(Error);
    act(() => result.current.refreshCatalog());
    await ready(result);
    expect(result.current.resources?.catalog).toBe(next);
    expect(result.current.resources?.savedDeckCatalog.version).toBe('new');
    expect(result.current.resources?.metadata.statLookup[a.id]).toMatchObject({ atk: 7 });
    expect(result.current.details.version).toBe('new');
    expect(result.current.details.detailLookup[a.id].abilityText).toBe('New A');
    expect(result.current.resources).not.toBe(resources);
  });

  it('verifies the latest requested IDs before switching when the board changes during recovery', async () => {
    const old = catalog('old');
    const next = catalog('new', [{ ...a, ability_text: 'New A' }, { ...b, ability_text: 'New B' }]);
    const read = next.loadCards;
    const first = deferred<readonly GeneratedCardDetails[]>();
    const second = deferred<readonly GeneratedCardDetails[]>();
    const load = vi.spyOn(next, 'loadCards').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(old).mockResolvedValueOnce(next);
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCatalogResources(ids), { initialProps: { ids: [a.id] } });
    await ready(result);
    act(() => result.current.refreshCatalog());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ ids: [b.id] });
    await act(async () => first.resolve(await read([a.id])));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(result.current.resources?.catalog).toBe(old);
    expect(load.mock.calls.slice(0, 2)).toEqual([[[a.id]], [[b.id]]]);
    await act(async () => second.resolve(await read([b.id])));
    await ready(result);
    expect(result.current.resources?.catalog).toBe(next);
    expect(result.current.details.detailLookup[b.id].abilityText).toBe('New B');
    expect(result.current.details.knownCards).not.toContainEqual(a);
  });

  it('does not revive an earlier source on A to B to A or publish the abandoned refresh', async () => {
    const first = catalog('first');
    const bOpen = deferred<ReturnType<typeof catalog>>();
    const aOpen = deferred<ReturnType<typeof catalog>>();
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(first).mockReturnValueOnce(bOpen.promise).mockReturnValueOnce(aOpen.promise);
    const { result, rerender } = renderHook(({ path }) => useGameBoardGeneratedCatalogResources([a.id], path), { initialProps: { path: '/a' } });
    await ready(result);
    rerender({ path: '/b' });
    expect(result.current.resources).toBeNull();
    rerender({ path: '/a' });
    expect(result.current.resources).toBeNull();
    await act(async () => bOpen.resolve(catalog('abandoned')));
    expect(result.current.resources).toBeNull();
    await act(async () => aOpen.resolve(catalog('current')));
    await ready(result);
    expect(result.current.resources?.catalog.version).toBe('current');
  });

  it('does not start candidate detail reads after unmount', async () => {
    const nextOpen = deferred<ReturnType<typeof catalog>>();
    const next = catalog('new');
    const load = vi.spyOn(next, 'loadCards');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(catalog('old')).mockReturnValueOnce(nextOpen.promise);
    const { result, unmount } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    await ready(result);
    act(() => result.current.refreshCatalog());
    unmount();
    await act(async () => nextOpen.resolve(next));
    expect(load).not.toHaveBeenCalled();
  });

  it('ignores a discarded Strict Mode opening failure', async () => {
    const old = deferred<ReturnType<typeof catalog>>();
    vi.mocked(openGeneratedCardCatalog).mockReturnValueOnce(old.promise).mockResolvedValueOnce(catalog('current'));
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]), { reactStrictMode: true });
    await ready(result);
    await act(async () => old.reject(new Error('Discarded')));
    expect(result.current.status).toBe('ready');
    expect(result.current.resources?.catalog.version).toBe('current');
    expect(result.current.error).toBeNull();
  });

  it('keeps unknown cards separate and can discover them with an explicit source refresh', async () => {
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(catalog('old', [a])).mockResolvedValueOnce(catalog('new'));
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([b.id]));
    await ready(result);
    expect(result.current.details.getDetailStatus(b.id)).toBe('unknown');
    expect(result.current.details.knownCards).toEqual([]);
    act(() => result.current.refreshCatalog());
    await ready(result);
    expect(result.current.resources?.catalog.version).toBe('new');
    expect(result.current.details.getDetailStatus(b.id)).toBe('ready');
  });

  it('keeps cached details when reopening the manifest fails', async () => {
    const source = catalog('old');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(source).mockRejectedValueOnce(new Error('Offline manifest'));
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([a.id]));
    await ready(result);
    const lookup = result.current.details.detailLookup;
    act(() => result.current.refreshCatalog());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.resources?.catalog).toBe(source);
    expect(result.current.details.detailLookup).toBe(lookup);
    expect(result.current.details.getDetailStatus(a.id)).toBe('ready');
  });

  it('opens metadata but never fetches details with no requested IDs, including an explicit refresh', async () => {
    const first = catalog('old');
    const next = catalog('new');
    const firstRead = vi.spyOn(first, 'loadCards');
    const nextRead = vi.spyOn(next, 'loadCards');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValueOnce(first).mockResolvedValueOnce(next);
    const { result } = renderHook(() => useGameBoardGeneratedCatalogResources([]));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.details.status).toBe('idle');
    act(() => result.current.refreshCatalog());
    await waitFor(() => expect(result.current.resources?.catalog).toBe(next));
    expect(firstRead).not.toHaveBeenCalled();
    expect(nextRead).not.toHaveBeenCalled();
    expect(result.current.details.status).toBe('idle');
  });
});
