import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildHandRevealEffect, buildSingleCardRevealEffect } from './cardReveal';

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

const createCardInZone = (id: string, zone: string): CardInstance => ({
  ...createCard(id),
  zone,
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

  it('builds a hand reveal effect only from the actor hand', () => {
    expect(buildHandRevealEffect(
      [
        createCardInZone('host-hand-1', 'hand-host'),
        createCardInZone('host-hand-2', 'hand-host'),
        createCardInZone('guest-hand-1', 'hand-guest'),
        createCardInZone('host-deck-1', 'mainDeck-host'),
      ],
      'host'
    )).toEqual({
      type: 'REVEAL_HAND_CARDS',
      actor: 'host',
      cards: [
        {
          cardId: 'host-hand-1',
          name: 'Card host-hand-1',
          image: '',
        },
        {
          cardId: 'host-hand-2',
          name: 'Card host-hand-2',
          image: '',
        },
      ],
    });
  });

  it('does not build a hand reveal effect for an empty actor hand', () => {
    expect(buildHandRevealEffect([createCardInZone('guest-hand-1', 'hand-guest')], 'host')).toBeNull();
  });
});
