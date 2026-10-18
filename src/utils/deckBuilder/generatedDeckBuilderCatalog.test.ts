import { expect, test, vi } from 'vitest';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../card/generatedCardCatalog';
import { createGeneratedDeckBuilderCatalog, getImportedCatalogIds, getSavedCatalogIds } from './generatedDeckBuilderCatalog';

const full = [{ id: 'BP01-001', name: 'Card', image: '/card.png', ability_text: 'Full ability',
  related_cards: [{ id: 'TK01-001', name: 'Token' }], faces: [{ side: 'front', name: 'Front' }],
  extension: { value: 1 } }, { id: 'TK01-001', name: 'Token', image: '' }];
const source = (): GeneratedCardCatalog => ({ version: 'a',
  index: [{ id: 'BP01-001', name: 'Card', image: '/card.png', detail_group: 'BP01' },
    { id: 'TK01-001', name: 'Token', detail_group: 'TK01' }],
  loadCards: vi.fn(), loadCardsWithRelated: vi.fn().mockResolvedValue(full as unknown as readonly GeneratedCardDetails[]),
});

test('summaries stay separate from full details and only known requested IDs are hydrated with related cards', async () => {
  const raw = source();
  const adapter = createGeneratedDeckBuilderCatalog(raw);
  expect(adapter.summaries[0]).not.toHaveProperty('detail_group');
  expect(adapter.summaries[0]).not.toHaveProperty('ability_text');
  expect(adapter.knownCards()).toEqual([]);
  expect(adapter.hasAvailable(['BP01-001'])).toBe(false);
  const cards = await adapter.loadAvailable(['MISSING', 'BP01-001', 'BP01-001']);
  expect(raw.loadCardsWithRelated).toHaveBeenCalledExactlyOnceWith(['BP01-001']);
  expect(cards).toEqual(full);
  expect(adapter.knownCards()).toEqual(full);
  expect(adapter.hasAvailable(['BP01-001'])).toBe(true);
  expect(adapter.summaries[0]).not.toHaveProperty('ability_text');
});

test('the selection reader records only successfully verified details and returns the original branded result', async () => {
  const raw = source();
  const adapter = createGeneratedDeckBuilderCatalog(raw);
  const details = await adapter.catalog.loadCardsWithRelated(['BP01-001']);
  expect(details).toBe(full);
  expect(adapter.knownCards()[0]).not.toBe(full[0]);
  expect(adapter.knownCards()[0].related_cards).not.toBe(full[0].related_cards);
  expect(adapter.knownCards()[0].faces).not.toBe(full[0].faces);
  vi.mocked(raw.loadCardsWithRelated).mockRejectedValueOnce(new Error('failed group'));
  await expect(adapter.loadAvailable(['BP01-001'])).rejects.toThrow('failed group');
  expect(adapter.knownCards()).toEqual(full);
});

test('unknown-only selections do not fetch and cached entries do not cross catalog instances', async () => {
  const raw = source();
  const first = createGeneratedDeckBuilderCatalog(raw);
  expect(await first.loadAvailable(['MISSING'])).toEqual([]);
  expect(raw.loadCardsWithRelated).not.toHaveBeenCalled();
  await first.loadAvailable(['BP01-001']);
  expect(createGeneratedDeckBuilderCatalog(source()).knownCards()).toEqual([]);
});

test('extracts every saved section and imported legacy or external related references', () => {
  expect(getSavedCatalogIds({ sections: { main: [{ cardId: 'A', count: 2 }], evolve: [], leader: [], token: [{ cardId: 'T', count: 1 }] } }))
    .toEqual(['A', 'T']);
  expect(getImportedCatalogIds({ mainDeck: [{ id: 'external', related_cards: [{ id: 'T' }] }],
    evolveDeck: [{ id: 'E' }], leaderCard: { id: 'L' }, tokenDeck: [] })).toEqual(['external', 'T', 'E', 'L']);
  expect(getImportedCatalogIds({ mainDeck: 'invalid', leaderCard: null })).toEqual([]);
});
