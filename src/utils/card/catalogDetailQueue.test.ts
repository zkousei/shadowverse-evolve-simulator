import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCatalogDetailQueue } from './catalogDetailQueue';
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
afterEach(() => vi.useRealTimers());

describe('catalog detail request queue', () => {
  it('shares a four-job limit across calls and starts waiting jobs in arrival order', async () => {
    const queue = createCatalogDetailQueue();
    const jobs = Array.from({ length: 7 }, () => deferred<number>());
    const started: number[] = [];
    const promises = jobs.map((job, i) => queue(async () => { started.push(i); return job.promise; }));
    expect(started).toEqual([0, 1, 2, 3]);
    jobs[2].resolve(2);
    await promises[2];
    await vi.waitFor(() => expect(started).toEqual([0, 1, 2, 3, 4]));
    jobs[1].resolve(1);
    await promises[1];
    await vi.waitFor(() => expect(started).toEqual([0, 1, 2, 3, 4, 5]));
    jobs.forEach((job, i) => job.resolve(i));
    expect(await Promise.all(promises)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('releases slots on synchronous throws and asynchronous rejection without blocking later jobs', async () => {
    const queue = createCatalogDetailQueue();
    const fail = new Error('unavailable');
    const jobs = Array.from({ length: 5 }, () => deferred<number>());
    const first = queue<number>(() => { throw fail; });
    const rest = jobs.map(job => queue(() => job.promise));
    const settled = Promise.allSettled([first, ...rest]);
    jobs[0].reject(fail);
    jobs.slice(1).forEach((job, i) => job.resolve(i + 1));
    expect((await settled).map(result => result.status)).toEqual(['rejected', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
    expect(await queue(async () => 'retry')).toBe('retry');
  });

  it('starts the deadline only when a job runs, aborts timed-out work and ignores its late completion', async () => {
    vi.useFakeTimers();
    const queue = createCatalogDetailQueue();
    const jobs = Array.from({ length: 5 }, () => deferred<number>());
    const signals: AbortSignal[] = [];
    const promises = jobs.map(job => queue(signal => { signals.push(signal); return job.promise; }));
    const settled = Promise.allSettled(promises);
    expect(signals).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(29_000);
    jobs[0].resolve(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(signals).toHaveLength(5);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(signals.map(signal => signal.aborted)).toEqual([false, true, true, true, false]);
    jobs[4].resolve(4);
    const results = await settled;
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected', 'rejected', 'rejected', 'fulfilled']);
    for (const result of results.slice(1, 4)) if (result.status === 'rejected') expect(result.reason.message).toMatch(/timed out/);
    jobs.slice(1, 4).forEach(job => job.resolve(99));
    expect(await queue(async () => 5)).toBe(5);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not hold a completed job slot or its timeout while a caller handles the result', async () => {
    vi.useFakeTimers();
    const queue = createCatalogDetailQueue();
    expect(await queue(async () => 1)).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
