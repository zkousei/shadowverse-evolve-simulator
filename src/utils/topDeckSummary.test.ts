import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildTopDeckSummaryEffect } from './topDeckSummary';

const createCard = (id: string, name = `Card ${id}`): CardInstance => ({
  id,
  cardId: id,
  name,
  image: `/${id}.png`,
  zone: 'mainDeck-host',
  owner: 'host',
  isTapped: false,
  isFlipped: true,
  counters: { atk: 0, hp: 0 },
});

describe('topDeckSummary', () => {
  it('returns null when there are no resolved results', () => {
    expect(buildTopDeckSummaryEffect([], 'host', [])).toBeNull();
  });

  it('builds a summary effect with counts and named destinations', () => {
    const cards = [
      createCard('top-card', 'Top Card'),
      createCard('rev-card', 'Reveal Card'),
      createCard('field-card', 'Field Card'),
      createCard('ex-card', 'EX Card'),
    ];

    const effect = buildTopDeckSummaryEffect(cards, 'guest', [
      { cardId: 'top-card', action: 'top' },
      { cardId: 'rev-card', action: 'revealedHand' },
      { cardId: 'field-card', action: 'field' },
      { cardId: 'ex-card', action: 'ex' },
      { cardId: 'missing-card', action: 'cemetery' },
      { cardId: 'bottom-card', action: 'bottom' },
      { cardId: 'hand-card', action: 'hand' },
    ]);

    expect(effect).toEqual({
      type: 'LOOK_TOP_RESOLVED',
      actor: 'guest',
      totalCount: 7,
      topCount: 1,
      bottomCount: 1,
      handCount: 1,
      revealedHandCards: ['Reveal Card'],
      fieldCards: ['Field Card'],
      exCards: ['EX Card'],
      cemeteryCards: ['Unknown Card'],
    });
  });
});
