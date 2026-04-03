import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCardCatalog } from './cardCatalog';

describe('cardCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the detailed card catalog from the public json file', async () => {
    const json = vi.fn().mockResolvedValue([{ id: 'BP01-001', name: 'Test Card' }]);
    const fetchMock = vi.fn().mockResolvedValue({ json });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadCardCatalog()).resolves.toEqual([{ id: 'BP01-001', name: 'Test Card' }]);
    expect(fetchMock).toHaveBeenCalledWith('/cards_detailed.json');
    expect(json).toHaveBeenCalledTimes(1);
  });
});
