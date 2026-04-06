import { describe, expect, it } from 'vitest';
import { getTurnMessageDecision } from './gameBoardTurnMessage';

describe('getTurnMessageDecision', () => {
  it('clears the message outside playing status', () => {
    expect(getTurnMessageDecision({
      gameStatus: 'preparing',
      isSoloMode: false,
      role: 'guest',
      turnCount: 2,
      turnPlayer: 'guest',
    })).toEqual({ type: 'clear' });
  });

  it('clears the message in p2p when the turn moves away from the local role', () => {
    expect(getTurnMessageDecision({
      gameStatus: 'playing',
      isSoloMode: false,
      role: 'guest',
      turnCount: 2,
      turnPlayer: 'host',
    })).toEqual({ type: 'clear' });
  });

  it('skips without clearing when the current turn count is zero', () => {
    expect(getTurnMessageDecision({
      gameStatus: 'playing',
      isSoloMode: false,
      role: 'guest',
      turnCount: 0,
      turnPlayer: 'guest',
    })).toEqual({ type: 'skip' });
  });

  it('shows the local p2p turn message for the current role', () => {
    expect(getTurnMessageDecision({
      gameStatus: 'playing',
      isSoloMode: false,
      role: 'guest',
      turnCount: 2,
      turnPlayer: 'guest',
    })).toEqual({
      type: 'show',
      key: 'gameBoard.turn.your',
      durationMs: 2500,
    });
  });

  it('shows the solo player label for the active side', () => {
    expect(getTurnMessageDecision({
      gameStatus: 'playing',
      isSoloMode: true,
      role: 'host',
      turnCount: 2,
      turnPlayer: 'guest',
    })).toEqual({
      type: 'show',
      key: 'gameBoard.turn.p1',
      options: { label: 'PLAYER 2' },
      durationMs: 2500,
    });
  });
});
