import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildTopDeckRevealEffect } from './topDeckReveal';
import type { TopDeckResult } from './cardLogic';

const createCard = (id: string): CardInstance => ({
  id,
  cardId: id,
  name: `Card ${id}`,
  image: `/${id}.png`,
  zone: 'mainDeck-host',
  owner: 'host',
  isTapped: false,
  isFlipped: true,
  counters: { atk: 0, hp: 0 },
});

describe('topDeckReveal', () => {
  it('returns null when no top-deck card is marked as revealed hand', () => {
    const results: TopDeckResult[] = [{ cardId: 'c1', action: 'hand' }];
    expect(buildTopDeckRevealEffect([createCard('c1')], 'host', results)).toBeNull();
  });

  it('builds a shared UI effect for cards revealed into hand', () => {
    const cards = [createCard('c1'), createCard('c2')];
    const results: TopDeckResult[] = [
      { cardId: 'c1', action: 'revealedHand' },
      { cardId: 'c2', action: 'hand' },
    ];

    expect(buildTopDeckRevealEffect(cards, 'host', results)).toEqual({
      type: 'REVEAL_TOP_DECK_CARDS',
      actor: 'host',
      cards: [{ cardId: 'c1', name: 'Card c1', image: '/c1.png' }],
    });
  });
});
