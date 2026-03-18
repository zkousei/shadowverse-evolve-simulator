import { describe, it, expect } from 'vitest';
import * as CardLogic from './cardLogic';
import type { CardInstance } from '../components/Card';

const createMockCard = (id: string, zone: string, owner: 'host' | 'guest' = 'host'): CardInstance => ({
  id,
  cardId: 'mock-card',
  name: `Card ${id}`,
  image: '',
  owner,
  zone,
  isFlipped: false,
  isTapped: false,
  counters: { atk: 0, hp: 0 }
});

describe('CardLogic utils', () => {
  describe('moveCardToEnd', () => {
    it('should move a card to the end of the array and update its zone', () => {
      const cards: CardInstance[] = [
        createMockCard('1', 'hand-host'),
        createMockCard('2', 'hand-host'),
        createMockCard('3', 'hand-host'),
      ];
      
      const result = CardLogic.moveCardToEnd(cards, '1', { zone: 'field-host' });
      
      expect(result.length).toBe(3);
      expect(result[2].id).toBe('1');
      expect(result[2].zone).toBe('field-host');
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
    });

    it('should carry attachments with the parent card', () => {
      const parent = createMockCard('parent', 'field-host');
      const attachment = { ...createMockCard('attach', 'field-host'), attachedTo: 'parent' };
      const other = createMockCard('other', 'field-host');
      const cards = [parent, attachment, other];

      const result = CardLogic.moveCardToEnd(cards, 'parent', { zone: 'cemetery-host' });

      // Expected order: [other, attachment(updated), parent(updated)]
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('other');
      expect(result[1].id).toBe('attach');
      expect(result[1].zone).toBe('cemetery-host');
      expect(result[2].id).toBe('parent');
      expect(result[2].zone).toBe('cemetery-host');
    });

    it('should carry nested attachments with the parent card', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const grandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child' };
      const other = createMockCard('other', 'field-host');
      const cards = [parent, child, grandchild, other];

      const result = CardLogic.moveCardToEnd(cards, 'parent', { zone: 'cemetery-host' });

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('other');
      expect(result.slice(1).map(c => c.id)).toEqual(['child', 'grandchild', 'parent']);
      expect(result.slice(1).every(c => c.zone === 'cemetery-host')).toBe(true);
    });

    it('should detach nested attachments when preserveAttachment is false', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const grandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child' };
      const cards = [parent, child, grandchild];

      const result = CardLogic.moveCardToEnd(cards, 'parent', {
        zone: 'cemetery-host',
        attachedTo: undefined,
        preserveAttachment: false
      });

      expect(result.every(c => c.zone === 'cemetery-host')).toBe(true);
      expect(result.every(c => c.attachedTo === undefined)).toBe(true);
    });
  });

  describe('moveCardToFront', () => {
    it('should move a card to the front of the array (deck top)', () => {
      const cards: CardInstance[] = [
        createMockCard('1', 'mainDeck-host'),
        createMockCard('2', 'mainDeck-host'),
      ];
      
      const result = CardLogic.moveCardToFront(cards, '2', { zone: 'mainDeck-host', isFlipped: true });
      
      expect(result[0].id).toBe('2');
      expect(result[0].isFlipped).toBe(true);
      expect(result[1].id).toBe('1');
    });

    it('should move nested attachments together when returning to the front', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const grandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child' };
      const other = createMockCard('other', 'mainDeck-host');
      const cards = [other, parent, child, grandchild];

      const result = CardLogic.moveCardToFront(cards, 'parent', { zone: 'mainDeck-host', isFlipped: true });

      expect(result.map(c => c.id)).toEqual(['parent', 'child', 'grandchild', 'other']);
      expect(result.slice(0, 3).every(c => c.zone === 'mainDeck-host')).toBe(true);
      expect(result.slice(0, 3).every(c => c.isFlipped)).toBe(true);
    });

    it('should detach nested attachments when returning a stack to the front', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const grandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child' };
      const cards = [parent, child, grandchild];

      const result = CardLogic.moveCardToFront(cards, 'parent', {
        zone: 'mainDeck-host',
        isFlipped: true,
        attachedTo: undefined,
        preserveAttachment: false
      });

      expect(result.every(c => c.attachedTo === undefined)).toBe(true);
    });
  });

  describe('drawCard', () => {
    it('should remove the first card and move it to hand', () => {
      const cards = [
        createMockCard('top', 'mainDeck-host'),
        createMockCard('bottom', 'mainDeck-host'),
      ];
      
      const result = CardLogic.drawCard(cards, 'host');
      
      expect(result.length).toBe(2);
      const handCard = result.find(c => c.id === 'top');
      expect(handCard?.zone).toBe('hand-host');
      expect(result[result.length - 1].id).toBe('top'); // Added to end
    });

    it('should return same cards if deck is empty', () => {
      const cards = [createMockCard('1', 'field-host')];
      const result = CardLogic.drawCard(cards, 'host');
      expect(result).toEqual(cards);
    });
  });

  describe('executeMulligan', () => {
    it('should replace hand and move old cards to bottom in specified order', () => {
      // Current implementation requires exactly 4 selected IDs
      const deck = [
        createMockCard('d1', 'mainDeck-host'),
        createMockCard('d2', 'mainDeck-host'),
        createMockCard('d3', 'mainDeck-host'),
        createMockCard('d4', 'mainDeck-host'),
        createMockCard('d5', 'mainDeck-host'),
      ];
      const hand = [
        createMockCard('h1', 'hand-host'),
        createMockCard('h2', 'hand-host'),
        createMockCard('h3', 'hand-host'),
        createMockCard('h4', 'hand-host'),
      ];
      const cards = [...deck, ...hand];
      
      const result = CardLogic.executeMulligan(cards, 'host', ['h1', 'h2', 'h3', 'h4']);
      
      const hostCards = result.filter(c => c.owner === 'host');
      const deckCards = hostCards.filter(c => c.zone === 'mainDeck-host');
      const handCards = hostCards.filter(c => c.zone === 'hand-host');

      // Should have drawn 4 new ones: d1, d2, d3, d4
      expect(handCards.length).toBe(4);
      expect(handCards[0].id).toBe('d1');

      // Old hand cards should be at the bottom in the order they were selected
      expect(deckCards[deckCards.length - 4].id).toBe('h1');
      expect(deckCards[deckCards.length - 3].id).toBe('h2');
      expect(deckCards[deckCards.length - 2].id).toBe('h3');
      expect(deckCards[deckCards.length - 1].id).toBe('h4');
    });

    it('should do nothing unless exactly four cards are selected', () => {
      const cards = [
        createMockCard('d1', 'mainDeck-host'),
        createMockCard('d2', 'mainDeck-host'),
        createMockCard('d3', 'mainDeck-host'),
        createMockCard('d4', 'mainDeck-host'),
        createMockCard('h1', 'hand-host'),
        createMockCard('h2', 'hand-host'),
      ];

      const result = CardLogic.executeMulligan(cards, 'host', ['h1', 'h2']);

      expect(result).toBe(cards);
    });
  });

  describe('shuffleDeck', () => {
    it('should maintain the same cards but in a potentially different order', () => {
      const cards = [
        createMockCard('1', 'mainDeck-host'),
        createMockCard('2', 'mainDeck-host'),
        createMockCard('3', 'mainDeck-host'),
        createMockCard('4', 'mainDeck-host'),
        createMockCard('5', 'mainDeck-host'),
      ];
      const result = CardLogic.shuffleDeck(cards, 'host');
      const deckIds = result.filter(c => c.zone === 'mainDeck-host').map(c => c.id);
      
      expect(deckIds.length).toBe(5);
      expect(new Set(deckIds).size).toBe(5);
      // Note: We don't strictly test "shuffled" order in unit tests because 
      // of randomness, but we ensure no cards are lost.
    });
  });

  describe('millCard', () => {
    it('should move the top card to cemetery', () => {
      const cards = [
        createMockCard('top', 'mainDeck-host'),
        createMockCard('bottom', 'mainDeck-host'),
      ];
      const result = CardLogic.millCard(cards, 'host');
      const top = result.find(c => c.id === 'top');
      expect(top?.zone).toBe('cemetery-host');
      expect(result[0].id).toBe('top');
    });

    it('should do nothing if deck is empty', () => {
      const cards = [createMockCard('other', 'hand-host')];
      const result = CardLogic.millCard(cards, 'host');
      expect(result).toEqual(cards);
    });
  });

  describe('getDeckZone', () => {
    it('should return evolveDeck for evolve cards', () => {
      const card = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      expect(CardLogic.getDeckZone(card)).toBe('evolveDeck-host');
    });
    it('should return mainDeck for normal cards', () => {
      const card = createMockCard('n1', 'field-host');
      expect(CardLogic.getDeckZone(card)).toBe('mainDeck-host');
    });
    it('should return leader zone for leader cards', () => {
      const card = { ...createMockCard('leader-1', 'leader-host'), isLeaderCard: true };
      expect(CardLogic.getDeckZone(card)).toBe('leader-host');
    });
  });

  describe('resolveMoveDestination', () => {
    it('should prevent main deck cards from entering evolve deck', () => {
      const card = createMockCard('n1', 'field-host');
      expect(CardLogic.resolveMoveDestination(card, 'evolveDeck-host')).toBe('mainDeck-host');
    });

    it('should prevent evolve cards from entering main deck', () => {
      const card = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      expect(CardLogic.resolveMoveDestination(card, 'mainDeck-host')).toBe('evolveDeck-host');
    });

    it('should return evolve cards to evolve deck when sent to cemetery/banish/hand', () => {
      const card = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      expect(CardLogic.resolveMoveDestination(card, 'cemetery-host')).toBe('evolveDeck-host');
      expect(CardLogic.resolveMoveDestination(card, 'banish-host')).toBe('evolveDeck-host');
      expect(CardLogic.resolveMoveDestination(card, 'hand-host')).toBe('evolveDeck-host');
    });

    it('should keep leader cards in the leader zone regardless of the requested destination', () => {
      const leader = { ...createMockCard('leader-1', 'leader-host'), isLeaderCard: true };

      expect(CardLogic.resolveMoveDestination(leader, 'field-host')).toBe('leader-host');
      expect(CardLogic.resolveMoveDestination(leader, 'hand-host')).toBe('leader-host');
    });
  });

  describe('applyDrop', () => {
    it('should keep main-deck cards in place when dragged onto the evolve deck', () => {
      const mainDeckCard = createMockCard('main-1', 'mainDeck-host');
      const evolveDeckCard = { ...createMockCard('evo-1', 'evolveDeck-host'), isEvolveCard: true };
      const cards = [mainDeckCard, evolveDeckCard];

      const result = CardLogic.applyDrop(cards, 'main-1', 'evo-1');

      expect(result).toBe(cards);
    });

    it('should keep evolve-deck cards in place when dragged onto the main deck', () => {
      const mainDeckCard = createMockCard('main-1', 'mainDeck-host');
      const evolveDeckCard = { ...createMockCard('evo-1', 'evolveDeck-host'), isEvolveCard: true };
      const cards = [mainDeckCard, evolveDeckCard];

      const result = CardLogic.applyDrop(cards, 'evo-1', 'main-1');

      expect(result).toBe(cards);
    });

    it('should route evolve cards dropped on cemetery back to evolve deck', () => {
      const evolve = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      const cemetery = createMockCard('cem', 'cemetery-host');
      const result = CardLogic.applyDrop([evolve, cemetery], 'e1', 'cem');

      const moved = result.find(c => c.id === 'e1');
      expect(moved?.zone).toBe('evolveDeck-host');
      expect(moved?.isFlipped).toBe(false);
    });

    it('should turn cards face-up when moving from a deck to the field by drag and drop', () => {
      const evolve = { ...createMockCard('e1', 'evolveDeck-host'), isEvolveCard: true, isFlipped: true };
      const fieldCard = createMockCard('field-1', 'field-host');

      const result = CardLogic.applyDrop([evolve, fieldCard], 'e1', 'field-1');

      const moved = result.find(c => c.id === 'e1');
      expect(moved?.zone).toBe('field-host');
      expect(moved?.isFlipped).toBe(false);
    });

    it('should reset counters when a field card is dragged to a non-field zone', () => {
      const fieldCard = { ...createMockCard('field-1', 'field-host'), counters: { atk: 2, hp: -1 }, genericCounter: 2 };
      const cemetery = createMockCard('cem', 'cemetery-host');

      const result = CardLogic.applyDrop([fieldCard, cemetery], 'field-1', 'cem');

      expect(result.find(c => c.id === 'field-1')?.counters).toEqual({ atk: 0, hp: 0 });
      expect(result.find(c => c.id === 'field-1')?.genericCounter).toBe(0);
    });

    it('should preserve counters when an ex card is dragged to the field', () => {
      const exCard = { ...createMockCard('ex-1', 'ex-host'), counters: { atk: 2, hp: -1 }, genericCounter: 2 };
      const fieldCard = createMockCard('field-1', 'field-host');

      const result = CardLogic.applyDrop([exCard, fieldCard], 'ex-1', 'field-1');

      expect(result.find(c => c.id === 'ex-1')?.counters).toEqual({ atk: 2, hp: -1 });
      expect(result.find(c => c.id === 'ex-1')?.genericCounter).toBe(2);
    });

    it('should reset counters when an ex card is dragged to a non-field zone', () => {
      const exCard = { ...createMockCard('ex-1', 'ex-host'), counters: { atk: 2, hp: -1 }, genericCounter: 2 };
      const cemetery = createMockCard('cem', 'cemetery-host');

      const result = CardLogic.applyDrop([exCard, cemetery], 'ex-1', 'cem');

      expect(result.find(c => c.id === 'ex-1')?.counters).toEqual({ atk: 0, hp: 0 });
      expect(result.find(c => c.id === 'ex-1')?.genericCounter).toBe(0);
    });

    it('should delete a token when dropped into a safe zone', () => {
      const token = { ...createMockCard('token-1', 'field-host'), cardId: 'token', attachedTo: undefined };
      const deck = createMockCard('deck', 'mainDeck-host');
      const result = CardLogic.applyDrop([token, deck], 'token-1', 'deck');

      expect(result.find(c => c.id === 'token-1')).toBeUndefined();
    });

    it('should delete nested attachments along with a token dropped into a safe zone', () => {
      const token = { ...createMockCard('token-1', 'field-host'), cardId: 'token' };
      const child = { ...createMockCard('child-1', 'field-host'), attachedTo: 'token-1' };
      const grandchild = { ...createMockCard('grandchild-1', 'field-host'), attachedTo: 'child-1' };
      const deck = createMockCard('deck', 'mainDeck-host');

      const result = CardLogic.applyDrop([token, child, grandchild, deck], 'token-1', 'deck');

      expect(result.map(c => c.id)).toEqual(['deck']);
    });

    it('should return attached evolve cards to evolve deck when the base card is dropped onto cemetery', () => {
      const base = createMockCard('base', 'field-host');
      const evolve = { ...createMockCard('evo', 'field-host'), attachedTo: 'base', isEvolveCard: true };
      const cemetery = createMockCard('cem', 'cemetery-host');

      const result = CardLogic.applyDrop([base, evolve, cemetery], 'base', 'cem');

      expect(result.find(c => c.id === 'base')?.zone).toBe('cemetery-host');
      expect(result.find(c => c.id === 'evo')?.zone).toBe('evolveDeck-host');
      expect(result.find(c => c.id === 'evo')?.attachedTo).toBeUndefined();
    });

    it('should prevent moving leader cards or dropping onto leader zones', () => {
      const leaderCard = { ...createMockCard('leader-1', 'leader-host'), isLeaderCard: true };
      const fieldCard = createMockCard('field-1', 'field-host');
      const cards = [leaderCard, fieldCard];

      expect(CardLogic.applyDrop(cards, 'leader-1', 'field-1')).toBe(cards);
      expect(CardLogic.applyDrop(cards, 'field-1', 'leader-1')).toBe(cards);
    });
  });

  describe('leader restrictions', () => {
    it('should ignore counter, tap, flip, and zone operations for leader cards', () => {
      const leaderCard = {
        ...createMockCard('leader-1', 'leader-host'),
        isLeaderCard: true,
        genericCounter: 0,
      };
      const cards = [leaderCard];

      expect(CardLogic.modifyCardCounter(cards, 'leader-1', 'atk', 1)).toBe(cards);
      expect(CardLogic.modifyGenericCounter(cards, 'leader-1', 1)).toBe(cards);
      expect(CardLogic.toggleTapStack(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.toggleFlip(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.sendCardToBottom(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.banishCard(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.sendCardToCemetery(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.returnEvolveCard(cards, 'leader-1')).toBe(cards);
      expect(CardLogic.playCardToField(cards, 'leader-1', 'host')).toBe(cards);
      expect(CardLogic.extractCard(cards, 'leader-1', 'host')).toBe(cards);
    });
  });

  describe('custom token handling', () => {
    it('should remove custom tokens when moved into private zones', () => {
      const token = {
        ...createMockCard('custom-token-1', 'field-host'),
        cardId: 'TK01-001',
        isTokenCard: true,
      };
      const cemetery = createMockCard('cem-1', 'cemetery-host');

      const result = CardLogic.applyDrop([token, cemetery], 'custom-token-1', 'cem-1');

      expect(result).toEqual([cemetery]);
    });

    it('should remove custom tokens on banish, cemetery, and send to bottom', () => {
      const token = {
        ...createMockCard('custom-token-1', 'ex-host'),
        cardId: 'TK01-001',
        isTokenCard: true,
      };
      const cards = [token];

      expect(CardLogic.sendCardToBottom(cards, 'custom-token-1')).toEqual([]);
      expect(CardLogic.banishCard(cards, 'custom-token-1')).toEqual([]);
      expect(CardLogic.sendCardToCemetery(cards, 'custom-token-1')).toEqual([]);
    });
  });

  describe('modifyCardCounter', () => {
    it('should change counters for cards outside the hand', () => {
      const fieldCard = createMockCard('field-1', 'field-host');
      const result = CardLogic.modifyCardCounter([fieldCard], 'field-1', 'atk', 2);
      expect(result[0].counters.atk).toBe(2);
    });

    it('should ignore counter changes for cards in hand', () => {
      const handCard = createMockCard('hand-1', 'hand-host');
      const result = CardLogic.modifyCardCounter([handCard], 'hand-1', 'hp', 1);
      expect(result).toEqual([handCard]);
    });
  });

  describe('modifyGenericCounter', () => {
    it('should change the generic counter for cards in the field or ex area', () => {
      const fieldCard = createMockCard('field-1', 'field-host');
      const result = CardLogic.modifyGenericCounter([fieldCard], 'field-1', 2);
      expect(result[0].genericCounter).toBe(2);
    });

    it('should ignore generic counter changes for cards outside field and ex', () => {
      const handCard = createMockCard('hand-1', 'hand-host');
      const result = CardLogic.modifyGenericCounter([handCard], 'hand-1', 1);
      expect(result).toEqual([handCard]);
    });
  });

  describe('toggleTapStack', () => {
    it('should toggle the entire stack including nested attachments', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const grandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child' };

      const result = CardLogic.toggleTapStack([parent, child, grandchild], 'child');

      expect(result.every(c => c.isTapped)).toBe(true);
    });
  });

  describe('tapStack', () => {
    it('should set the entire stack to tapped without toggling it back', () => {
      const parent = createMockCard('parent', 'field-host');
      const child = { ...createMockCard('child', 'field-host'), attachedTo: 'parent' };
      const alreadyTappedGrandchild = { ...createMockCard('grandchild', 'field-host'), attachedTo: 'child', isTapped: true };

      const result = CardLogic.tapStack([parent, child, alreadyTappedGrandchild], 'child');

      expect(result.every(c => c.isTapped)).toBe(true);
    });
  });

  describe('toggleFlip', () => {
    it('should flip the targeted card only', () => {
      const first = createMockCard('c1', 'field-host');
      const second = createMockCard('c2', 'field-host');

      const result = CardLogic.toggleFlip([first, second], 'c1');

      expect(result.find(c => c.id === 'c1')?.isFlipped).toBe(true);
      expect(result.find(c => c.id === 'c2')?.isFlipped).toBe(false);
    });
  });

  describe('shortcut movement helpers', () => {
    it('should send normal cards to the bottom of their main deck', () => {
      const card = createMockCard('n1', 'field-host');
      const result = CardLogic.sendCardToBottom([card], 'n1');
      expect(result[0].zone).toBe('mainDeck-host');
      expect(result[0].isFlipped).toBe(true);
    });

    it('should return evolve cards to evolve deck when banished', () => {
      const used = { ...createMockCard('used', 'evolveDeck-host'), isEvolveCard: true, isFlipped: false };
      const card = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      const result = CardLogic.banishCard([used, card], 'e1');
      expect(result[0].zone).toBe('evolveDeck-host');
      expect(result[0].id).toBe('e1');
      expect(result[0].isFlipped).toBe(false);
    });

    it('should place newly banished cards on top of the banish stack', () => {
      const oldBanish = createMockCard('old-banish', 'banish-host');
      const card = createMockCard('new-banish', 'field-host');

      const result = CardLogic.banishCard([oldBanish, card], 'new-banish');

      expect(result[0].id).toBe('new-banish');
      expect(result[1].id).toBe('old-banish');
    });

    it('should remove tokens when sending to cemetery', () => {
      const token = { ...createMockCard('t1', 'field-host'), cardId: 'token' };
      const result = CardLogic.sendCardToCemetery([token], 't1');
      expect(result).toEqual([]);
    });

    it('should remove nested attachments when sending a token to the bottom of the deck', () => {
      const token = { ...createMockCard('t1', 'field-host'), cardId: 'token' };
      const child = { ...createMockCard('t2', 'field-host'), attachedTo: 't1' };
      const grandchild = { ...createMockCard('t3', 'field-host'), attachedTo: 't2' };

      const result = CardLogic.sendCardToBottom([token, child, grandchild], 't1');

      expect(result).toEqual([]);
    });

    it('should return attached evolve cards to evolve deck when sending the base card to cemetery', () => {
      const oldCemetery = createMockCard('old-cemetery', 'cemetery-host');
      const oldUsedEvo = { ...createMockCard('old-evo', 'evolveDeck-host'), isEvolveCard: true, isFlipped: false };
      const base = createMockCard('base', 'field-host');
      const evolve = { ...createMockCard('evo', 'field-host'), attachedTo: 'base', isEvolveCard: true };

      const result = CardLogic.sendCardToCemetery([oldCemetery, oldUsedEvo, base, evolve], 'base');

      expect(result.find(c => c.id === 'base')?.zone).toBe('cemetery-host');
      expect(result.find(c => c.id === 'evo')?.zone).toBe('evolveDeck-host');
      expect(result.find(c => c.id === 'evo')?.attachedTo).toBeUndefined();
      expect(result[0].id).toBe('base');
      expect(result[1].id).toBe('evo');
    });

    it('should place newly sent cemetery cards on top of the cemetery stack', () => {
      const oldCemetery = createMockCard('old-cemetery', 'cemetery-host');
      const card = createMockCard('new-cemetery', 'field-host');

      const result = CardLogic.sendCardToCemetery([oldCemetery, card], 'new-cemetery');

      expect(result[0].id).toBe('new-cemetery');
      expect(result[1].id).toBe('old-cemetery');
    });

    it('should place returned evolve cards on top of used evolve cards', () => {
      const used = { ...createMockCard('used', 'evolveDeck-host'), isEvolveCard: true, isFlipped: false };
      const card = { ...createMockCard('returning', 'field-host'), isEvolveCard: true };

      const result = CardLogic.returnEvolveCard([used, card], 'returning');

      expect(result[0].id).toBe('returning');
      expect(result[1].id).toBe('used');
    });

    it('should move cards to field for the acting role', () => {
      const card = createMockCard('n2', 'hand-host');
      const result = CardLogic.playCardToField([card], 'n2', 'guest');
      expect(result[0].zone).toBe('field-guest');
    });

    it('should send main-deck spells from hand to cemetery when played', () => {
      const card = { ...createMockCard('spell-1', 'hand-host'), baseCardType: 'spell' as const };

      const result = CardLogic.playCardToField([card], 'spell-1', 'host');

      expect(result[0].zone).toBe('cemetery-host');
    });

    it('should send main-deck spells from ex to cemetery when played', () => {
      const card = {
        ...createMockCard('spell-ex', 'ex-host'),
        baseCardType: 'spell' as const,
        counters: { atk: 2, hp: -1 },
        genericCounter: 1,
      };

      const result = CardLogic.playCardToField([card], 'spell-ex', 'host');

      expect(result[0].zone).toBe('cemetery-host');
      expect(result[0].counters).toEqual({ atk: 0, hp: 0 });
      expect(result[0].genericCounter).toBe(0);
    });

    it('should still move evolve-deck spells to field', () => {
      const card = {
        ...createMockCard('evo-spell', 'ex-host'),
        baseCardType: 'spell' as const,
        isEvolveCard: true,
      };

      const result = CardLogic.playCardToField([card], 'evo-spell', 'host');

      expect(result[0].zone).toBe('field-host');
    });

    it('should remove token spells when played from ex', () => {
      const card = {
        ...createMockCard('token-spell', 'ex-host'),
        cardId: 'token-spell',
        baseCardType: 'spell' as const,
        isTokenCard: true,
      };

      const result = CardLogic.playCardToField([card], 'token-spell', 'host');

      expect(result).toEqual([]);
    });

    it('should still move token equipment to field', () => {
      const card = {
        ...createMockCard('token-equip', 'ex-host'),
        cardId: 'token-equip',
        baseCardType: 'amulet' as const,
        isTokenCard: true,
      };

      const result = CardLogic.playCardToField([card], 'token-equip', 'host');

      expect(result[0].zone).toBe('field-host');
    });

    it('should preserve counters when moving a card from ex to field', () => {
      const card = { ...createMockCard('ex-field', 'ex-host'), counters: { atk: 3, hp: -2 }, genericCounter: 2 };
      const result = CardLogic.playCardToField([card], 'ex-field', 'host');

      expect(result[0].zone).toBe('field-host');
      expect(result[0].counters).toEqual({ atk: 3, hp: -2 });
      expect(result[0].genericCounter).toBe(2);
    });

    it('should extract evolve cards to field instead of hand', () => {
      const card = { ...createMockCard('e2', 'evolveDeck-host'), isEvolveCard: true };
      const result = CardLogic.extractCard([card], 'e2', 'host', 'hand-host');
      expect(result[0].zone).toBe('evolveDeck-host');
    });
  });

  describe('setup and deck helpers', () => {
    it('should clamp player stat values safely', () => {
      expect(CardLogic.modifyPlayerStatValue(9, 9, 'maxPp', 5)).toBe(10);
      expect(CardLogic.modifyPlayerStatValue(5, 4, 'pp', 3)).toBe(4);
      expect(CardLogic.modifyPlayerStatValue(0, 0, 'hp', -3)).toBe(0);
    });

    it('should draw an initial hand of four cards', () => {
      const cards = ['1', '2', '3', '4', '5'].map(id => createMockCard(id, 'mainDeck-host'));
      const result = CardLogic.drawInitialHand(cards, 'host');
      expect(result.filter(c => c.zone === 'hand-host')).toHaveLength(4);
      expect(result.filter(c => c.zone === 'mainDeck-host')).toHaveLength(1);
    });

    it('should do nothing when there are fewer than four cards left in the deck', () => {
      const cards = ['1', '2', '3'].map(id => createMockCard(id, 'mainDeck-host'));

      const result = CardLogic.drawInitialHand(cards, 'host');

      expect(result).toBe(cards);
    });

    it('should replace only the actor cards on import', () => {
      const hostOld = createMockCard('old-host', 'mainDeck-host');
      const guestOld = createMockCard('old-guest', 'mainDeck-guest', 'guest');
      const imported = [createMockCard('new-host', 'mainDeck-host')];
      const result = CardLogic.importDeckCards([hostOld, guestOld], 'host', imported);
      expect(result.find(c => c.id === 'old-host')).toBeUndefined();
      expect(result.find(c => c.id === 'old-guest')).toBeDefined();
      expect(result.find(c => c.id === 'new-host')).toBeDefined();
    });

    it('should append spawned tokens', () => {
      const existing = createMockCard('base', 'field-host');
      const token = { ...createMockCard('token-1', 'ex-host'), cardId: 'token' };
      const result = CardLogic.spawnTokenCard([existing], token);
      expect(result).toHaveLength(2);
      expect(result[1].id).toBe('token-1');
    });
  });

  describe('resolveTopDeckResults', () => {
    it('should handle empty results array', () => {
      const cards = [createMockCard('1', 'mainDeck-host')];
      const result = CardLogic.resolveTopDeckResults(cards, 'host', []);
      expect(result).toEqual(cards);
    });

    it('should move cards to correct zones and maintain "Rightmost" order for non-deck zones', () => {
      const existingHand = createMockCard('existing', 'hand-host');
      const deckCard = createMockCard('top1', 'mainDeck-host');
      const cards = [existingHand, deckCard];

      const results: CardLogic.TopDeckResult[] = [
        { cardId: 'top1', action: 'hand' }
      ];

      const result = CardLogic.resolveTopDeckResults(cards, 'host', results);

      const handCards = result.filter(c => c.zone === 'hand-host');
      expect(handCards.length).toBe(2);
      expect(handCards[0].id).toBe('existing');
      expect(handCards[1].id).toBe('top1'); // Should be at the end (right)
    });

    it('should move revealed-hand cards into the hidden hand zone', () => {
      const existingHand = createMockCard('existing', 'hand-host');
      const deckCard = createMockCard('top1', 'mainDeck-host');
      const cards = [existingHand, deckCard];

      const results: CardLogic.TopDeckResult[] = [
        { cardId: 'top1', action: 'revealedHand' }
      ];

      const result = CardLogic.resolveTopDeckResults(cards, 'host', results);

      const handCards = result.filter(c => c.zone === 'hand-host');
      expect(handCards).toHaveLength(2);
      expect(handCards[1].id).toBe('top1');
    });

    it('should route evolve cards to evolveDeck even if action is top/bottom', () => {
      const evolveCard = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      const results: CardLogic.TopDeckResult[] = [
        { cardId: 'e1', action: 'bottom' }
      ];
      const result = CardLogic.resolveTopDeckResults([evolveCard], 'host', results);
      expect(result[0].zone).toBe('evolveDeck-host');
    });
  });

  describe('applyStateWithGuards', () => {
    it('should prevent duplicate IDs by keeping the FIRST one', () => {
      const cards = [
        createMockCard('dup', 'field-host'),
        createMockCard('other', 'hand-host'),
        { ...createMockCard('dup', 'hand-host'), name: 'Newer' },
      ];
      
      const result = CardLogic.applyStateWithGuards(cards);
      
      expect(result.length).toBe(2);
      const dup = result.find(c => c.id === 'dup');
      // Our implementation currently keeps the FIRST found ID
      expect(dup?.zone).toBe('field-host');
      expect(dup?.name).toBe('Card dup');
    });

    it('should not change flip state while deduplicating', () => {
      const cards = [
        { ...createMockCard('field-hidden', 'field-host'), isFlipped: true },
        { ...createMockCard('deck-hidden', 'mainDeck-host'), isFlipped: true },
      ];

      const result = CardLogic.applyStateWithGuards(cards);

      expect(result.find(c => c.id === 'field-hidden')?.isFlipped).toBe(true);
      expect(result.find(c => c.id === 'deck-hidden')?.isFlipped).toBe(true);
    });
  });

  describe('normalizeCardsForGameState', () => {
    it('should force field cards face-up only while playing', () => {
      const cards = [
        { ...createMockCard('field-hidden', 'field-host'), isFlipped: true },
        { ...createMockCard('deck-hidden', 'mainDeck-host'), isFlipped: true },
      ];

      const preparing = CardLogic.normalizeCardsForGameState(cards, 'preparing');
      expect(preparing.find(c => c.id === 'field-hidden')?.isFlipped).toBe(true);

      const playing = CardLogic.normalizeCardsForGameState(cards, 'playing');
      expect(playing.find(c => c.id === 'field-hidden')?.isFlipped).toBe(false);
      expect(playing.find(c => c.id === 'deck-hidden')?.isFlipped).toBe(true);
    });

    it('should not modify face-down cards outside the field while playing', () => {
      const cards = [
        { ...createMockCard('ex-hidden', 'ex-host'), isFlipped: true },
        { ...createMockCard('cem-hidden', 'cemetery-host'), isFlipped: true },
      ];

      const playing = CardLogic.normalizeCardsForGameState(cards, 'playing');

      expect(playing.find(c => c.id === 'ex-hidden')?.isFlipped).toBe(true);
      expect(playing.find(c => c.id === 'cem-hidden')?.isFlipped).toBe(true);
    });
  });
});
