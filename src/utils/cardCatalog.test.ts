import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCardCatalog, mergeCardCatalogs } from './cardCatalog';

describe('cardCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
