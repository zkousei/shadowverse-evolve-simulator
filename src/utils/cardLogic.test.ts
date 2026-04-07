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

    it('should carry linked cards with the parent card and clear their link outside the field', () => {
      const parent = createMockCard('parent', 'field-host');
      const linked = { ...createMockCard('linked', 'field-host'), linkedTo: 'parent', isEvolveCard: true };
      const other = createMockCard('other', 'field-host');
      const cards = [parent, linked, other];

      const result = CardLogic.moveCardToEnd(cards, 'parent', { zone: 'cemetery-host' });

      expect(result.map(c => c.id)).toEqual(['other', 'parent', 'linked']);
      expect(result[1].zone).toBe('cemetery-host');
      expect(result[2].zone).toBe('evolveDeck-host');
      expect(result[2].linkedTo).toBeUndefined();
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

    it('should keep linked cards with the parent card when moving within the field', () => {
      const parent = createMockCard('parent', 'field-host');
      const linked = { ...createMockCard('linked', 'field-host'), linkedTo: 'parent', isEvolveCard: true };
      const cards = [parent, linked];

      const result = CardLogic.moveCardToFront(cards, 'parent', { zone: 'field-host' });
      const movedLinked = result.find(c => c.id === 'linked');

      expect(result.map(c => c.id)).toEqual(['parent', 'linked']);
      expect(movedLinked?.zone).toBe('field-host');
      expect(movedLinked?.linkedTo).toBe('parent');
    });
  });

  describe('linkCardToField', () => {
    it('moves a special card onto the field and links it to the target root card', () => {
      const source = {
        ...createMockCard('special', 'evolveDeck-host'),
        cardId: 'BPV-001',
        isEvolveCard: true,
      };
      const parent = {
        ...createMockCard('parent', 'field-host'),
        isTapped: true,
      };

      const result = CardLogic.linkCardToField([source, parent], 'special', 'parent');
      const linked = result.find(card => card.id === 'special');

      expect(linked).toMatchObject({
        zone: 'field-host',
        linkedTo: 'parent',
        attachedTo: undefined,
        isTapped: true,
        isFlipped: false,
      });
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

  describe('moveTopCardToEx', () => {
    it('should move the top card to ex', () => {
      const cards = [
        createMockCard('top', 'mainDeck-host'),
        createMockCard('bottom', 'mainDeck-host'),
      ];

      const result = CardLogic.moveTopCardToEx(cards, 'host');
      const top = result.find(c => c.id === 'top');

      expect(top?.zone).toBe('ex-host');
      expect(result[result.length - 1].id).toBe('top');
    });

    it('should return pure evolve cards to evolve deck when moving top card to ex', () => {
      const cards = [
        {
          ...createMockCard('top', 'mainDeck-host'),
          isEvolveCard: true,
          cardKindNormalized: 'evolve_follower',
        },
      ];

      const result = CardLogic.moveTopCardToEx(cards, 'host');
      expect(result.find(c => c.id === 'top')?.zone).toBe('evolveDeck-host');
    });

    it('should allow advance cards to stay in ex when moving top card to ex', () => {
      const cards = [
        {
          ...createMockCard('top', 'mainDeck-host'),
          isEvolveCard: true,
          cardKindNormalized: 'advance_follower',
        },
      ];

      const result = CardLogic.moveTopCardToEx(cards, 'host');
      expect(result.find(c => c.id === 'top')?.zone).toBe('ex-host');
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

    it('should return non-advance evolve cards to evolve deck when sent to ex', () => {
      const card = {
        ...createMockCard('e1', 'field-host'),
        isEvolveCard: true,
        cardKindNormalized: 'evolve_follower',
      };

      expect(CardLogic.resolveMoveDestination(card, 'ex-host')).toBe('evolveDeck-host');
    });

    it('should allow advance cards to stay in ex', () => {
      const card = {
        ...createMockCard('adv-1', 'field-host'),
        isEvolveCard: true,
        cardKindNormalized: 'advance_follower',
      };

      expect(CardLogic.resolveMoveDestination(card, 'ex-host')).toBe('ex-host');
    });

    it('should keep leader cards in the leader zone regardless of the requested destination', () => {
      const leader = { ...createMockCard('leader-1', 'leader-host'), isLeaderCard: true };

      expect(CardLogic.resolveMoveDestination(leader, 'field-host')).toBe('leader-host');
      expect(CardLogic.resolveMoveDestination(leader, 'hand-host')).toBe('leader-host');
    });
  });

  describe('tap sync with linked cards', () => {
    it('toggles tap on linked cards together with the stack root', () => {
      const parent = createMockCard('parent', 'field-host');
      const evolve = { ...createMockCard('evolve', 'field-host'), attachedTo: 'parent', isEvolveCard: true };
      const linked = { ...createMockCard('linked', 'field-host'), linkedTo: 'parent', isEvolveCard: true };

      const result = CardLogic.toggleTapStack([parent, evolve, linked], 'parent');

      expect(result.find(c => c.id === 'parent')?.isTapped).toBe(true);
      expect(result.find(c => c.id === 'evolve')?.isTapped).toBe(true);
      expect(result.find(c => c.id === 'linked')?.isTapped).toBe(true);
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

    it('should leave invalid non-evolve attachments on the field when an evolve root is dropped onto cemetery', () => {
      const evolveRoot = { ...createMockCard('e1', 'field-host'), isEvolveCard: true };
      const invalidTop = { ...createMockCard('main-top', 'field-host'), attachedTo: 'e1' };
      const cemetery = createMockCard('cem', 'cemetery-host');

      const result = CardLogic.applyDrop([evolveRoot, invalidTop, cemetery], 'e1', 'cem');

      expect(result.find(c => c.id === 'e1')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'main-top')).toMatchObject({
        zone: 'field-host',
        attachedTo: undefined,
      });
    });

    it('should turn cards face-up when moving from a deck to the field by drag and drop', () => {
      const evolve = { ...createMockCard('e1', 'evolveDeck-host'), isEvolveCard: true, isFlipped: true };
      const fieldCard = createMockCard('field-1', 'field-host');

      const result = CardLogic.applyDrop([evolve, fieldCard], 'e1', 'field-1');

      const moved = result.find(c => c.id === 'e1');
      expect(moved?.zone).toBe('field-host');
      expect(moved?.isFlipped).toBe(false);
    });

    it('should sync the whole stack to the top card tap state when stacking onto a rested card', () => {
      const restedBase = { ...createMockCard('base', 'field-host'), isTapped: true };
      const standingTop = { ...createMockCard('top', 'field-host'), isTapped: false };

      const result = CardLogic.applyDrop([restedBase, standingTop], 'top', 'base');

      expect(result.find(c => c.id === 'base')?.isTapped).toBe(false);
      expect(result.find(c => c.id === 'top')?.isTapped).toBe(false);
      expect(result.find(c => c.id === 'top')?.attachedTo).toBe('base');
    });

    it('should sync the whole stack to the top card tap state when stacking a rested card onto a standing card', () => {
      const standingBase = { ...createMockCard('base', 'field-host'), isTapped: false };
      const restedTop = { ...createMockCard('top', 'field-host'), isTapped: true };

      const result = CardLogic.applyDrop([standingBase, restedTop], 'top', 'base');

      expect(result.find(c => c.id === 'base')?.isTapped).toBe(true);
      expect(result.find(c => c.id === 'top')?.isTapped).toBe(true);
    });

    it('should reset counters when a field card is dragged to a non-field zone', () => {
      const fieldCard = { ...createMockCard('field-1', 'field-host'), counters: { atk: 2, hp: -1 }, genericCounter: 2 };
      const cemetery = createMockCard('cem', 'cemetery-host');

      const result = CardLogic.applyDrop([fieldCard, cemetery], 'field-1', 'cem');

      expect(result.find(c => c.id === 'field-1')?.counters).toEqual({ atk: 0, hp: 0 });
      expect(result.find(c => c.id === 'field-1')?.genericCounter).toBe(0);
    });

    it('should untap a rested field card when dragged to the ex area', () => {
      const fieldCard = {
        ...createMockCard('field-1', 'field-host'),
        isTapped: true,
        counters: { atk: 2, hp: -1 },
        genericCounter: 2
      };
      const exCard = createMockCard('ex-1', 'ex-host');

      const result = CardLogic.applyDrop([fieldCard, exCard], 'field-1', 'ex-1');

      expect(result.find(c => c.id === 'field-1')?.zone).toBe('ex-host');
      expect(result.find(c => c.id === 'field-1')?.isTapped).toBe(false);
      expect(result.find(c => c.id === 'field-1')?.counters).toEqual({ atk: 0, hp: 0 });
      expect(result.find(c => c.id === 'field-1')?.genericCounter).toBe(0);
    });

    it('should detach the whole stack when a field stack is dragged to the ex area', () => {
      const base = createMockCard('base', 'field-host');
      const top = { ...createMockCard('top', 'field-host'), attachedTo: 'base' };
      const nested = { ...createMockCard('nested', 'field-host'), attachedTo: 'top' };
      const exCard = createMockCard('ex-1', 'ex-host');

      const result = CardLogic.applyDrop([base, top, nested, exCard], 'base', 'ex-1');

      expect(result.find(c => c.id === 'base')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'top')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'nested')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
    });

    it('should return non-advance evolve cards to evolve deck when a stack is moved to the ex area', () => {
      const base = createMockCard('base', 'field-host');
      const evolve = {
        ...createMockCard('evo', 'field-host'),
        attachedTo: 'base',
        isEvolveCard: true,
        cardKindNormalized: 'evolve_follower',
      };
      const exCard = createMockCard('ex-1', 'ex-host');

      const result = CardLogic.applyDrop([base, evolve, exCard], 'base', 'ex-1');

      expect(result.find(c => c.id === 'base')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'evo')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
      });
    });

    it('should still allow advance cards to move to the ex area', () => {
      const advance = {
        ...createMockCard('advance', 'field-host'),
        isEvolveCard: true,
        cardKindNormalized: 'advance_follower',
      };
      const exCard = createMockCard('ex-1', 'ex-host');

      const result = CardLogic.applyDrop([advance, exCard], 'advance', 'ex-1');

      expect(result.find(c => c.id === 'advance')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
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

    it('should move non-token descendants to resolved zones when a token is dropped into a safe zone', () => {
      const token = { ...createMockCard('token-1', 'field-host'), cardId: 'token' };
      const child = { ...createMockCard('child-1', 'field-host'), attachedTo: 'token-1' };
      const grandchild = { ...createMockCard('grandchild-1', 'field-host'), attachedTo: 'child-1', isEvolveCard: true };
      const deck = createMockCard('deck', 'mainDeck-host');

      const result = CardLogic.applyDrop([token, child, grandchild, deck], 'token-1', 'deck');

      expect(result.find(c => c.id === 'token-1')).toBeUndefined();
      expect(result.find(c => c.id === 'child-1')).toMatchObject({
        zone: 'mainDeck-host',
        attachedTo: undefined,
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
        genericCounter: 0,
      });
      expect(result.find(c => c.id === 'grandchild-1')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        genericCounter: 0,
      });
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

    it('clears linkedTo when a linked card is dragged back onto the field zone', () => {
      const linked = {
        ...createMockCard('linked', 'field-host'),
        linkedTo: 'parent',
        isEvolveCard: true,
      };
      const parent = createMockCard('parent', 'field-host');

      const result = CardLogic.applyDrop([linked, parent], 'linked', 'field-host');

      expect(result.find(c => c.id === 'linked')).toMatchObject({
        zone: 'field-host',
        linkedTo: undefined,
      });
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

    it('should move non-token descendants to their natural decks when sending a token to the bottom of the deck', () => {
      const token = { ...createMockCard('t1', 'field-host'), cardId: 'token' };
      const child = { ...createMockCard('t2', 'field-host'), attachedTo: 't1' };
      const grandchild = { ...createMockCard('t3', 'field-host'), attachedTo: 't2', isEvolveCard: true };

      const result = CardLogic.sendCardToBottom([token, child, grandchild], 't1');

      expect(result.find(c => c.id === 't1')).toBeUndefined();
      expect(result.find(c => c.id === 't2')).toMatchObject({
        zone: 'mainDeck-host',
        attachedTo: undefined,
        isFlipped: true,
      });
      expect(result.find(c => c.id === 't3')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
        isFlipped: false,
      });
    });

    it('should move non-token descendants toward the requested zone when sending a token to cemetery', () => {
      const token = { ...createMockCard('token-root', 'field-host'), cardId: 'token' };
      const base = {
        ...createMockCard('base', 'field-host'),
        attachedTo: 'token-root',
        counters: { atk: 2, hp: -1 },
        genericCounter: 3,
        isTapped: true,
      };
      const evolve = {
        ...createMockCard('evo', 'field-host'),
        attachedTo: 'base',
        isEvolveCard: true,
        counters: { atk: 1, hp: 2 },
        genericCounter: 1,
        isTapped: true,
      };

      const result = CardLogic.sendCardToCemetery([token, base, evolve], 'token-root');

      expect(result.find(c => c.id === 'token-root')).toBeUndefined();
      expect(result.find(c => c.id === 'base')).toMatchObject({
        zone: 'cemetery-host',
        attachedTo: undefined,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        genericCounter: 0,
      });
      expect(result.find(c => c.id === 'evo')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        genericCounter: 0,
      });
    });

    it('should send opposing non-token descendants to their owner private zones when sending a token to cemetery', () => {
      const token = { ...createMockCard('token-root', 'field-host', 'host'), cardId: 'token' };
      const opposingFollower = {
        ...createMockCard('opposing-follower', 'field-host', 'guest'),
        attachedTo: 'token-root',
      };

      const result = CardLogic.sendCardToCemetery([token, opposingFollower], 'token-root');

      expect(result.find(c => c.id === 'token-root')).toBeUndefined();
      expect(result.find(c => c.id === 'opposing-follower')).toMatchObject({
        zone: 'cemetery-guest',
        attachedTo: undefined,
        linkedTo: undefined,
      });
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

    it('should send opposing attached cards to their owner private zones when sending a base card to cemetery', () => {
      const base = createMockCard('base', 'field-host', 'host');
      const opposingFollower = {
        ...createMockCard('opposing-follower', 'field-host', 'guest'),
        attachedTo: 'base',
      };

      const result = CardLogic.sendCardToCemetery([base, opposingFollower], 'base');

      expect(result.find(c => c.id === 'base')).toMatchObject({
        zone: 'cemetery-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'opposing-follower')).toMatchObject({
        zone: 'cemetery-guest',
        attachedTo: undefined,
      });
    });

    it('should send opposing attached cards to their owner private zones when banishing a base card', () => {
      const base = createMockCard('base', 'field-host', 'host');
      const opposingFollower = {
        ...createMockCard('opposing-follower', 'field-host', 'guest'),
        attachedTo: 'base',
      };

      const result = CardLogic.banishCard([base, opposingFollower], 'base');

      expect(result.find(c => c.id === 'base')).toMatchObject({
        zone: 'banish-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'opposing-follower')).toMatchObject({
        zone: 'banish-guest',
        attachedTo: undefined,
      });
    });

    it('should leave invalid non-evolve attachments on the field when sending an evolve root to cemetery', () => {
      const evolveRoot = { ...createMockCard('evo-root', 'field-host'), isEvolveCard: true };
      const invalidTop = {
        ...createMockCard('main-top', 'field-host'),
        attachedTo: 'evo-root',
        counters: { atk: 2, hp: -1 },
        genericCounter: 1,
        isTapped: true,
      };

      const result = CardLogic.sendCardToCemetery([evolveRoot, invalidTop], 'evo-root');

      expect(result.find(c => c.id === 'evo-root')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
      });
      expect(result.find(c => c.id === 'main-top')).toMatchObject({
        zone: 'field-host',
        attachedTo: undefined,
        counters: { atk: 2, hp: -1 },
        genericCounter: 1,
        isTapped: true,
      });
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

    it('should attach an extracted evolve card to the chosen field card and inherit its tap state', () => {
      const base = { ...createMockCard('base', 'field-host'), isTapped: true };
      const evolve = { ...createMockCard('evo', 'evolveDeck-host'), isEvolveCard: true };

      const result = CardLogic.extractCardToFieldAttachment([base, evolve], 'evo', 'host', 'base');

      expect(result.find(card => card.id === 'evo')).toMatchObject({
        zone: 'field-host',
        attachedTo: 'base',
        isTapped: true,
      });
      expect(result.find(card => card.id === 'base')?.isTapped).toBe(true);
    });

    it('should detach attachments when extracting a stack into the ex area', () => {
      const base = createMockCard('base', 'field-host');
      const top = { ...createMockCard('top', 'field-host'), attachedTo: 'base' };

      const result = CardLogic.extractCard([base, top], 'base', 'host', 'ex-host');

      expect(result.find(card => card.id === 'base')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
      expect(result.find(card => card.id === 'top')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
    });

    it('should return non-advance evolve cards to evolve deck when extracting them to ex', () => {
      const card = {
        ...createMockCard('evo', 'field-host'),
        isEvolveCard: true,
        cardKindNormalized: 'evolve_spell',
      };

      const result = CardLogic.extractCard([card], 'evo', 'host', 'ex-host');

      expect(result.find(found => found.id === 'evo')).toMatchObject({
        zone: 'evolveDeck-host',
        attachedTo: undefined,
      });
    });

    it('should still allow advance cards to be extracted to ex', () => {
      const card = {
        ...createMockCard('advance', 'field-host'),
        isEvolveCard: true,
        cardKindNormalized: 'advance_spell',
      };

      const result = CardLogic.extractCard([card], 'advance', 'host', 'ex-host');

      expect(result.find(found => found.id === 'advance')).toMatchObject({
        zone: 'ex-host',
        attachedTo: undefined,
      });
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

    it('should append multiple spawned tokens in order', () => {
      const existing = createMockCard('base', 'field-host');
      const tokens = [
        { ...createMockCard('token-1', 'ex-host'), cardId: 'token-alpha' },
        { ...createMockCard('token-2', 'field-host'), cardId: 'token-beta' },
      ];
      const result = CardLogic.spawnTokenCards([existing], tokens);
      expect(result).toHaveLength(3);
      expect(result[1].id).toBe('token-1');
      expect(result[2].id).toBe('token-2');
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

    it('should preserve valid attached and linked relations on the field', () => {
      const base = createMockCard('base', 'field-host');
      const attached = { ...createMockCard('attached', 'field-host'), attachedTo: 'base' };
      const linked = { ...createMockCard('linked', 'field-host'), linkedTo: 'base' };

      const result = CardLogic.applyStateWithGuards([base, attached, linked]);

      expect(result.find(c => c.id === 'attached')?.attachedTo).toBe('base');
      expect(result.find(c => c.id === 'linked')?.linkedTo).toBe('base');
    });

    it('should clear relations that remain outside the field', () => {
      const exParent = createMockCard('ex-parent', 'ex-host');
      const exAttached = { ...createMockCard('ex-attached', 'ex-host'), attachedTo: 'ex-parent' };
      const cemeteryParent = createMockCard('cem-parent', 'cemetery-host');
      const cemeteryLinked = { ...createMockCard('cem-linked', 'cemetery-host'), linkedTo: 'cem-parent' };

      const result = CardLogic.applyStateWithGuards([exParent, exAttached, cemeteryParent, cemeteryLinked]);

      expect(result.find(c => c.id === 'ex-attached')?.attachedTo).toBeUndefined();
      expect(result.find(c => c.id === 'cem-linked')?.linkedTo).toBeUndefined();
    });

    it('should clear missing and cyclic parent references', () => {
      const orphan = { ...createMockCard('orphan', 'field-host'), attachedTo: 'missing-parent' };
      const cycleA = { ...createMockCard('cycle-a', 'field-host'), attachedTo: 'cycle-b' };
      const cycleB = { ...createMockCard('cycle-b', 'field-host'), attachedTo: 'cycle-a' };

      const result = CardLogic.applyStateWithGuards([orphan, cycleA, cycleB]);

      expect(result.find(c => c.id === 'orphan')?.attachedTo).toBeUndefined();
      expect(result.find(c => c.id === 'cycle-a')?.attachedTo).toBeUndefined();
      expect(result.find(c => c.id === 'cycle-b')?.attachedTo).toBeUndefined();
    });

    it('should prefer attachedTo when both relation fields are present', () => {
      const base = createMockCard('base', 'field-host');
      const card = {
        ...createMockCard('dual', 'field-host'),
        attachedTo: 'base',
        linkedTo: 'base',
      };

      const result = CardLogic.applyStateWithGuards([base, card]);

      expect(result.find(c => c.id === 'dual')).toMatchObject({
        attachedTo: 'base',
        linkedTo: undefined,
      });
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
