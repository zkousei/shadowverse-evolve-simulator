import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildSingleCardRevealEffect } from './cardReveal';

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

describe('cardReveal', () => {
  it('returns null when the card cannot be found', () => {
    expect(buildSingleCardRevealEffect([], 'host', 'missing', 'REVEAL_SEARCHED_CARD_TO_HAND')).toBeNull();
  });

  it('builds a reveal effect for a searched card', () => {
    expect(buildSingleCardRevealEffect(
      [createCard('c1')],
      'host',
      'c1',
      'REVEAL_SEARCHED_CARD_TO_HAND'
    )).toEqual({
      type: 'REVEAL_SEARCHED_CARD_TO_HAND',
      actor: 'host',
      cards: [{ cardId: 'c1', name: 'Card c1', image: '/c1.png' }],
    });
  });
});
