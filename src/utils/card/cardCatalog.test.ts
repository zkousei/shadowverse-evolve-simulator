import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { loadCardCatalog, mergeCardCatalogs } from './cardCatalog';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('cardCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shares fetching, parsing, and the merged catalog between concurrent callers', async () => {
    const response = deferred<{ json: () => Promise<DeckBuilderCardData[]> }>();
    const json = vi.fn().mockResolvedValue([
      { id: 'BP01-001', name: 'Released Card', image: '/released.png' },
    ]);
    const fetchMock = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal('fetch', fetchMock);

    const first = loadCardCatalog();
    const second = loadCardCatalog();
    response.resolve({ json });
    const [firstCatalog, secondCatalog] = await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(json).toHaveBeenCalledTimes(2);
    expect(firstCatalog).toBe(secondCatalog);
    expect(firstCatalog).toEqual([
      { id: 'BP01-001', name: 'Released Card', image: '/released.png', catalog_status: 'released' },
    ]);
  });

  it('continues sharing while a catalog response is still being parsed', async () => {
    const parsed = deferred<DeckBuilderCardData[]>();
    const parsingStarted = deferred<void>();
    const releasedJson = vi.fn(() => {
      parsingStarted.resolve();
      return parsed.promise;
    });
    const previewJson = vi.fn().mockResolvedValue([]);
    const fetchMock = vi.fn((path: string) => Promise.resolve({
      json: path === '/cards_detailed.json' ? releasedJson : previewJson,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const first = loadCardCatalog();
    await parsingStarted.promise;
    const second = loadCardCatalog();
    parsed.resolve([{ id: 'BP01-001', name: 'Released Card', image: '' }]);
    const [firstCatalog, secondCatalog] = await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(releasedJson).toHaveBeenCalledTimes(1);
    expect(previewJson).toHaveBeenCalledTimes(1);
    expect(firstCatalog).toBe(secondCatalog);
  });

  it('fetches fresh data after a successful load instead of caching the completed catalog', async () => {
    let name = 'Original';
    const fetchMock = vi.fn((path: string) => Promise.resolve({
      json: vi.fn().mockResolvedValue(path === '/cards_detailed.json'
        ? [{ id: 'BP01-001', name, image: '' }]
        : []),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const firstCatalog = await loadCardCatalog();
    name = 'Updated';
    const secondCatalog = await loadCardCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(firstCatalog[0].name).toBe('Original');
    expect(secondCatalog[0].name).toBe('Updated');
  });

  it.each([
    ['released fetch', '/cards_detailed.json', 'fetch'],
    ['preview fetch', '/cards_preview.json', 'fetch'],
    ['released JSON', '/cards_detailed.json', 'json'],
    ['preview JSON', '/cards_preview.json', 'json'],
  ])('rejects all concurrent callers on %s failure and allows a later retry', async (_label, failingPath, stage) => {
    const error = new Error('Catalog unavailable');
    let shouldFail = true;
    const fetchMock = vi.fn(async (path: string) => {
      if (shouldFail && path === failingPath && stage === 'fetch') throw error;
      return {
        json: async () => {
          if (shouldFail && path === failingPath && stage === 'json') throw error;
          return [{ id: path, name: path, image: '' }];
        },
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.allSettled([loadCardCatalog(), loadCardCatalog()]);
    expect(results).toEqual([
      { status: 'rejected', reason: error },
      { status: 'rejected', reason: error },
    ]);

    shouldFail = false;
    await expect(loadCardCatalog()).resolves.toEqual([
      { id: '/cards_detailed.json', name: '/cards_detailed.json', image: '', catalog_status: 'released' },
      { id: '/cards_preview.json', name: '/cards_preview.json', image: '', catalog_status: 'preview' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('loads the released and preview card catalogs from public json files', async () => {
    const releasedJson = vi.fn().mockResolvedValue([{ id: 'BP01-001', name: 'Released Card', image: '/released.png' }]);
    const previewJson = vi.fn().mockResolvedValue([{ id: 'PV01-001', name: 'Preview Card', image: '' }]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: releasedJson })
      .mockResolvedValueOnce({ json: previewJson });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadCardCatalog()).resolves.toEqual([
      { id: 'BP01-001', name: 'Released Card', image: '/released.png', catalog_status: 'released' },
      { id: 'PV01-001', name: 'Preview Card', image: '', catalog_status: 'preview' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/cards_detailed.json');
    expect(fetchMock).toHaveBeenCalledWith('/cards_preview.json');
    expect(releasedJson).toHaveBeenCalledTimes(1);
    expect(previewJson).toHaveBeenCalledTimes(1);
  });

  it('keeps released cards when preview cards share the same id', () => {
    expect(mergeCardCatalogs(
      [{ id: 'BP01-001', name: 'Released Card', image: '/released.png' }],
      [
        { id: 'BP01-001', name: 'Preview Card', image: '' },
        { id: 'PV01-001', name: 'Preview Only', image: '' },
      ],
    )).toEqual([
      { id: 'BP01-001', name: 'Released Card', image: '/released.png', catalog_status: 'released' },
      { id: 'PV01-001', name: 'Preview Only', image: '', catalog_status: 'preview' },
    ]);
  });
});
