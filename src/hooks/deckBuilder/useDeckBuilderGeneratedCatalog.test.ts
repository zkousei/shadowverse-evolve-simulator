import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { openGeneratedCardCatalog, type GeneratedCardCatalog } from '../../utils/card/generatedCardCatalog';
import { useDeckBuilderGeneratedCatalog } from './useDeckBuilderGeneratedCatalog';

vi.mock('../../utils/card/generatedCardCatalog', () => ({ openGeneratedCardCatalog: vi.fn() }));
const open = vi.mocked(openGeneratedCardCatalog);
const catalog = (version = 'version-a'): GeneratedCardCatalog => ({
  version, index: [], loadCards: vi.fn(), loadCardsWithRelated: vi.fn(),
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => vi.resetAllMocks());

test('opens summaries without fetching details', async () => {
  const value = catalog();
  open.mockResolvedValue(value);
  const { result } = renderHook(() => useDeckBuilderGeneratedCatalog());
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current).toMatchObject({ status: 'ready', catalog: value });
  expect(open).toHaveBeenCalledExactlyOnceWith('/card-catalog');
  expect(value.loadCards).not.toHaveBeenCalled();
  expect(value.loadCardsWithRelated).not.toHaveBeenCalled();
});

test('exposes an open failure without an automatic retry and can retry explicitly', async () => {
  const error = new Error('Network failure');
  open.mockRejectedValueOnce(error).mockResolvedValueOnce(catalog());
  const { result } = renderHook(() => useDeckBuilderGeneratedCatalog());
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current).toMatchObject({ status: 'error', error });
  expect(open).toHaveBeenCalledTimes(1);
  act(() => result.current.retry());
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(open).toHaveBeenCalledTimes(2);
});

test('a path change hides the previous catalog immediately and ignores a late old response', async () => {
  const old = deferred<GeneratedCardCatalog>();
  open.mockReturnValueOnce(old.promise).mockResolvedValueOnce(catalog('version-b'));
  const { result, rerender } = renderHook(({ path }) => useDeckBuilderGeneratedCatalog(path), {
    initialProps: { path: '/first' },
  });
  rerender({ path: '/second' });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', catalog: { version: 'version-b' } }));
  await act(async () => old.resolve(catalog('version-a')));
  expect(result.current).toMatchObject({ status: 'ready', catalog: { version: 'version-b' } });
  expect(open.mock.calls.map(([path]) => path)).toEqual(['/first', '/second']);
});

test('retry never exposes a previous successful catalog while reopening', async () => {
  open.mockResolvedValueOnce(catalog());
  const pending = deferred<GeneratedCardCatalog>();
  const views: string[] = [];
  const { result } = renderHook(() => {
    const state = useDeckBuilderGeneratedCatalog();
    views.push(state.status);
    return state;
  });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  open.mockReturnValueOnce(pending.promise);
  views.length = 0;
  act(() => result.current.retry());
  expect(views.length).toBeGreaterThan(0);
  expect(views.every(status => status === 'loading')).toBe(true);
  await act(async () => pending.reject(new Error('Unavailable')));
  expect(result.current.status).toBe('error');
  expect('catalog' in result.current).toBe(false);
});

test('a late error from the superseded request cannot hide a newer successful catalog', async () => {
  const old = deferred<GeneratedCardCatalog>();
  open.mockReturnValueOnce(old.promise).mockResolvedValueOnce(catalog('version-b'));
  const { result } = renderHook(() => useDeckBuilderGeneratedCatalog());
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => old.reject(new Error('Old failure')));
  expect(result.current).toMatchObject({ status: 'ready', catalog: { version: 'version-b' } });
});

test('Strict Mode cleanup prevents the first mount result from replacing the active request', async () => {
  const first = deferred<GeneratedCardCatalog>();
  open.mockReturnValueOnce(first.promise).mockResolvedValueOnce(catalog('active'));
  const { result } = renderHook(() => useDeckBuilderGeneratedCatalog(), { reactStrictMode: true });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => first.resolve(catalog('obsolete')));
  expect(result.current).toMatchObject({ status: 'ready', catalog: { version: 'active' } });
});


test('returning to an earlier path starts a fresh request instead of reviving its previous catalog', async () => {
  const first = catalog('first');
  open.mockResolvedValueOnce(first).mockReturnValueOnce(new Promise(() => {})).mockReturnValueOnce(new Promise(() => {}));
  const { result, rerender } = renderHook(({ path }) => useDeckBuilderGeneratedCatalog(path), { initialProps: { path: '/a' } });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  rerender({ path: '/b' });
  expect(result.current.status).toBe('loading');
  rerender({ path: '/a' });
  expect(result.current.status).toBe('loading');
  expect('catalog' in result.current).toBe(false);
});
