import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildGameBoardEvolveAutoAttachSelection } from './gameBoardEvolveAutoAttachSelection';

const buildCard = (overrides: Partial<CardInstance>): CardInstance => ({
  id: 'card-1',
  cardId: 'CARD-1',
  name: 'Card',
  image: '',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('buildGameBoardEvolveAutoAttachSelection', () => {
  it('returns null when no selection is pending', () => {
    expect(buildGameBoardEvolveAutoAttachSelection({
      pendingSelection: null,
      cards: [],
      resolveSelection: () => {
        throw new Error('resolveSelection should not be called');
      },
    })).toBeNull();
  });

  it('rejects resolved source cards outside the pending actor evolve deck', () => {
    const sourceCard = buildCard({
      id: 'source-card',
      zone: 'hand-host',
    });

    expect(buildGameBoardEvolveAutoAttachSelection({
      pendingSelection: { sourceCardId: 'source-card', actor: 'host' },
      cards: [sourceCard],
      resolveSelection: () => ({
        sourceCard,
        candidateCards: [buildCard({ id: 'candidate-card' })],
        placement: 'stack',
      }),
    })).toBeNull();
  });

  it('rejects resolved selections without candidates', () => {
    const sourceCard = buildCard({
      id: 'source-card',
      zone: 'evolveDeck-host',
    });

    expect(buildGameBoardEvolveAutoAttachSelection({
      pendingSelection: { sourceCardId: 'source-card', actor: 'host' },
      cards: [sourceCard],
      resolveSelection: () => ({
        sourceCard,
        candidateCards: [],
        placement: 'stack',
      }),
    })).toBeNull();
  });

  it('preserves the actor, source, candidates, and placement for valid selections', () => {
    const sourceCard = buildCard({
      id: 'source-card',
      zone: 'evolveDeck-guest',
      owner: 'guest',
    });
    const candidateCard = buildCard({
      id: 'candidate-card',
      owner: 'guest',
    });
    const cards = [sourceCard, candidateCard];

    expect(buildGameBoardEvolveAutoAttachSelection({
      pendingSelection: { sourceCardId: 'source-card', actor: 'guest' },
      cards,
      resolveSelection: (cardId, incomingCards) => {
        expect(cardId).toBe('source-card');
        expect(incomingCards).toBe(cards);
        return {
          sourceCard,
          candidateCards: [candidateCard],
          placement: 'linked',
        };
      },
    })).toEqual({
      actor: 'guest',
      sourceCard,
      candidateCards: [candidateCard],
      placement: 'linked',
    });
  });
});
