import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useDeckBuilderCatalogAction } from './useDeckBuilderCatalogAction';
const deferred = () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(yes => { resolve = yes; });
  return { promise, resolve };
};

test('applies only a complete result and prevents a second replacement while loading', async () => {
  const pending = deferred();
  const apply = vi.fn();
  const next = vi.fn();
  const { result } = renderHook(() => useDeckBuilderCatalogAction());
  act(() => {
    expect(result.current.run(() => pending.promise, apply)).toBe(true);
    expect(result.current.run(next, apply)).toBe(false);
  });
  expect(result.current.pending).toBe(true);
  expect(apply).not.toHaveBeenCalled();
  await act(async () => pending.resolve('complete'));
  expect(apply).toHaveBeenCalledExactlyOnceWith('complete');
  expect(next).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(false);
});

test('failure preserves the previous deck and does not automatically retry', async () => {
  const apply = vi.fn();
  const error = new Error('404');
  const load = vi.fn().mockRejectedValue(error);
  const { result } = renderHook(() => useDeckBuilderCatalogAction());
  act(() => { result.current.run(load, apply); });
  await waitFor(() => expect(result.current.failure).toEqual({ error }));
  expect(apply).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalledTimes(1);
  expect(result.current.pending).toBe(false);
});

test('cancelling an old import prevents its completion from changing the deck or ending a newer operation', async () => {
  const old = deferred();
  const next = deferred();
  const apply = vi.fn();
  const { result } = renderHook(() => useDeckBuilderCatalogAction());
  act(() => { result.current.run(() => old.promise, apply); });
  act(() => result.current.cancel());
  act(() => { result.current.run(() => next.promise, apply); });
  await act(async () => old.resolve('old'));
  expect(apply).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(true);
  await act(async () => next.resolve('new'));
  expect(apply).toHaveBeenCalledExactlyOnceWith('new');
});

test('unmounting prevents pending results from applying', async () => {
  const pending = deferred();
  const apply = vi.fn();
  const { result, unmount } = renderHook(() => useDeckBuilderCatalogAction());
  act(() => { result.current.run(() => pending.promise, apply); });
  unmount();
  await act(async () => pending.resolve('late'));
  expect(apply).not.toHaveBeenCalled();
});


test('a cancelled failure does not report an old error or invoke an old alert callback', async () => {
  let reject!: (error: unknown) => void;
  const pending = new Promise<string>((_, no) => { reject = no; });
  const onError = vi.fn();
  const { result } = renderHook(() => useDeckBuilderCatalogAction());
  act(() => { result.current.run(() => pending, vi.fn(), onError); });
  act(() => result.current.cancel());
  await act(async () => reject(new Error('Obsolete failure')));
  expect(onError).not.toHaveBeenCalled();
  expect(result.current.failure).toBeNull();
});
