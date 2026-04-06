import { describe, expect, it } from 'vitest';
import { buildDebugGameBoardState } from './gameBoardDebugState';

describe('buildDebugGameBoardState', () => {
  it('builds the existing debug auto-start state for both players', () => {
    const state = buildDebugGameBoardState();

    expect(state.gameStatus).toBe('playing');
    expect(state.turnPlayer).toBe('host');
    expect(state.host).toMatchObject({
      pp: 1,
      maxPp: 1,
      initialHandDrawn: true,
      isReady: true,
    });
    expect(state.guest).toMatchObject({
      initialHandDrawn: true,
      isReady: true,
    });
    expect(state.cards).toHaveLength(40);
    expect(state.cards[0]).toMatchObject({
      id: 'debug-host-0',
      cardId: 'debug-card-0',
      name: 'Debug Card 1',
      zone: 'mainDeck-host',
      owner: 'host',
      isTapped: false,
      isFlipped: true,
      counters: { atk: 0, hp: 0 },
    });
    expect(state.cards[20]).toMatchObject({
      id: 'debug-guest-0',
      cardId: 'debug-card-0',
      name: 'Debug Card 1',
      zone: 'mainDeck-guest',
      owner: 'guest',
    });
  });
});
