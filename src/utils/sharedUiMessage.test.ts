import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { formatSharedUiMessage, getSharedActorLabel } from './sharedUiMessage';

const t = ((key: string, options?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'gameBoard.modals.shared.actor.you': 'You',
    'gameBoard.modals.shared.actor.opponent': 'Opponent',
    'gameBoard.modals.shared.actor.player1': 'Player 1',
    'gameBoard.modals.shared.actor.player2': 'Player 2',
    'gameBoard.modals.shared.owner.you': 'your',
    'gameBoard.modals.shared.owner.opponent': "opponent's",
    'gameBoard.modals.shared.owner.player1': "Player 1's",
    'gameBoard.modals.shared.owner.player2': "Player 2's",
    'gameBoard.modals.shared.messages.lookTopResolved': '{{actor}} resolved Look Top {{count}}',
    'gameBoard.modals.shared.messages.lookTopDetail.revealedToHand': 'Revealed to Hand: {{cards}}',
    'gameBoard.modals.shared.messages.lookTopDetail.bottom': 'Bottom: {{count}}',
    'gameBoard.modals.shared.messages.lookTopDetail.top': 'Top: {{count}}',
    'gameBoard.modals.shared.messages.lookTopDetail.hand': 'Hand: {{count}}',
    'gameBoard.modals.shared.messages.lookTopDetail.field': 'Field: {{cards}}',
    'gameBoard.modals.shared.messages.lookTopDetail.ex': 'EX: {{cards}}',
    'gameBoard.modals.shared.messages.lookTopDetail.cemetery': 'Cemetery: {{cards}}',
    'gameBoard.modals.shared.messages.coinFlip': '{{actor}} flipped: {{result}}',
    'gameBoard.modals.shared.messages.diceRoll': '{{actor}} rolled: {{value}}',
    'gameBoard.modals.shared.messages.resetGame': '{{actor}} reset the game',
    'gameBoard.modals.shared.messages.shuffleDeck': '{{actor}} shuffled the deck',
    'gameBoard.modals.shared.messages.drawCard': '{{actor}} drew a card',
    'gameBoard.modals.shared.messages.millCard': '{{actor}} milled {{cardName}}',
    'gameBoard.modals.shared.messages.topCardToEx': '{{actor}} moved {{cardName}} to EX Area',
    'gameBoard.modals.shared.messages.searchToHand': '{{actor}} added a card from Search to hand',
    'gameBoard.modals.shared.messages.searchToHandMultiple': '{{actor}} added {{count}} cards from Search to hand',
    'gameBoard.modals.shared.messages.searchToHandOwned': '{{actor}} added a card from {{sourceOwner}} Main Deck to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.searchToHandMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Main Deck to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.searchPlayedField': '{{actor}} played to field {{cardName}} from Search',
    'gameBoard.modals.shared.messages.searchPlayedFieldMultiple': '{{actor}} played {{count}} cards from Search to field',
    'gameBoard.modals.shared.messages.searchPlayedFieldOwned': '{{actor}} played {{cardName}} from {{sourceOwner}} Main Deck to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.searchPlayedFieldMultipleOwned': '{{actor}} played {{count}} cards from {{sourceOwner}} Main Deck to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.searchSetField': '{{actor}} set a card from Search to field',
    'gameBoard.modals.shared.messages.searchSetFieldMultiple': '{{actor}} set {{count}} cards from Search to field',
    'gameBoard.modals.shared.messages.searchSetFieldOwned': '{{actor}} set a card from {{sourceOwner}} Main Deck to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.searchSetFieldMultipleOwned': '{{actor}} set {{count}} cards from {{sourceOwner}} Main Deck to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.searchToEx': '{{actor}} added {{cardName}} from Search to EX Area',
    'gameBoard.modals.shared.messages.searchToExGeneric': '{{actor}} added a card from Search to EX Area',
    'gameBoard.modals.shared.messages.searchToExMultiple': '{{actor}} added {{count}} cards from Search to EX Area',
    'gameBoard.modals.shared.messages.searchToExOwned': '{{actor}} added {{cardName}} from {{sourceOwner}} Main Deck to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.searchToExGenericOwned': '{{actor}} added a card from {{sourceOwner}} Main Deck to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.searchToExMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Main Deck to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.mainDeckToCemetery': '{{actor}} sent {{cardName}} from Main Deck to Cemetery',
    'gameBoard.modals.shared.messages.mainDeckToCemeteryMultiple': '{{actor}} sent {{count}} cards from Main Deck to Cemetery',
    'gameBoard.modals.shared.messages.mainDeckToCemeteryOwned': '{{actor}} sent {{cardName}} from {{sourceOwner}} Main Deck to {{destinationOwner}} Cemetery',
    'gameBoard.modals.shared.messages.mainDeckToCemeteryMultipleOwned': '{{actor}} sent {{count}} cards from {{sourceOwner}} Main Deck to {{destinationOwner}} Cemetery',
    'gameBoard.modals.shared.messages.cemeteryToHand': '{{actor}} added {{cardName}} from Cemetery to hand',
    'gameBoard.modals.shared.messages.cemeteryToHandMultiple': '{{actor}} added {{count}} cards from Cemetery to hand',
    'gameBoard.modals.shared.messages.cemeteryToHandOwned': '{{actor}} added {{cardName}} from {{sourceOwner}} Cemetery to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.cemeteryToHandMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Cemetery to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.cemeteryToBottom': '{{actor}} sent {{cardName}} from Cemetery to bottom of deck',
    'gameBoard.modals.shared.messages.cemeteryToBottomMultiple': '{{actor}} sent {{count}} cards from Cemetery to bottom of deck',
    'gameBoard.modals.shared.messages.cemeteryToBottomOwned': '{{actor}} sent {{cardName}} from {{sourceOwner}} Cemetery to bottom of {{destinationOwner}} deck',
    'gameBoard.modals.shared.messages.cemeteryToBottomMultipleOwned': '{{actor}} sent {{count}} cards from {{sourceOwner}} Cemetery to bottom of {{destinationOwner}} deck',
    'gameBoard.modals.shared.messages.cemeteryPlayedField': '{{actor}} played to field {{cardName}} from Cemetery',
    'gameBoard.modals.shared.messages.cemeteryPlayedFieldMultiple': '{{actor}} played {{count}} cards from Cemetery to field',
    'gameBoard.modals.shared.messages.cemeteryPlayedFieldOwned': '{{actor}} played {{cardName}} from {{sourceOwner}} Cemetery to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.cemeteryPlayedFieldMultipleOwned': '{{actor}} played {{count}} cards from {{sourceOwner}} Cemetery to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.cemeteryToEx': '{{actor}} added {{cardName}} from Cemetery to EX Area',
    'gameBoard.modals.shared.messages.cemeteryToExMultiple': '{{actor}} added {{count}} cards from Cemetery to EX Area',
    'gameBoard.modals.shared.messages.cemeteryToExOwned': '{{actor}} added {{cardName}} from {{sourceOwner}} Cemetery to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.cemeteryToExMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Cemetery to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.cemeteryToBanish': '{{actor}} banished {{cardName}} from Cemetery',
    'gameBoard.modals.shared.messages.cemeteryToBanishMultiple': '{{actor}} banished {{count}} cards from Cemetery',
    'gameBoard.modals.shared.messages.cemeteryToBanishOwned': '{{actor}} banished {{cardName}} from {{sourceOwner}} Cemetery',
    'gameBoard.modals.shared.messages.cemeteryToBanishMultipleOwned': '{{actor}} banished {{count}} cards from {{sourceOwner}} Cemetery',
    'gameBoard.modals.shared.messages.evolvePlayedField': '{{actor}} played to field {{cardName}} from Evolve Deck',
    'gameBoard.modals.shared.messages.evolveSetUsed': '{{actor}} set {{cardName}} to USED',
    'gameBoard.modals.shared.messages.evolveSetUnused': '{{actor}} set {{cardName}} to UNUSED',
    'gameBoard.modals.shared.messages.banishToHand': '{{actor}} added {{cardName}} from Banish to hand',
    'gameBoard.modals.shared.messages.banishToHandMultiple': '{{actor}} added {{count}} cards from Banish to hand',
    'gameBoard.modals.shared.messages.banishToHandOwned': '{{actor}} added {{cardName}} from {{sourceOwner}} Banish to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.banishToHandMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Banish to {{destinationOwner}} hand',
    'gameBoard.modals.shared.messages.banishToBottom': '{{actor}} sent {{cardName}} from Banish to bottom of deck',
    'gameBoard.modals.shared.messages.banishToBottomMultiple': '{{actor}} sent {{count}} cards from Banish to bottom of deck',
    'gameBoard.modals.shared.messages.banishToBottomOwned': '{{actor}} sent {{cardName}} from {{sourceOwner}} Banish to bottom of {{destinationOwner}} deck',
    'gameBoard.modals.shared.messages.banishToBottomMultipleOwned': '{{actor}} sent {{count}} cards from {{sourceOwner}} Banish to bottom of {{destinationOwner}} deck',
    'gameBoard.modals.shared.messages.banishPlayedField': '{{actor}} played to field {{cardName}} from Banish',
    'gameBoard.modals.shared.messages.banishPlayedFieldMultiple': '{{actor}} played {{count}} cards from Banish to field',
    'gameBoard.modals.shared.messages.banishPlayedFieldOwned': '{{actor}} played {{cardName}} from {{sourceOwner}} Banish to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.banishPlayedFieldMultipleOwned': '{{actor}} played {{count}} cards from {{sourceOwner}} Banish to {{destinationOwner}} field',
    'gameBoard.modals.shared.messages.banishToEx': '{{actor}} added {{cardName}} from Banish to EX Area',
    'gameBoard.modals.shared.messages.banishToExMultiple': '{{actor}} added {{count}} cards from Banish to EX Area',
    'gameBoard.modals.shared.messages.banishToExOwned': '{{actor}} added {{cardName}} from {{sourceOwner}} Banish to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.banishToExMultipleOwned': '{{actor}} added {{count}} cards from {{sourceOwner}} Banish to {{destinationOwner}} EX Area',
    'gameBoard.modals.shared.messages.namedCardListWithMore': '{{cards}}, and {{count}} more',
    'gameBoard.modals.shared.messages.revealLookTop': '{{actor}} revealed from Look Top',
    'gameBoard.modals.shared.messages.revealHand': '{{actor}} revealed cards from hand',
    'gameBoard.modals.shared.messages.revealSearch': '{{actor}} revealed from Search',
    'gameBoard.modals.shared.messages.attackDeclared': '{{actor}} declared an attack',
    'gameBoard.modals.shared.messages.cardPlayed': '{{actor}} played {{cardName}}',
    'gameBoard.modals.shared.messages.cardPlayedToField': '{{actor}} played to field {{cardName}}',
    'gameBoard.modals.shared.messages.starterDecided': '{{actor}} will go first!',
    'gameBoard.modals.shared.messages.starterDecidedManual': 'Manually set: {{actor}} will go first!',
  };

  let value = map[key] || key;
  if (options) {
    Object.keys(options).forEach(k => {
      value = value.replace(`{{${k}}}`, String(options[k]));
    });
  }
  return value;
}) as TFunction;

describe('sharedUiMessage', () => {
  it('formats actor labels for solo and p2p viewers', () => {
    expect(getSharedActorLabel('host', 'host', true, t)).toBe('Player 1');
    expect(getSharedActorLabel('guest', 'host', true, t)).toBe('Player 2');
    expect(getSharedActorLabel('host', 'host', false, t)).toBe('You');
    expect(getSharedActorLabel('guest', 'host', false, t)).toBe('Opponent');
  });

  it('formats shared UI messages for common effects', () => {
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
      { type: 'TOP_CARD_TO_EX_COMPLETED', actor: 'host', cardName: 'Drive Point' },
      'guest',
      false,
      t
    )).toBe('Opponent moved Drive Point to EX Area');

    expect(formatSharedUiMessage(
      { type: 'SEARCHED_CARD_PLACED', actor: 'host', destination: 'ex', cardName: 'Drive Point' },
      'guest',
      false,
      t
    )).toBe('Opponent added Drive Point from Search to EX Area');

    expect(formatSharedUiMessage(
      { type: 'MAIN_DECK_CARD_TO_CEMETERY', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('Opponent sent Aurelia from Main Deck to Cemetery');

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

    expect(formatSharedUiMessage(
      { type: 'MAIN_DECK_CARD_TO_CEMETERY', actor: 'guest', count: 3, cardNames: ['Aurelia', 'Quickblader', 'Novice Trooper'] },
      'host',
      false,
      t
    )).toBe('Opponent sent 3 cards from Main Deck to Cemetery: Aurelia, Quickblader, Novice Trooper');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_HAND', actor: 'guest', count: 3, cardNames: ['Aurelia', 'Quickblader', 'Novice Trooper'] },
      'host',
      false,
      t
    )).toBe('Opponent added 3 cards from Cemetery to hand: Aurelia, Quickblader, Novice Trooper');

    expect(formatSharedUiMessage(
      { type: 'SEARCHED_CARD_TO_HAND', actor: 'guest', count: 2 },
      'host',
      false,
      t
    )).toBe('Opponent added 2 cards from Search to hand');

    expect(formatSharedUiMessage(
      { type: 'SEARCHED_CARD_PLACED', actor: 'guest', destination: 'field', count: 2, isFaceDown: true },
      'host',
      false,
      t
    )).toBe('Opponent set 2 cards from Search to field');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_PLACED', actor: 'guest', destination: 'ex', count: 2 },
      'host',
      false,
      t
    )).toBe('Opponent added 2 cards from Cemetery to EX Area');

    expect(formatSharedUiMessage(
      { type: 'BANISHED_CARD_TO_HAND', actor: 'guest', count: 3 },
      'host',
      false,
      t
    )).toBe('Opponent added 3 cards from Banish to hand');

    expect(formatSharedUiMessage(
      { type: 'BANISHED_CARD_TO_HAND', actor: 'guest', count: 7, cardNames: ['A', 'B', 'C', 'D', 'E'] },
      'host',
      false,
      t
    )).toBe('Opponent added 7 cards from Banish to hand: A, B, C, D, E, and 2 more');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_BANISH', actor: 'guest', count: 7, cardNames: ['A', 'B', 'C', 'D', 'E'] },
      'host',
      false,
      t
    )).toBe('Opponent banished 7 cards from Cemetery: A, B, C, D, E, and 2 more');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_BOTTOM', actor: 'guest', count: 2, cardNames: ['Aurelia', 'Quickblader'] },
      'host',
      false,
      t
    )).toBe('Opponent sent 2 cards from Cemetery to bottom of deck: Aurelia, Quickblader');

    expect(formatSharedUiMessage(
      { type: 'BANISHED_CARD_TO_BOTTOM', actor: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('Opponent sent Aurelia from Banish to bottom of deck');
  });

  it('adds owner context only when the operator differs from the affected owner', () => {
    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_HAND', actor: 'host', sourceOwner: 'host', destinationOwner: 'host', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe('You added Aurelia from Cemetery to hand');

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_HAND', actor: 'host', sourceOwner: 'guest', destinationOwner: 'guest', cardName: 'Aurelia' },
      'host',
      false,
      t
    )).toBe("You added Aurelia from opponent's Cemetery to opponent's hand");

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_HAND', actor: 'host', sourceOwner: 'guest', destinationOwner: 'guest', cardName: 'Aurelia' },
      'guest',
      false,
      t
    )).toBe('Opponent added Aurelia from your Cemetery to your hand');

    expect(formatSharedUiMessage(
      { type: 'MAIN_DECK_CARD_TO_CEMETERY', actor: 'host', sourceOwner: 'guest', destinationOwner: 'guest', count: 2, cardNames: ['Aurelia', 'Quickblader'] },
      'host',
      false,
      t
    )).toBe("You sent 2 cards from opponent's Main Deck to opponent's Cemetery: Aurelia, Quickblader");

    expect(formatSharedUiMessage(
      { type: 'SEARCHED_CARD_TO_HAND', actor: 'host', sourceOwner: 'guest', destinationOwner: 'guest', count: 2 },
      'host',
      false,
      t
    )).toBe("You added 2 cards from opponent's Main Deck to opponent's hand");

    expect(formatSharedUiMessage(
      { type: 'CEMETERY_CARD_TO_BOTTOM', actor: 'host', sourceOwner: 'guest', destinationOwner: 'guest', count: 2, cardNames: ['Aurelia', 'Quickblader'] },
      'host',
      false,
      t
    )).toBe("You sent 2 cards from opponent's Cemetery to bottom of opponent's deck: Aurelia, Quickblader");
  });

  it('formats reveal messages for look-top, hand, and search effects', () => {
    expect(formatSharedUiMessage(
      { type: 'REVEAL_TOP_DECK_CARDS', actor: 'guest', cards: [] },
      'host',
      false,
      t
    )).toBe('Opponent revealed from Look Top');

    expect(formatSharedUiMessage(
      { type: 'REVEAL_SEARCHED_CARD_TO_HAND', actor: 'host', cardIds: ['card-1'] },
      'guest',
      true,
      t
    )).toBe('Player 1 revealed from Search');

    expect(formatSharedUiMessage(
      { type: 'REVEAL_HAND_CARDS', actor: 'guest', cards: [] },
      'host',
      false,
      t
    )).toBe('Opponent revealed cards from hand');

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
