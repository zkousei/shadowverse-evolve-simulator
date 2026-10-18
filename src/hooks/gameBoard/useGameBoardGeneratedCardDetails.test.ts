import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../../utils/card/generatedCardCatalog';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import { useGameBoardGeneratedCardDetails } from './useGameBoardGeneratedCardDetails';

const a: DeckBuilderCardData = { id: 'A-001', name: 'A', image: '/a.png', ability_text: 'Full A' };
const b: DeckBuilderCardData = { id: 'B-001', name: 'B', image: '/b.png', ability_text: 'Full B',
  faces: [{ side: 'back', name: 'Back B', ability_text: 'Back ability' }] };
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const ready = async (result: { current: { status: string } }) => {
  await waitFor(() => expect(result.current.status).toBe('ready'));
};

describe('useGameBoardGeneratedCardDetails', () => {
  it('stays idle without a catalog or IDs and never fetches unrequested details', async () => {
    const source = generatedCatalogFixture([a, b]);
    const load = vi.spyOn(source, 'loadCards');
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const { result, rerender } = renderHook(({ catalog, ids }) => useGameBoardGeneratedCardDetails(catalog, ids), {
      initialProps: { catalog: null as GeneratedCardCatalog | null, ids: [a.id] },
    });
    expect(result.current).toMatchObject({ status: 'idle', version: null, knownCards: [], detailLookup: {} });
    rerender({ catalog: source, ids: [] });
    expect(result.current.status).toBe('idle');
    expect(load).not.toHaveBeenCalled();
    rerender({ catalog: source, ids: [b.id] });
    await ready(result);
    expect(load).toHaveBeenCalledExactlyOnceWith([b.id]);
    expect(related).not.toHaveBeenCalled();
    expect(result.current.knownCards).toEqual([b]);
    expect(result.current.detailLookup[b.id].faces?.[0].abilityText).toBe('Back ability');
  });

  it('reports unknown IDs without treating them as failed HTTP requests or placeholder details', async () => {
    const source = generatedCatalogFixture([a]);
    const load = vi.spyOn(source, 'loadCards');
    const { result } = renderHook(() => useGameBoardGeneratedCardDetails(source, ['EXTERNAL']));
    await ready(result);
    expect(result.current).toMatchObject({ status: 'ready', unknownIds: ['EXTERNAL'], detailLookup: {}, knownCards: [] });
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps verified details during a later failure and retries only the current selection in the same catalog', async () => {
    const source = generatedCatalogFixture([a, b]);
    const read = source.loadCards;
    const load = vi.spyOn(source, 'loadCards');
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCardDetails(source, ids), {
      initialProps: { ids: [a.id] },
    });
    await ready(result);
    const failure = deferred<readonly GeneratedCardDetails[]>();
    load.mockReturnValueOnce(failure.promise);
    rerender({ ids: [b.id] });
    expect(result.current.status).toBe('loading');
    expect(result.current.detailLookup[a.id].abilityText).toBe('Full A');
    await act(async () => failure.reject(new Error('404')));
    expect(result.current.status).toBe('error');
    expect(result.current.knownCards).toEqual([a]);
    load.mockImplementationOnce(read);
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await ready(result);
    expect(result.current.knownCards).toEqual([a, b]);
    expect(load.mock.calls.map(([ids]) => ids)).toEqual([[a.id], [b.id], [b.id]]);
  });

  it('merges both successful requests in catalog order when responses arrive in reverse order', async () => {
    const source = generatedCatalogFixture([a, b]);
    const read = source.loadCards;
    const first = deferred<readonly GeneratedCardDetails[]>();
    const second = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCardDetails(source, ids), {
      initialProps: { ids: [a.id] },
    });
    rerender({ ids: [b.id, 'EXTERNAL'] });
    await act(async () => second.resolve(await read([b.id])));
    expect(result.current).toMatchObject({ status: 'ready', unknownIds: ['EXTERNAL'] });
    await act(async () => first.resolve(await read([a.id])));
    expect(result.current).toMatchObject({ status: 'ready', unknownIds: ['EXTERNAL'] });
    expect(result.current.knownCards).toEqual([a, b]);
    expect(Object.keys(result.current.detailLookup)).toEqual([a.id, b.id]);
  });

  it('ignores an old request failure after a newer request succeeds', async () => {
    const source = generatedCatalogFixture([a, b]);
    const old = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCardDetails(source, ids), {
      initialProps: { ids: [a.id] },
    });
    rerender({ ids: [b.id] });
    await ready(result);
    await act(async () => old.reject(new Error('Old failure')));
    expect(result.current.status).toBe('ready');
    expect(result.current.knownCards).toEqual([b]);
  });

  it('does not mark a new A request ready when the first A completes after A -> B -> A', async () => {
    const source = generatedCatalogFixture([a, b]);
    const read = source.loadCards;
    const oldA = deferred<readonly GeneratedCardDetails[]>();
    const newA = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(oldA.promise)
      .mockImplementationOnce(read).mockReturnValueOnce(newA.promise);
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCardDetails(source, ids), {
      initialProps: { ids: [a.id] },
    });
    rerender({ ids: [b.id] });
    await ready(result);
    rerender({ ids: [a.id] });
    expect(result.current.status).toBe('loading');
    await act(async () => oldA.resolve(await read([a.id])));
    expect(result.current.status).toBe('loading');
    expect(result.current.knownCards).toEqual([a, b]);
    await act(async () => newA.resolve(await read([a.id])));
    expect(result.current.status).toBe('ready');
  });

  it.each(['old', 'new'])('hides a replaced catalog immediately, even when the earlier version is %s', async oldVersion => {
    const oldSource = { ...generatedCatalogFixture([a]), version: oldVersion };
    const newSource = { ...generatedCatalogFixture([{ ...a, ability_text: 'New A' }]), version: 'new' };
    const old = deferred<readonly GeneratedCardDetails[]>();
    const read = oldSource.loadCards;
    vi.spyOn(oldSource, 'loadCards').mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(({ source }) => useGameBoardGeneratedCardDetails(source, [a.id]), {
      initialProps: { source: oldSource },
    });
    rerender({ source: newSource });
    expect(result.current.detailLookup).toEqual({});
    await ready(result);
    await act(async () => old.resolve(await read([a.id])));
    expect(result.current.version).toBe('new');
    expect(result.current.detailLookup[a.id].abilityText).toBe('New A');
  });

  it('clears exposed details when the catalog is removed, without changing the old request', async () => {
    const source = generatedCatalogFixture([a]);
    const read = source.loadCards;
    const { result, rerender } = renderHook(({ catalog }) => useGameBoardGeneratedCardDetails(catalog, [a.id]), {
      initialProps: { catalog: source as GeneratedCardCatalog | null },
    });
    await ready(result);
    rerender({ catalog: null });
    expect(result.current).toMatchObject({ status: 'idle', version: null, knownCards: [], detailLookup: {} });
    const pending = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(pending.promise);
    rerender({ catalog: source });
    expect(result.current).toMatchObject({ status: 'loading', knownCards: [], detailLookup: {} });
    await act(async () => pending.resolve(await read([a.id])));
    await ready(result);
  });

  it('keeps verified same-version presentation data when a reset leaves no requested cards', async () => {
    const source = generatedCatalogFixture([a]);
    const load = vi.spyOn(source, 'loadCards');
    const { result, rerender } = renderHook(({ ids }) => useGameBoardGeneratedCardDetails(source, ids), {
      initialProps: { ids: [a.id] },
    });
    await ready(result);
    rerender({ ids: [] });
    expect(result.current.status).toBe('idle');
    expect(result.current.knownCards).toEqual([a]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not repeat requests for equal arrays, and uses a snapshot of mutable caller IDs', async () => {
    const source = generatedCatalogFixture([a, b]);
    const read = source.loadCards;
    const load = vi.spyOn(source, 'loadCards');
    const pending = deferred<readonly GeneratedCardDetails[]>();
    load.mockReturnValueOnce(pending.promise);
    const ids = [a.id];
    const { result, rerender } = renderHook(({ selected }) => useGameBoardGeneratedCardDetails(source, selected), {
      initialProps: { selected: ids },
    });
    ids[0] = b.id;
    rerender({ selected: [a.id] });
    expect(load).toHaveBeenCalledExactlyOnceWith([a.id]);
    await act(async () => pending.resolve(await read([a.id])));
    await ready(result);
    expect(result.current.knownCards).toEqual([a]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignores a late unmounted result and does not share accumulated details with another instance', async () => {
    const source = generatedCatalogFixture([a, b]);
    const read = source.loadCards;
    const old = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(old.promise);
    const first = renderHook(() => useGameBoardGeneratedCardDetails(source, [a.id]));
    first.unmount();
    const second = renderHook(() => useGameBoardGeneratedCardDetails(source, [b.id]));
    await ready(second.result);
    await act(async () => old.resolve(await read([a.id])));
    expect(second.result.current.knownCards).toEqual([b]);
  });

  it('keeps the active Strict Mode lifetime ready when an earlier mount request fails', async () => {
    const source = generatedCatalogFixture([a]);
    const old = deferred<readonly GeneratedCardDetails[]>();
    const load = vi.spyOn(source, 'loadCards').mockReturnValueOnce(old.promise);
    const { result } = renderHook(() => useGameBoardGeneratedCardDetails(source, [a.id]), {
      reactStrictMode: true,
    });
    await ready(result);
    await act(async () => old.reject(new Error('Discarded mount')));
    expect(result.current.status).toBe('ready');
    expect(result.current.knownCards).toEqual([a]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
