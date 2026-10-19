import { describe, expect, it } from 'vitest';
import type { GameSyncEvent } from '../../types/sync';
import { initialState, type SyncState } from '../../types/game';
import { type CardInstance } from '../../components/Card';
import { buildEventCompletionEffects } from './gameBoardEventCompletionEffects';

describe('buildEventCompletionEffects', () => {
  const baseCard: CardInstance = {
    id: 'card-1',
    cardId: 'c1',
    name: 'Quickblader',
    image: '/img/c1.jpg',
    zone: 'mainDeck-host',
    owner: 'host',
    isTapped: false,
    isFlipped: false,
    counters: { atk: 0, hp: 0 },
  };

  const createBaseState = (cards: CardInstance[] = [baseCard]): SyncState => ({
    ...initialState,
    cards,
  });

  it('generates DRAW_CARD_COMPLETED in broadcastEffects for DRAW_CARD event', () => {
    const currentState = createBaseState();
    const nextState = {
      ...currentState,
      cards: [{ ...baseCard, zone: 'hand-host' }],
    };
    const event: GameSyncEvent = {
      id: 'e1',
      actor: 'host',
      type: 'DRAW_CARD',
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.snapshotEffects).toEqual([]);
    expect(effects.broadcastEffects).toEqual([
      {
        type: 'DRAW_CARD_COMPLETED',
        actor: 'host',
      },
    ]);
  });

  it('generates STARTER_DECIDED in broadcastEffects for SET_INITIAL_TURN_ORDER event', () => {
    const currentState = createBaseState();
    const nextState = { ...currentState };
    const event: GameSyncEvent = {
      id: 'e2',
      actor: 'host',
      type: 'SET_INITIAL_TURN_ORDER',
      starter: 'guest',
      manual: true,
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.broadcastEffects).toEqual([
      {
        type: 'STARTER_DECIDED',
        actor: 'host',
        starter: 'guest',
        manual: true,
      },
    ]);
  });

  it('generates BOARD_BATCH_COMPLETED in snapshotEffects for BOARD_BATCH event', () => {
    const currentState = createBaseState();
    const nextState = { ...currentState };
    const event: GameSyncEvent = {
      id: 'e3',
      actor: 'host',
      type: 'BOARD_BATCH',
      action: 'rest',
      turnCount: 1,
      turnPlayer: 'host',
      targets: [
        { rootId: 'card-1', signature: 'sig-1' },
        { rootId: 'card-2', signature: 'sig-2' },
      ],
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.snapshotEffects).toEqual([
      {
        type: 'BOARD_BATCH_COMPLETED',
        actor: 'host',
        action: 'rest',
        count: 2,
      },
    ]);
  });

  it('generates SEARCHED_CARD_TO_HAND in snapshotEffects when extracting from mainDeck to hand unrevealed', () => {
    const currentState = createBaseState([
      { ...baseCard, id: 'card-1', zone: 'mainDeck-host' },
    ]);
    const nextState = {
      ...currentState,
      cards: [{ ...baseCard, id: 'card-1', zone: 'hand-host' }],
    };
    const event: GameSyncEvent = {
      id: 'e4',
      actor: 'host',
      type: 'EXTRACT_CARD',
      cardId: 'card-1',
      destination: 'hand-host',
      revealToOpponent: false,
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.snapshotEffects).toEqual([
      {
        type: 'SEARCHED_CARD_TO_HAND',
        actor: 'host',
      },
    ]);
  });

  it('generates CEMETERY_CARD_TO_BOTTOM in snapshotEffects when sending card from cemetery to bottom', () => {
    const currentState = createBaseState([
      { ...baseCard, id: 'card-1', zone: 'cemetery-host' },
    ]);
    const nextState = {
      ...currentState,
      cards: [{ ...baseCard, id: 'card-1', zone: 'mainDeck-host' }],
    };
    const event: GameSyncEvent = {
      id: 'e5',
      actor: 'host',
      type: 'SEND_TO_BOTTOM',
      cardId: 'card-1',
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.snapshotEffects).toEqual([
      {
        type: 'CEMETERY_CARD_TO_BOTTOM',
        actor: 'host',
        cardName: 'Quickblader',
      },
    ]);
  });

  it('generates RANDOM_HAND_DISCARD_COMPLETED in broadcastEffects when cards are discarded', () => {
    const currentState = createBaseState([
      { ...baseCard, id: 'card-1', zone: 'hand-guest' },
      { ...baseCard, id: 'card-2', zone: 'hand-guest' },
    ]);
    const nextState = {
      ...currentState,
      cards: [
        { ...baseCard, id: 'card-1', zone: 'hand-guest' },
        { ...baseCard, id: 'card-2', zone: 'cemetery-guest' },
      ],
    };
    const event: GameSyncEvent = {
      id: 'e6',
      actor: 'host',
      type: 'DISCARD_RANDOM_HAND_CARDS',
      target: 'guest',
      count: 1,
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.broadcastEffects).toEqual([
      {
        type: 'RANDOM_HAND_DISCARD_COMPLETED',
        actor: 'host',
        target: 'guest',
        count: 1,
      },
    ]);
  });

  it('generates EVOLVE_USAGE_TOGGLED in broadcastEffects when flipping an evolve card in evolve deck', () => {
    const currentState = createBaseState([
      { ...baseCard, id: 'evolve-1', zone: 'evolveDeck-host', isEvolveCard: true, isFlipped: true },
    ]);
    const nextState = {
      ...currentState,
      cards: [
        { ...baseCard, id: 'evolve-1', zone: 'evolveDeck-host', isEvolveCard: true, isFlipped: false },
      ],
    };
    const event: GameSyncEvent = {
      id: 'e7',
      actor: 'host',
      type: 'TOGGLE_FLIP',
      cardId: 'evolve-1',
    };

    const effects = buildEventCompletionEffects({
      event,
      currentState,
      nextState,
    });

    expect(effects.broadcastEffects).toEqual([
      {
        type: 'EVOLVE_USAGE_TOGGLED',
        actor: 'host',
        cardName: 'Quickblader',
        isUsed: true,
      },
    ]);
  });
});
