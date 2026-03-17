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
      expect(result[result.length - 1].id).toBe('top');
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
  });
});
