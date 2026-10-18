import { describe, expect, it } from 'vitest';
import { mergeCardCatalogs } from './cardCatalog';

describe('cardCatalog merge compatibility', () => {
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
