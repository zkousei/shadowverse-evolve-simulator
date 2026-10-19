import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CardInstance } from '../Card';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import { useCardSearchModalFilter } from './useCardSearchModalFilter';

const createCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
  id: 'card-1',
  cardId: 'cid-1',
  name: 'Card 1',
  image: 'https://example.com/card.png',
  zone: 'cemetery-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('useCardSearchModalFilter', () => {
  it('identifies zone types and capabilities correctly', () => {
    const cards = [createCard()];

    const { result: mainDeckResult } = renderHook(() =>
      useCardSearchModalFilter({
        cards,
        isOpen: true,
        zoneId: 'mainDeck-host',
        allowHandExtraction: true,
        readOnly: false,
      })
    );
    expect(mainDeckResult.current.isMainDeckSearch).toBe(true);
    expect(mainDeckResult.current.isPreparingMainDeckSearch).toBe(false);
    expect(mainDeckResult.current.canSortCards).toBe(false);
    expect(mainDeckResult.current.supportsBulkSelection).toBe(true);

    const { result: prepResult } = renderHook(() =>
      useCardSearchModalFilter({
        cards,
        isOpen: true,
        zoneId: 'mainDeck-host',
        allowHandExtraction: false,
        readOnly: false,
      })
    );
    expect(prepResult.current.isPreparingMainDeckSearch).toBe(true);

    const { result: cemeteryResult } = renderHook(() =>
      useCardSearchModalFilter({
        cards,
        isOpen: true,
        zoneId: 'cemetery-host',
        allowHandExtraction: true,
        readOnly: false,
      })
    );
    expect(cemeteryResult.current.canSortCards).toBe(true);
    expect(cemeteryResult.current.isPublicRecoveryZone).toBe(true);
    expect(cemeteryResult.current.shouldShowTypeCounts).toBe(true);
  });

  it('sorts cemetery cards by cost and groups same-name cards', () => {
    const cards: CardInstance[] = [
      createCard({ id: 'c-high', cardId: 'cid-high', name: 'High Cost' }),
      createCard({ id: 'c-low-2', cardId: 'cid-low-2', name: 'Alpha Low' }),
      createCard({ id: 'c-low-1', cardId: 'cid-low-1', name: 'Beta Low' }),
    ];

    const lookup = {
      'cid-high': { id: 'cid-high', name: 'High Cost', cost: '5', type: 'Follower', image: '', className: '', title: '', subtype: '', abilityText: '' },
      'cid-low-1': { id: 'cid-low-1', name: 'Beta Low', cost: '2', type: 'Follower', image: '', className: '', title: '', subtype: '', abilityText: '' },
      'cid-low-2': { id: 'cid-low-2', name: 'Alpha Low', cost: '2', type: 'Follower', image: '', className: '', title: '', subtype: '', abilityText: '' },
    } as unknown as CardDetailLookup;

    const { result } = renderHook(() =>
      useCardSearchModalFilter({
        cards,
        cardDetailLookup: lookup,
        isOpen: true,
        zoneId: 'cemetery-host',
        allowHandExtraction: true,
        readOnly: false,
      })
    );

    expect(result.current.visibleCards.map(c => c.id)).toEqual(['c-high', 'c-low-2', 'c-low-1']);

    act(() => {
      result.current.setSortMode('cost');
    });

    // Cost 2 (Alpha Low, Beta Low) then Cost 5 (High Cost)
    expect(result.current.visibleCards.map(c => c.id)).toEqual(['c-low-2', 'c-low-1', 'c-high']);
  });

  it('sorts cemetery cards by type in order: follower, spell, amulet, unknown', () => {
    const cards: CardInstance[] = [
      createCard({ id: 'c-amulet', cardId: 'cid-amulet', name: 'Amulet', baseCardType: 'amulet' }),
      createCard({ id: 'c-follower', cardId: 'cid-follower', name: 'Follower', baseCardType: 'follower' }),
      createCard({ id: 'c-spell', cardId: 'cid-spell', name: 'Spell', baseCardType: 'spell' }),
    ];

    const lookup = {
      'cid-amulet': { id: 'cid-amulet', name: 'Amulet', type: 'Amulet', image: '', className: '', title: '', subtype: '', cost: '1', abilityText: '' },
      'cid-follower': { id: 'cid-follower', name: 'Follower', type: 'Follower', image: '', className: '', title: '', subtype: '', cost: '1', abilityText: '' },
      'cid-spell': { id: 'cid-spell', name: 'Spell', type: 'Spell', image: '', className: '', title: '', subtype: '', cost: '1', abilityText: '' },
    } as unknown as CardDetailLookup;

    const { result } = renderHook(() =>
      useCardSearchModalFilter({
        cards,
        cardDetailLookup: lookup,
        isOpen: true,
        zoneId: 'cemetery-host',
        allowHandExtraction: true,
        readOnly: false,
      })
    );

    act(() => {
      result.current.setSortMode('type');
    });

    expect(result.current.visibleCards.map(c => c.id)).toEqual(['c-follower', 'c-spell', 'c-amulet']);
  });
});
