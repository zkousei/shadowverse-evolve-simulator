import { describe, expect, it } from 'vitest';
import { formatSharedUiMessage, flipSharedCoin, getSharedActorLabel, rollSharedDie } from './sharedRandom';

describe('sharedRandom', () => {
  it('flips a shared coin deterministically from the provided random source', () => {
    expect(flipSharedCoin(() => 0.9)).toBe('HEADS (表)');
    expect(flipSharedCoin(() => 0.1)).toBe('TAILS (裏)');
  });

  it('rolls a shared die deterministically from the provided random source', () => {
    expect(rollSharedDie(() => 0)).toBe(1);
    expect(rollSharedDie(() => 0.999)).toBe(6);
  });

  it('formats actor labels for solo and p2p viewers', () => {
    expect(getSharedActorLabel('host', 'host', true)).toBe('Player 1');
    expect(getSharedActorLabel('guest', 'host', true)).toBe('Player 2');
    expect(getSharedActorLabel('host', 'host', false)).toBe('You');
    expect(getSharedActorLabel('guest', 'host', false)).toBe('Opponent');
  });

  it('formats shared UI messages for coin and dice results', () => {
    expect(formatSharedUiMessage(
      { type: 'COIN_FLIP_RESULT', actor: 'guest', result: 'HEADS (表)' },
      'host',
      false
    )).toBe('Opponent flipped: HEADS (表)');

    expect(formatSharedUiMessage(
      { type: 'DICE_ROLL_RESULT', actor: 'host', value: 4 },
      'host',
      false
    )).toBe('You rolled: 4');

    expect(formatSharedUiMessage(
      { type: 'RESET_GAME_COMPLETED', actor: 'guest' },
      'host',
      false
    )).toBe('Opponent reset the game');

    expect(formatSharedUiMessage(
      { type: 'SHUFFLE_DECK_COMPLETED', actor: 'host' },
      'guest',
      false
    )).toBe('Opponent shuffled the deck');

    expect(formatSharedUiMessage(
      { type: 'MILL_CARD_COMPLETED', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false
    )).toBe('Opponent milled Aurelia');
  });

  it('formats reveal messages for both look-top and search effects', () => {
    expect(formatSharedUiMessage(
      { type: 'REVEAL_TOP_DECK_CARDS', actor: 'guest', cards: [] },
      'host',
      false
    )).toBe('Opponent revealed from Look Top');

    expect(formatSharedUiMessage(
      { type: 'REVEAL_SEARCHED_CARD_TO_HAND', actor: 'host', cards: [{ cardId: 'BP01-001', name: 'Alpha Knight', image: '' }] },
      'guest',
      true
    )).toBe('Player 1 revealed from Search');
  });

  it('formats attack declarations as a shared UI message fallback', () => {
    expect(formatSharedUiMessage(
      { type: 'ATTACK_DECLARED', actor: 'guest', attackerCardId: 'attacker-1', attackerName: 'Knight', target: { type: 'leader', player: 'host' } },
      'host',
      false
    )).toBe('Opponent declared an attack');
  });

  it('formats card played announcements as a shared UI message fallback', () => {
    expect(formatSharedUiMessage(
      { type: 'CARD_PLAYED', actor: 'host', cardId: 'spell-1', cardName: 'Fire Chain', mode: 'play' },
      'guest',
      false
    )).toBe('Opponent played Fire Chain');
  });

  it('formats starter decision messages for random and manual choices', () => {
    expect(formatSharedUiMessage(
      { type: 'STARTER_DECIDED', actor: 'host', starter: 'guest', manual: false },
      'host',
      false
    )).toBe('Opponent will go first!');

    expect(formatSharedUiMessage(
      { type: 'STARTER_DECIDED', actor: 'guest', starter: 'host', manual: true },
      'guest',
      false
    )).toBe('Manually set: Opponent will go first!');
  });
});
