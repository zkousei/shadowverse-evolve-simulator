import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../../utils/card/generatedCardCatalog';
import { useDeckBuilderGeneratedCardDetails } from './useDeckBuilderGeneratedCardDetails';

const details = (id: string) => Object.freeze([{ id, name: id, ability_text: 'Full details' }]) as unknown as readonly GeneratedCardDetails[];
const catalog = (): GeneratedCardCatalog => ({ version: 'version-a', index: [],
  loadCards: vi.fn(), loadCardsWithRelated: vi.fn() });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('stays idle without a catalog or requested IDs', () => {
  const value = catalog();
  const { result, rerender } = renderHook(({ source, ids }) => useDeckBuilderGeneratedCardDetails(source, ids), {
    initialProps: { source: null as GeneratedCardCatalog | null, ids: ['BP01-001'] },
  });
  expect(result.current.status).toBe('idle');
  rerender({ source: value, ids: [] });
  expect(result.current.status).toBe('idle');
  expect(value.loadCards).not.toHaveBeenCalled();
  expect(value.loadCardsWithRelated).not.toHaveBeenCalled();
});

test('loads only requested full details and preserves caller order and duplicates', async () => {
  const value = catalog();
  const cards = Object.freeze([...details('BP02-001'), ...details('BP01-001'), ...details('BP02-001')]);
  vi.mocked(value.loadCards).mockResolvedValue(cards);
  const ids = ['BP02-001', 'BP01-001', 'BP02-001'];
  const { result } = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ids));
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(value.loadCards).toHaveBeenCalledExactlyOnceWith(ids);
  expect(value.loadCardsWithRelated).not.toHaveBeenCalled();
  if (result.current.status !== 'ready') throw new Error('Expected details');
  expect(result.current.cards).toBe(cards);
  expect(result.current.version).toBe(value.version);
});

test('related cards are loaded only when explicitly requested', async () => {
  const value = catalog();
  vi.mocked(value.loadCardsWithRelated).mockResolvedValue(details('TOKEN-001'));
  const { result } = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ['BP01-001'], true));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(value.loadCardsWithRelated).toHaveBeenCalledExactlyOnceWith(['BP01-001']);
  expect(value.loadCards).not.toHaveBeenCalled();
});

test('equal ID arrays do not refetch and caller mutation cannot change a pending request', async () => {
  const value = catalog();
  const pending = deferred<readonly GeneratedCardDetails[]>();
  vi.mocked(value.loadCards).mockReturnValue(pending.promise);
  const ids = ['BP01-001'];
  const { result, rerender } = renderHook(({ requested }) => useDeckBuilderGeneratedCardDetails(value, requested), {
    initialProps: { requested: ids },
  });
  await waitFor(() => expect(value.loadCards).toHaveBeenCalledTimes(1));
  ids.push('BP02-001');
  expect(vi.mocked(value.loadCards).mock.calls[0][0]).toEqual(['BP01-001']);
  rerender({ requested: ['BP01-001'] });
  expect(value.loadCards).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(details('BP01-001')));
  expect(result.current.status).toBe('ready');
});

test.each(['resolve', 'reject'] as const)('a late old %s cannot replace the latest selection', async outcome => {
  const value = catalog();
  const old = deferred<readonly GeneratedCardDetails[]>();
  vi.mocked(value.loadCards).mockReturnValueOnce(old.promise).mockResolvedValueOnce(details('BP02-001'));
  const { result, rerender } = renderHook(({ ids }) => useDeckBuilderGeneratedCardDetails(value, ids), {
    initialProps: { ids: ['BP01-001'] },
  });
  await waitFor(() => expect(value.loadCards).toHaveBeenCalledTimes(1));
  rerender({ ids: ['BP02-001'] });
  await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', cards: [{ id: 'BP02-001' }] }));
  await act(async () => {
    if (outcome === 'resolve') old.resolve(details('BP01-001'));
    else old.reject(new Error('Old failure'));
  });
  expect(result.current).toMatchObject({ status: 'ready', cards: [{ id: 'BP02-001' }] });
});

test('a new selection never renders the previous cards, including before its effect runs', async () => {
  const value = catalog();
  vi.mocked(value.loadCards).mockResolvedValueOnce(details('BP01-001')).mockReturnValueOnce(new Promise(() => {}));
  const views: string[] = [];
  const { result, rerender } = renderHook(({ ids }) => {
    const state = useDeckBuilderGeneratedCardDetails(value, ids);
    views.push(state.status);
    return state;
  }, { initialProps: { ids: ['BP01-001'] } });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  views.length = 0;
  rerender({ ids: ['BP02-001'] });
  expect(views.length).toBeGreaterThan(0);
  expect(views.every(status => status === 'loading')).toBe(true);
  expect('cards' in result.current).toBe(false);
});

test('a failed selection exposes no partial cards and retries on the same catalog only after an explicit request', async () => {
  const value = catalog();
  const error = new Error('Card catalog request failed (404)');
  vi.mocked(value.loadCards).mockRejectedValueOnce(error).mockResolvedValueOnce(details('BP01-001'));
  const { result } = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ['BP01-001']));
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current).toMatchObject({ status: 'error', error });
  expect('cards' in result.current).toBe(false);
  expect(value.loadCards).toHaveBeenCalledTimes(1);
  act(() => result.current.retry());
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(value.loadCards).toHaveBeenCalledTimes(2);
});

test.each(['clear', 'disconnect'] as const)('%s invalidates a pending selection without restoring it on completion', async action => {
  const value = catalog();
  const old = deferred<readonly GeneratedCardDetails[]>();
  vi.mocked(value.loadCards).mockReturnValue(old.promise);
  const { result, rerender } = renderHook(({ source, ids }) => useDeckBuilderGeneratedCardDetails(source, ids), {
    initialProps: { source: value as GeneratedCardCatalog | null, ids: ['BP01-001'] },
  });
  await waitFor(() => expect(value.loadCards).toHaveBeenCalledTimes(1));
  rerender({ source: action === 'disconnect' ? null : value, ids: action === 'clear' ? [] : ['BP01-001'] });
  expect(result.current.status).toBe('idle');
  await act(async () => old.resolve(details('BP01-001')));
  expect(result.current.status).toBe('idle');
});

test('switching catalog instances invalidates details even for the same IDs', async () => {
  const first = catalog();
  const next = { ...catalog(), version: 'version-b' };
  vi.mocked(first.loadCards).mockResolvedValue(details('old'));
  vi.mocked(next.loadCards).mockResolvedValue(details('new'));
  const { result, rerender } = renderHook(({ source }) => useDeckBuilderGeneratedCardDetails(source, ['BP01-001']), {
    initialProps: { source: first },
  });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  rerender({ source: next });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', version: 'version-b', cards: [{ id: 'new' }] }));
});

test('changing the related-card option invalidates the result and uses the requested loader', async () => {
  const value = catalog();
  vi.mocked(value.loadCards).mockResolvedValue(details('original'));
  vi.mocked(value.loadCardsWithRelated).mockResolvedValue(details('related'));
  const { result, rerender } = renderHook(({ related }) => useDeckBuilderGeneratedCardDetails(value, ['BP01-001'], related), {
    initialProps: { related: false },
  });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  rerender({ related: true });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', cards: [{ id: 'related' }] }));
});

test('synchronous loader errors are exposed through the same error state', async () => {
  const value = catalog();
  const error = new Error('Synchronous failure');
  vi.mocked(value.loadCards).mockImplementation(() => { throw error; });
  const { result } = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ['BP01-001']));
  await waitFor(() => expect(result.current).toMatchObject({ status: 'error', error }));
});

test('independent consumers do not cancel each other', async () => {
  const value = catalog();
  const first = deferred<readonly GeneratedCardDetails[]>();
  vi.mocked(value.loadCards).mockImplementation(ids => ids[0] === 'BP01-001' ? first.promise : Promise.resolve(details(ids[0])));
  const a = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ['BP01-001']));
  const b = renderHook(({ ids }) => useDeckBuilderGeneratedCardDetails(value, ids), { initialProps: { ids: ['BP02-001'] } });
  await waitFor(() => expect(b.result.current.status).toBe('ready'));
  b.rerender({ ids: ['BP03-001'] });
  await waitFor(() => expect(b.result.current).toMatchObject({ status: 'ready', cards: [{ id: 'BP03-001' }] }));
  await act(async () => first.resolve(details('BP01-001')));
  expect(a.result.current).toMatchObject({ status: 'ready', cards: [{ id: 'BP01-001' }] });
});


test('clearing and reselecting an ID does not revive a previous error while retrying', async () => {
  const value = catalog();
  vi.mocked(value.loadCards).mockRejectedValueOnce(new Error('First failure')).mockReturnValueOnce(new Promise(() => {}));
  const { result, rerender } = renderHook(({ ids }) => useDeckBuilderGeneratedCardDetails(value, ids), { initialProps: { ids: ['BP01-001'] } });
  await waitFor(() => expect(result.current.status).toBe('error'));
  rerender({ ids: [] });
  expect(result.current.status).toBe('idle');
  rerender({ ids: ['BP01-001'] });
  expect(result.current.status).toBe('loading');
  expect('error' in result.current).toBe(false);
});


test('Strict Mode cleanup ignores an obsolete detail response', async () => {
  const value = catalog();
  const first = deferred<readonly GeneratedCardDetails[]>();
  vi.mocked(value.loadCards).mockReturnValueOnce(first.promise).mockResolvedValueOnce(details('active'));
  const { result } = renderHook(() => useDeckBuilderGeneratedCardDetails(value, ['BP01-001']), { reactStrictMode: true });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => first.resolve(details('obsolete')));
  expect(result.current).toMatchObject({ status: 'ready', cards: [{ id: 'active' }] });
});
