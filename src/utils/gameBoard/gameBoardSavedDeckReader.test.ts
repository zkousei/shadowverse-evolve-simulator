import { describe, expect, it, vi } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import type { GeneratedCardDetails } from '../card/generatedCardCatalog';
import type { SavedDeckSections } from '../deck/deckStorage';
import { createGameBoardSavedDeckReader, UnknownSavedDeckCardsError } from './gameBoardSavedDeckReader';

const main: DeckBuilderCardData = {
  id: 'MAIN-001', name: 'Main', image: '/main.png', ability_text: 'Full main ability',
  related_cards: [{ id: 'TOKEN-001', name: 'Token' }],
  faces: [{ side: 'back', name: 'Back', ability_text: 'Full back ability', atk: '7' }],
};
const token: DeckBuilderCardData = {
  id: 'TOKEN-001', name: 'Token', image: '/token.png', ability_text: 'Full token ability',
  related_cards: [{ id: main.id, name: main.name }],
};
const evolve: DeckBuilderCardData = { id: 'EVOLVE-001', name: 'Evolve', image: '', ability_text: 'Evolve ability' };
const leader: DeckBuilderCardData = { id: 'LEADER-001', name: 'Leader', image: '', ability_text: 'Leader ability' };
const unrelated: DeckBuilderCardData = { id: 'OTHER-001', name: 'Other', image: '' };
const record = (sections: Partial<SavedDeckSections> = {}) => ({
  sections: { main: [], evolve: [], leader: [], token: [], ...sections } satisfies SavedDeckSections,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('createGameBoardSavedDeckReader', () => {
  it('reads all four sections once per ID and includes recursive related cards without reading the entire catalog', async () => {
    const source = generatedCatalogFixture([main, evolve, leader, token, unrelated]);
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const exact = vi.spyOn(source, 'loadCards');
    const reader = createGameBoardSavedDeckReader(source);
    expect(reader.version).toBe(source.version);
    expect(related).not.toHaveBeenCalled();
    const selected = record({ main: [{ cardId: main.id, count: 3 }, { cardId: main.id, count: 1 }],
      evolve: [{ cardId: evolve.id, count: 2 }], leader: [{ cardId: leader.id, count: 1 }],
      token: [{ cardId: token.id, count: 1 }] });
    const original = structuredClone(selected);
    const cards = await reader.loadCards(selected);
    expect(related).toHaveBeenCalledExactlyOnceWith([main.id, evolve.id, leader.id, token.id]);
    expect(exact).not.toHaveBeenCalled();
    expect(cards).toEqual([main, evolve, leader, token]);
    expect(selected).toEqual(original);
    expect(cards.some(card => card.id === unrelated.id)).toBe(false);
  });

  it('fetches tokens absent from saved sections, including cycles, preserving complete abilities and faces', async () => {
    const reader = createGameBoardSavedDeckReader(generatedCatalogFixture([main, token]));
    const cards = await reader.loadCards(record({ main: [{ cardId: main.id, count: 2 }] }));
    expect(cards).toEqual([main, token]);
    expect(cards[0].ability_text).toBe('Full main ability');
    expect(cards[0].faces?.[0].ability_text).toBe('Full back ability');
    expect(cards[1].ability_text).toBe('Full token ability');
  });

  it('does not fetch for an empty saved deck', async () => {
    const source = generatedCatalogFixture([main]);
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    expect(await createGameBoardSavedDeckReader(source).loadCards(record())).toEqual([]);
    expect(related).not.toHaveBeenCalled();
  });

  it.each(['main', 'evolve', 'leader', 'token'] as const)('rejects an unknown %s ID before fetching any known details', async section => {
    const source = generatedCatalogFixture([main]);
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const deck = record({ main: [{ cardId: main.id, count: 1 }], [section]: [
      { cardId: 'MISSING', count: 1 }, { cardId: 'MISSING', count: 2 },
    ] });
    const result = createGameBoardSavedDeckReader(source).loadCards(deck);
    await expect(result).rejects.toBeInstanceOf(UnknownSavedDeckCardsError);
    await expect(result).rejects.toMatchObject({ cardIds: ['MISSING'] });
    expect(related).not.toHaveBeenCalled();
  });

  it('checks zero-copy references too, matching existing saved-deck missing-ID handling', async () => {
    const source = generatedCatalogFixture([main]);
    const related = vi.spyOn(source, 'loadCardsWithRelated');
    const reader = createGameBoardSavedDeckReader(source);
    await expect(reader.loadCards(record({ main: [{ cardId: 'MISSING', count: 0 }] })))
      .rejects.toBeInstanceOf(UnknownSavedDeckCardsError);
    await reader.loadCards(record({ main: [{ cardId: main.id, count: 0 }] }));
    expect(related).toHaveBeenCalledExactlyOnceWith([main.id]);
  });

  it('propagates known-detail failures without partial results or automatic retry; explicit retry uses the same reader', async () => {
    const source = generatedCatalogFixture([main, token]);
    const failure = new Error('HTTP 404: pinned detail removed');
    const related = vi.spyOn(source, 'loadCardsWithRelated').mockRejectedValueOnce(failure);
    const reader = createGameBoardSavedDeckReader(source);
    const deck = record({ main: [{ cardId: main.id, count: 1 }] });
    await expect(reader.loadCards(deck)).rejects.toBe(failure);
    expect(related).toHaveBeenCalledTimes(1);
    expect(await reader.loadCards(deck)).toEqual([main, token]);
    expect(related).toHaveBeenCalledTimes(2);
  });

  it('snapshots requested IDs and keeps concurrent reads independent when they finish in reverse order', async () => {
    const source = generatedCatalogFixture([main, token, leader]);
    const read = source.loadCardsWithRelated;
    const first = deferred<readonly GeneratedCardDetails[]>();
    const second = deferred<readonly GeneratedCardDetails[]>();
    const related = vi.spyOn(source, 'loadCardsWithRelated').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const reader = createGameBoardSavedDeckReader(source);
    const deck = record({ main: [{ cardId: main.id, count: 1 }] });
    const pendingMain = reader.loadCards(deck);
    deck.sections.main[0].cardId = unrelated.id;
    const pendingLeader = reader.loadCards(record({ leader: [{ cardId: leader.id, count: 1 }] }));
    expect(related.mock.calls).toEqual([[[main.id]], [[leader.id]]]);
    second.resolve(await read([leader.id]));
    expect(await pendingLeader).toEqual([leader]);
    first.resolve(await read([main.id]));
    expect(await pendingMain).toEqual([main, token]);
  });

  it('returns fresh mutable cards, faces and references without modifying or sharing the verified source', async () => {
    const source = generatedCatalogFixture([main, token]);
    const reader = createGameBoardSavedDeckReader(source);
    const deck = record({ main: [{ cardId: main.id, count: 1 }] });
    const first = await reader.loadCards(deck);
    first[0].ability_text = 'Changed';
    first[0].faces![0].ability_text = 'Changed back';
    first[0].related_cards![0].id = 'Changed ID';
    first.pop();
    expect(await reader.loadCards(deck)).toEqual([main, token]);
    expect(main.ability_text).toBe('Full main ability');
    expect(main.faces![0].ability_text).toBe('Full back ability');
    expect(main.related_cards![0].id).toBe(token.id);
  });

  it('normalizes an absent image only after obtaining full verified details', async () => {
    const source = generatedCatalogFixture([{ id: 'NOIMAGE-001', name: 'No image', ability_text: 'Full ability' } as DeckBuilderCardData]);
    expect(await createGameBoardSavedDeckReader(source).loadCards(record({ token: [{ cardId: 'NOIMAGE-001', count: 1 }] })))
      .toEqual([{ id: 'NOIMAGE-001', name: 'No image', image: '', ability_text: 'Full ability' }]);
  });

  it('isolates separate versions and never falls back to a newer source after a pinned read fails', async () => {
    const oldSource = { ...generatedCatalogFixture([main, token]), version: 'old' };
    const newSource = { ...generatedCatalogFixture([{ ...main, ability_text: 'New ability' }, token]), version: 'new' };
    const readNew = vi.spyOn(newSource, 'loadCardsWithRelated');
    vi.spyOn(oldSource, 'loadCardsWithRelated').mockRejectedValueOnce(new Error('Old version removed'));
    const oldReader = createGameBoardSavedDeckReader(oldSource);
    const newReader = createGameBoardSavedDeckReader(newSource);
    const deck = record({ main: [{ cardId: main.id, count: 1 }] });
    const current = await newReader.loadCards(deck);
    await expect(oldReader.loadCards(deck)).rejects.toThrow('Old version removed');
    expect(readNew).toHaveBeenCalledTimes(1);
    expect(current[0].ability_text).toBe('New ability');
    expect((await oldReader.loadCards(deck))[0].ability_text).toBe('Full main ability');
    expect(oldReader.version).toBe('old');
    expect(newReader.version).toBe('new');
  });
});
