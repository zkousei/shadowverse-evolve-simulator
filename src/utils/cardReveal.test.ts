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
      cardIds: ['c1'],
    });
  });

  it('builds a reveal effect for a top-deck card with public card data', () => {
    expect(buildSingleCardRevealEffect(
      [createCard('c2')],
      'guest',
      'c2',
      'REVEAL_TOP_DECK_CARDS'
    )).toEqual({
      type: 'REVEAL_TOP_DECK_CARDS',
      actor: 'guest',
      cards: [
        {
          cardId: 'c2',
          name: 'Card c2',
          image: '/c2.png',
        },
      ],
    });
  });
});
