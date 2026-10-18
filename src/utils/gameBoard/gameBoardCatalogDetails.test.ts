import { describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { GeneratedCardDetails } from '../card/generatedCardCatalog';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import { createGameBoardCatalogDetails } from './gameBoardCatalogDetails';

const main: DeckBuilderCardData = {
  id: 'MAIN-001', name: 'Main', image: '/main.png', atk: '2', hp: '3',
  ability_text: 'Complete ability', related_cards: [{ id: 'TOKEN-001', name: 'Token' }],
  faces: [{ side: 'back', name: 'Back', image: '/back.png', atk: '7', hp: '8', ability_text: 'Back ability' }],
};
const token: DeckBuilderCardData = {
  id: 'TOKEN-001', name: 'Token', image: '/token.png', ability_text: 'Token ability',
  related_cards: [{ id: main.id, name: main.name }],
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('createGameBoardCatalogDetails', () => {
  it('loads only requested known IDs, preserving order and duplicates, and reports unknown IDs separately', async () => {
    const source = generatedCatalogFixture([main, token]);
    const exact = vi.spyOn(source, 'loadCards');
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const service = createGameBoardCatalogDetails(source);
    expect(service.version).toBe(source.version);
    expect(exact).not.toHaveBeenCalled();
    expect(related).not.toHaveBeenCalled();
    const result = await service.load([main.id, 'CUSTOM', token.id, main.id, 'CUSTOM']);
    expect(exact).toHaveBeenCalledExactlyOnceWith([main.id, token.id, main.id]);
    expect(related).not.toHaveBeenCalled();
    expect(result.version).toBe(source.version);
    expect(result.requestedIds).toEqual([main.id, 'CUSTOM', token.id, main.id, 'CUSTOM']);
    expect(result.unknownIds).toEqual(['CUSTOM']);
    expect(result.cards).toEqual([main, token, main]);
    expect(Object.keys(result.detailLookup)).toEqual([main.id, token.id]);
    expect(result.detailLookup[main.id]).toMatchObject({ abilityText: 'Complete ability', atk: 2, hp: 3 });
    expect(result.detailLookup[main.id].faces?.[0]).toMatchObject({ name: 'Back', atk: 7, hp: 8, abilityText: 'Back ability' });
    expect(result.detailLookup).not.toHaveProperty('CUSTOM');
  });

  it('returns empty details without a loader call when no requested IDs are known', async () => {
    const source = generatedCatalogFixture([main]);
    const exact = vi.spyOn(source, 'loadCards');
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const service = createGameBoardCatalogDetails(source);
    expect(await service.load([])).toMatchObject({ requestedIds: [], unknownIds: [], cards: [], detailLookup: {} });
    expect(await service.load(['CUSTOM', 'CUSTOM'], { includeRelated: true })).toMatchObject({
      requestedIds: ['CUSTOM', 'CUSTOM'], unknownIds: ['CUSTOM'], cards: [], detailLookup: {},
    });
    expect(exact).not.toHaveBeenCalled();
    expect(related).not.toHaveBeenCalled();
  });

  it('loads complete related cards only when explicitly requested, including cyclic references', async () => {
    const source = generatedCatalogFixture([main, token]);
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const service = createGameBoardCatalogDetails(source);
    expect((await service.load([main.id])).cards).toEqual([main]);
    const result = await service.load([main.id, main.id, 'CUSTOM'], { includeRelated: true });
    expect(related).toHaveBeenCalledExactlyOnceWith([main.id, main.id]);
    expect(result.cards).toEqual([main, token]);
    expect(result.unknownIds).toEqual(['CUSTOM']);
    expect(result.detailLookup[token.id].abilityText).toBe('Token ability');
  });

  it('snapshots caller input and keeps both results when concurrent requests finish in reverse order', async () => {
    const source = generatedCatalogFixture([main, token]);
    const first = deferred<readonly GeneratedCardDetails[]>();
    const second = deferred<readonly GeneratedCardDetails[]>();
    const read = source.loadCards;
    vi.spyOn(source, 'loadCards').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const service = createGameBoardCatalogDetails(source);
    const ids = [main.id, 'CUSTOM'];
    const options = { includeRelated: false };
    const a = service.load(ids, options);
    ids[0] = token.id;
    options.includeRelated = true;
    const b = service.load([token.id]);
    second.resolve(await read([token.id]));
    expect((await b).cards).toEqual([token]);
    first.resolve(await read([main.id]));
    const result = await a;
    expect(result.requestedIds).toEqual([main.id, 'CUSTOM']);
    expect(result.cards).toEqual([main]);
    expect(result.unknownIds).toEqual(['CUSTOM']);
  });

  it('rejects a failed known-card batch without converting it to unknown IDs, then allows explicit retry', async () => {
    const source = generatedCatalogFixture([main, token]);
    const related = vi.spyOn(source, 'loadCardsWithRelated').mockRejectedValueOnce(new Error('HTTP 404'));
    const service = createGameBoardCatalogDetails(source);
    await expect(service.load([main.id], { includeRelated: true })).rejects.toThrow('HTTP 404');
    const result = await service.load([main.id], { includeRelated: true });
    expect(related).toHaveBeenCalledTimes(2);
    expect(result.cards).toEqual([main, token]);
    expect(result.unknownIds).toEqual([]);
  });

  it('keeps a successful independent result usable when another request later fails', async () => {
    const source = generatedCatalogFixture([main, token]);
    const failure = deferred<readonly GeneratedCardDetails[]>();
    vi.spyOn(source, 'loadCardsWithRelated').mockReturnValueOnce(failure.promise);
    const service = createGameBoardCatalogDetails(source);
    const rejected = expect(service.load([main.id], { includeRelated: true })).rejects.toThrow('offline');
    const completed = await service.load([token.id]);
    failure.reject(new Error('offline'));
    await rejected;
    expect(completed.detailLookup[token.id].abilityText).toBe('Token ability');
    expect((await service.load([token.id])).detailLookup).toEqual(completed.detailLookup);
  });

  it('does not share mutable presentation lookups between requests', async () => {
    const service = createGameBoardCatalogDetails(generatedCatalogFixture([main]));
    const first = await service.load([main.id]);
    first.detailLookup[main.id].abilityText = 'Changed';
    first.detailLookup[main.id].faces![0].name = 'Changed face';
    const second = await service.load([main.id]);
    expect(second.detailLookup[main.id].abilityText).toBe('Complete ability');
    expect(second.detailLookup[main.id].faces![0].name).toBe('Back');
    expect(second.cards[0].ability_text).toBe('Complete ability');
  });

  it('keeps separate catalog versions isolated and does not fall back to another version', async () => {
    const oldSource = { ...generatedCatalogFixture([main]), version: 'old' };
    const newSource = { ...generatedCatalogFixture([{ ...main, ability_text: 'New ability' }]), version: 'new' };
    const oldService = createGameBoardCatalogDetails(oldSource);
    const newService = createGameBoardCatalogDetails(newSource);
    const readNew = vi.spyOn(newSource, 'loadCards');
    vi.spyOn(oldSource, 'loadCards').mockRejectedValueOnce(new Error('Old version removed'));
    const current = await newService.load([main.id]);
    await expect(oldService.load([main.id])).rejects.toThrow('Old version removed');
    expect(readNew).toHaveBeenCalledTimes(1);
    expect(current).toMatchObject({ version: 'new', detailLookup: { [main.id]: { abilityText: 'New ability' } } });
    const old = await oldService.load([main.id]);
    expect(old).toMatchObject({ version: 'old', detailLookup: { [main.id]: { abilityText: 'Complete ability' } } });
  });
});
