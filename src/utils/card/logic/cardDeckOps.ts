import type { CardInstance } from '../../../components/Card';
import {
  banishCard,
  getDeckZone,
  moveCardToEnd,
  moveCardToFront,
  sendCardToCemetery,
} from './cardMovement';

export interface TopDeckResult {
  cardId: string;
  action: 'hand' | 'revealedHand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';
  order?: number;
}

/**
 * Executes a draw operation.
 */
export const drawCard = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  if (myDeck.length === 0) return cards;

  const topCard = myDeck[0];
  return moveCardToEnd(cards, topCard.id, {
    zone: `hand-${role}`,
    isFlipped: false,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    isTapped: false,
    attachedTo: undefined,
  });
};

/**
 * Shuffles the player's main deck.
 */
export const shuffleDeck = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  const otherCards = cards.filter(c => c.zone !== `mainDeck-${role}`);

  // Fischer-Yates or simple sort for now to match current behavior
  const shuffled = [...myDeck].sort(() => Math.random() - 0.5);

  return [...otherCards, ...shuffled];
};

/**
 * Moves the top card of the main deck to the cemetery.
 */
export const millCard = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  if (myDeck.length === 0) return cards;

  const topCard = myDeck[0];
  return moveCardToFront(cards, topCard.id, {
    zone: `cemetery-${role}`,
    isFlipped: false,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    isTapped: false,
    attachedTo: undefined,
  });
};

/**
 * Moves the top card of the main deck to the EX area.
 */
export const moveTopCardToEx = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  if (myDeck.length === 0) return cards;

  const topCard = myDeck[0];
  return moveCardToEnd(cards, topCard.id, {
    zone: `ex-${role}`,
    isFlipped: false,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    isTapped: false,
    attachedTo: undefined,
    preserveAttachment: false,
  });
};

/**
 * Moves the top card of the main deck face up to the banish area.
 */
export const moveTopCardToBanish = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const topCard = cards.find(c => c.zone === `mainDeck-${role}`);
  if (!topCard) return cards;

  return banishCard(cards, topCard.id);
};

const getRandomArrayIndex = (
  length: number,
  random: () => number
): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(length - 1, Math.max(0, Math.floor(value * length)));
};

export const discardRandomHandCards = (
  cards: CardInstance[],
  targetRole: 'host' | 'guest',
  count: number,
  random: () => number = Math.random
): CardInstance[] => {
  if (!Number.isFinite(count)) return cards;
  const discardCount = Math.max(0, Math.floor(count));
  if (discardCount === 0) return cards;

  const handCards = cards.filter(card => card.zone === `hand-${targetRole}`);
  if (handCards.length === 0) return cards;

  const selectedCount = Math.min(discardCount, handCards.length);
  const shuffledHandCards = [...handCards];

  for (let index = shuffledHandCards.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomArrayIndex(index + 1, random);
    [shuffledHandCards[index], shuffledHandCards[swapIndex]] = [shuffledHandCards[swapIndex], shuffledHandCards[index]];
  }

  return shuffledHandCards
    .slice(0, selectedCount)
    .reduce((nextCards, card) => sendCardToCemetery(nextCards, card.id), cards);
};

export const drawInitialHand = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  if (myDeck.length < 4) return cards;

  const drawnCards = myDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false, linkedTo: undefined }));
  const drawnIds = new Set(drawnCards.map(c => c.id));
  const otherCards = cards.filter(c => !drawnIds.has(c.id));
  return [...otherCards, ...drawnCards];
};

/**
 * Executes a mulligan operation based on selected IDs.
 */
export const executeMulligan = (
  cards: CardInstance[],
  role: 'host' | 'guest',
  selectedIds: string[]
): CardInstance[] => {
  if (selectedIds.length !== 4) return cards;

  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  const restOfDeck = myDeck.filter(c => !selectedIds.includes(c.id));

  // 1. Prepare returned cards (Ordered by selection)
  const returnedCards = selectedIds.map(id => {
    const card = cards.find(c => c.id === id)!;
    return { ...card, zone: getDeckZone(card), isFlipped: true, isTapped: false, attachedTo: undefined, linkedTo: undefined };
  });

  // 2. Draw 4 new ones
  const newHandCards = restOfDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false, linkedTo: undefined }));

  // 3. Remaining
  const remainingDeckCards = restOfDeck.slice(4);

  // 4. Others
  const otherCards = cards.filter(c => c.owner !== role || (c.zone !== `mainDeck-${role}` && c.zone !== `hand-${role}`));

  return [...otherCards, ...newHandCards, ...remainingDeckCards, ...returnedCards];
};

/**
 * Resolves results from TopDeckModal.
 */
export const resolveTopDeckResults = (
  cards: CardInstance[],
  role: 'host' | 'guest',
  results: TopDeckResult[]
): CardInstance[] => {
  const resultIds = results.map(r => r.cardId);
  const otherCards = cards.filter(c => !resultIds.includes(c.id));

  const processedCards = results.map(res => {
    const card = cards.find(c => c.id === res.cardId)!;
    let zone = '';
    switch (res.action) {
      case 'hand': zone = `hand-${role}`; break;
      case 'revealedHand': zone = `hand-${role}`; break;
      case 'field': zone = `field-${role}`; break;
      case 'ex': zone = `ex-${role}`; break;
      case 'cemetery': zone = `cemetery-${role}`; break;
      case 'top':
      case 'bottom':
        zone = getDeckZone(card);
        break;
    }
    return { ...card, zone, isFlipped: (res.action === 'top' || res.action === 'bottom'), linkedTo: undefined };
  });

  const topCards = results.filter(r => r.action === 'top').sort((a, b) => (a.order || 0) - (b.order || 0)).map(r => processedCards.find(pc => pc.id === r.cardId)!);
  const bottomCards = results.filter(r => r.action === 'bottom').sort((a, b) => (a.order || 0) - (b.order || 0)).map(r => processedCards.find(pc => pc.id === r.cardId)!);
  const cemeteryCards = processedCards.filter(pc => pc.zone === `cemetery-${role}`);
  const sideCards = processedCards.filter(pc => pc.zone !== `mainDeck-${role}` && pc.zone !== `cemetery-${role}`);

  const myDeckRemaining = otherCards.filter(c => c.zone === `mainDeck-${role}`);
  const nonMyDeck = otherCards.filter(c => c.zone !== `mainDeck-${role}`);
  const existingCemeteryCards = nonMyDeck.filter(c => c.zone === `cemetery-${role}`);
  const otherZoneCards = nonMyDeck.filter(c => c.zone !== `cemetery-${role}`);

  return [
    ...cemeteryCards,
    ...otherZoneCards,
    ...existingCemeteryCards,
    ...sideCards,
    ...topCards,
    ...myDeckRemaining,
    ...bottomCards
  ];
};
