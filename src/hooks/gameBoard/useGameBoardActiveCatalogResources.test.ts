import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../../types/game';
import { generatedCatalogFixture } from '../../test/generatedCatalogFixture';
import { openGeneratedCardCatalog } from '../../utils/card/generatedCardCatalog';
import type { CardInstance } from '../../components/Card';
import { useGameBoardActiveCatalogResources } from './useGameBoardActiveCatalogResources';

vi.mock('../../utils/card/generatedCardCatalog', async original => ({
  ...await original<typeof import('../../utils/card/generatedCardCatalog')>(), openGeneratedCardCatalog: vi.fn(),
}));
const cards = ['A', 'B', 'C', 'OFF'].map(id => ({ id, name: id, image: `/${id}.png`, atk: '3', hp: '4', ability_text: `Ability ${id}`, deck_section: 'main' as const, card_kind_normalized: 'follower' as const }));
const instance = (cardId: string, image = ''): CardInstance => ({ id: cardId, cardId, name: cardId, image, zone: 'field-host', owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } });
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected direct HTTP request'));
});
afterEach(() => vi.restoreAllMocks());

describe('active GameBoard catalog connection', () => {
  it('opens index metadata without any details or legacy JSON on an empty board', async () => {
    const catalog = generatedCatalogFixture(cards);
    const load = vi.spyOn(catalog, 'loadCards');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValue(catalog);
    const { result } = renderHook(() => useGameBoardActiveCatalogResources(initialState));
    await waitFor(() => expect(result.current.catalogStatus).toBe('ready'));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(result.current.cardStatLookup.OFF).toMatchObject({ atk: 3, hp: 4 });
    expect(result.current.cardDetailLookup).toEqual({});
  });

  it('requests unique stable board, both-player token and temporary top IDs without mutating inputs', async () => {
    const catalog = generatedCatalogFixture(cards);
    const load = vi.spyOn(catalog, 'loadCards');
    vi.mocked(openGeneratedCardCatalog).mockResolvedValue(catalog);
    const state = { ...initialState, cards: [instance('A'), instance('A', '/custom.png'), instance('CUSTOM', '/outside.png')], tokenOptions: { host: [{ cardId: 'B', name: 'B', image: '' }], guest: [{ cardId: 'C', name: 'C', image: '' }] } };
    const before = JSON.stringify(state);
    const { result, rerender } = renderHook(({ state }) => useGameBoardActiveCatalogResources(state, [instance('C')]), { initialProps: { state } });
    await waitFor(() => expect(result.current.cardDetailLookup.A?.abilityText).toBe('Ability A'));
    expect(load).toHaveBeenCalledExactlyOnceWith(['A', 'B', 'C']);
    expect(JSON.stringify(state)).toBe(before);
    rerender({ state: { ...state, cards: [...state.cards].reverse(), host: { ...state.host, hp: 19 } } });
    expect(load).toHaveBeenCalledTimes(1);
  });
});


it('keeps rules and snapshot artwork available on detail failure, retries in the same source and clears refs on unmount', async () => {
  const catalog = generatedCatalogFixture(cards);
  const load = vi.spyOn(catalog, 'loadCards').mockRejectedValueOnce(new Error('404'));
  vi.mocked(openGeneratedCardCatalog).mockResolvedValue(catalog);
  const state = { ...initialState, cards: [instance('A'), { ...instance('B', '/custom.png'), id: 'custom-b' }, instance('UNKNOWN', '/outside.png')] };
  const { result, unmount } = renderHook(() => useGameBoardActiveCatalogResources(state));
  await waitFor(() => expect(result.current.getDetailStatus('A')).toBe('error'));
  expect(result.current.catalogStatus).toBe('ready');
  expect(result.current.getDetailStatus('UNKNOWN')).toBe('unknown');
  expect(result.current.cardStatLookup.OFF).toMatchObject({ atk: 3, hp: 4 });
  expect(result.current.cardCatalogByIdRef.current.OFF).toMatchObject({ deck_section: 'main' });
  expect(result.current.displayCards.map(card => card.image)).toEqual(['/A.png', '/custom.png', '/outside.png']);
  expect(state.cards[0].image).toBe('');
  expect(result.current.cardDetailLookupRef.current).toEqual({});
  act(() => result.current.retryDetails());
  await waitFor(() => expect(result.current.cardDetailLookup.A?.abilityText).toBe('Ability A'));
  expect(load).toHaveBeenCalledTimes(2);
  expect(openGeneratedCardCatalog).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).not.toHaveBeenCalled();
  const refs = result.current;
  unmount();
  expect(refs.cardDetailLookupRef.current).toEqual({});
  expect(refs.cardCatalogByIdRef.current).toEqual({});
  expect(refs.evolveAutoAttachResolverRef.current).toBeNull();
});

it('requests temporary top cards even outside the board, then loads newly received IDs without clearing known details', async () => {
  const catalog = generatedCatalogFixture(cards);
  const load = vi.spyOn(catalog, 'loadCards');
  vi.mocked(openGeneratedCardCatalog).mockResolvedValue(catalog);
  const { result, rerender } = renderHook(({ state, top }) => useGameBoardActiveCatalogResources(state, top), {
    initialProps: { state: initialState, top: [instance('B')] },
  });
  await waitFor(() => expect(result.current.cardDetailLookup.B?.abilityText).toBe('Ability B'));
  rerender({ state: { ...initialState, cards: [instance('A')] }, top: [] });
  await waitFor(() => expect(result.current.cardDetailLookup.A?.abilityText).toBe('Ability A'));
  expect(result.current.cardDetailLookup.B.abilityText).toBe('Ability B');
  expect(load.mock.calls).toEqual([[['B']], [['A']]]);
});
