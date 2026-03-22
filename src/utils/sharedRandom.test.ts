import { describe, expect, it } from 'vitest';
import { formatSharedUiMessage, flipSharedCoin, getSharedActorLabel, rollSharedDie } from './sharedRandom';

const t = ((key: string, options?: any) => {
  const map: Record<string, string> = {
    'gameBoard.shared.actor.you': 'You',
    'gameBoard.shared.actor.opponent': 'Opponent',
    'gameBoard.shared.actor.player1': 'Player 1',
    'gameBoard.shared.actor.player2': 'Player 2',
    'gameBoard.shared.messages.lookTopResolved': '{{actor}} resolved Look Top {{count}}',
    'gameBoard.shared.messages.lookTopDetail.revealedToHand': 'Revealed to Hand: {{cards}}',
    'gameBoard.shared.messages.lookTopDetail.bottom': 'Bottom: {{count}}',
    'gameBoard.shared.messages.lookTopDetail.top': 'Top: {{count}}',
    'gameBoard.shared.messages.lookTopDetail.hand': 'Hand: {{count}}',
    'gameBoard.shared.messages.lookTopDetail.field': 'Field: {{cards}}',
    'gameBoard.shared.messages.lookTopDetail.ex': 'EX: {{cards}}',
    'gameBoard.shared.messages.lookTopDetail.cemetery': 'Cemetery: {{cards}}',
    'gameBoard.shared.messages.coinFlip': '{{actor}} flipped: {{result}}',
    'gameBoard.shared.messages.diceRoll': '{{actor}} rolled: {{value}}',
    'gameBoard.shared.messages.resetGame': '{{actor}} reset the game',
    'gameBoard.shared.messages.shuffleDeck': '{{actor}} shuffled the deck',
    'gameBoard.shared.messages.drawCard': '{{actor}} drew a card',
    'gameBoard.shared.messages.millCard': '{{actor}} milled {{cardName}}',
    'gameBoard.shared.messages.searchToHand': '{{actor}} added a card from Search to hand',
    'gameBoard.shared.messages.searchPlayedField': '{{actor}} played to field {{cardName}} from Search',
    'gameBoard.shared.messages.searchSetField': '{{actor}} set a card from Search to field',
    'gameBoard.shared.messages.searchToEx': '{{actor}} added {{cardName}} from Search to EX Area',
    'gameBoard.shared.messages.searchToExGeneric': '{{actor}} added a card from Search to EX Area',
    'gameBoard.shared.messages.cemeteryToHand': '{{actor}} added {{cardName}} from Cemetery to hand',
    'gameBoard.shared.messages.cemeteryPlayedField': '{{actor}} played to field {{cardName}} from Cemetery',
    'gameBoard.shared.messages.cemeteryToEx': '{{actor}} added {{cardName}} from Cemetery to EX Area',
    'gameBoard.shared.messages.evolvePlayedField': '{{actor}} played to field {{cardName}} from Evolve Deck',
    'gameBoard.shared.messages.evolveSetUsed': '{{actor}} set {{cardName}} to USED',
    'gameBoard.shared.messages.evolveSetUnused': '{{actor}} set {{cardName}} to UNUSED',
    'gameBoard.shared.messages.banishToHand': '{{actor}} added {{cardName}} from Banish to hand',
    'gameBoard.shared.messages.banishPlayedField': '{{actor}} played to field {{cardName}} from Banish',
    'gameBoard.shared.messages.banishToEx': '{{actor}} added {{cardName}} from Banish to EX Area',
    'gameBoard.shared.messages.revealLookTop': '{{actor}} revealed from Look Top',
    'gameBoard.shared.messages.revealSearch': '{{actor}} revealed from Search',
    'gameBoard.shared.messages.attackDeclared': '{{actor}} declared an attack',
    'gameBoard.shared.messages.cardPlayed': '{{actor}} played {{cardName}}',
    'gameBoard.shared.messages.cardPlayedToField': '{{actor}} played to field {{cardName}}',
    'gameBoard.shared.messages.starterDecided': '{{actor}} will go first!',
    'gameBoard.shared.messages.starterDecidedManual': 'Manually set: {{actor}} will go first!',
  };

  let value = map[key] || key;
  if (options) {
    Object.keys(options).forEach(k => {
      value = value.replace(`{{${k}}}`, String(options[k]));
    });
  }
  return value;
}) as any;

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
    expect(getSharedActorLabel('host', 'host', true, t)).toBe('Player 1');
    expect(getSharedActorLabel('guest', 'host', true, t)).toBe('Player 2');
    expect(getSharedActorLabel('host', 'host', false, t)).toBe('You');
    expect(getSharedActorLabel('guest', 'host', false, t)).toBe('Opponent');
  });

  it('formats shared UI messages for coin and dice results', () => {
    expect(formatSharedUiMessage(
      { type: 'COIN_FLIP_RESULT', actor: 'guest', result: 'HEADS (表)' },
      'host',
      false,
      t
    )).toBe('Opponent flipped: HEADS (表)');

    expect(formatSharedUiMessage(
      { type: 'DICE_ROLL_RESULT', actor: 'host', value: 4 },
      'host',
      false,
      t
    )).toBe('You rolled: 4');

    expect(formatSharedUiMessage(
      { type: 'RESET_GAME_COMPLETED', actor: 'guest' },
      'host',
      false,
      t
    )).toBe('Opponent reset the game');

    expect(formatSharedUiMessage(
      { type: 'SHUFFLE_DECK_COMPLETED', actor: 'host' },
      'guest',
      false,
      t
    )).toBe('Opponent shuffled the deck');

    expect(formatSharedUiMessage(
      { type: 'DRAW_CARD_COMPLETED', actor: 'host' },
      'guest',
      false,
      t
    )).toBe('Opponent drew a card');

    expect(formatSharedUiMessage(
      { type: 'MILL_CARD_COMPLETED', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('Opponent milled Aurelia');

    expect(formatSharedUiMessage(
      { type: 'SEARCHED_CARD_PLACED', actor: 'host', destination: 'ex', cardName: 'Drive Point' },
      'guest',
      false,
      t
    )).toBe('Opponent added Drive Point from Search to EX Area');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_HAND', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('Opponent added Aurelia from Cemetery to hand');

    expect(formatSharedUiMessage(
      { type: 'EVOLVE_CARD_PLACED', actor: 'guest', cardName: 'Dragon Warrior' },
      'host',
      false,
      t
    )).toBe('Opponent played to field Dragon Warrior from Evolve Deck');

    expect(formatSharedUiMessage(
      { type: 'EVOLVE_USAGE_TOGGLED', actor: 'guest', cardName: 'Dragon Warrior', isUsed: true },
      'host',
      false,
      t
    )).toBe('Opponent set Dragon Warrior to USED');

    expect(formatSharedUiMessage(
      { type: 'BANISHED_CARD_TO_HAND', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('Opponent added Aurelia from Banish to hand');
  });

  it('formats reveal messages for both look-top and search effects', () => {
    expect(formatSharedUiMessage(
      { type: 'REVEAL_TOP_DECK_CARDS', actor: 'guest', cards: [] },
      'host',
      false,
      t
    )).toBe('Opponent revealed from Look Top');

    expect(formatSharedUiMessage(
      { type: 'REVEAL_SEARCHED_CARD_TO_HAND', actor: 'host', cards: [{ cardId: 'BP01-001', name: 'Alpha Knight', image: '' }] },
      'guest',
      true,
      t
    )).toBe('Player 1 revealed from Search');

    expect(formatSharedUiMessage(
      {
        type: 'LOOK_TOP_RESOLVED',
        actor: 'guest',
        totalCount: 4,
        topCount: 1,
        bottomCount: 2,
        handCount: 1,
        revealedHandCards: ['Aurelia'],
        fieldCards: [],
        exCards: ['Drive Point'],
        cemeteryCards: ['Fire Chain'],
      },
      'host',
      false,
      t
    )).toBe('Opponent resolved Look Top 4\nRevealed to Hand: Aurelia\nBottom: 2\nTop: 1\nHand: 1\nEX: Drive Point\nCemetery: Fire Chain');
  });

  it('formats attack declarations as a shared UI message fallback', () => {
    expect(formatSharedUiMessage(
      { type: 'ATTACK_DECLARED', actor: 'guest', attackerCardId: 'attacker-1', attackerName: 'Knight', target: { type: 'leader', player: 'host' } },
      'host',
      false,
      t
    )).toBe('Opponent declared an attack');
  });

  it('formats card played announcements as a shared UI message fallback', () => {
    expect(formatSharedUiMessage(
      { type: 'CARD_PLAYED', actor: 'host', cardId: 'spell-1', cardName: 'Fire Chain', mode: 'play' },
      'guest',
      false,
      t
    )).toBe('Opponent played Fire Chain');
  });

  it('formats starter decision messages for random and manual choices', () => {
    expect(formatSharedUiMessage(
      { type: 'STARTER_DECIDED', actor: 'host', starter: 'guest', manual: false },
      'host',
      false,
      t
    )).toBe('Opponent will go first!');

    expect(formatSharedUiMessage(
      { type: 'STARTER_DECIDED', actor: 'guest', starter: 'host', manual: true },
      'guest',
      false,
      t
    )).toBe('Manually set: Opponent will go first!');
  });
});
