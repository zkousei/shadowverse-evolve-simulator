import type { CardInstance } from '../components/Card';

/**
 * Pure logic for card state transitions.
 * These functions should be easily testable without React context.
 */

export interface MoveCardOptions {
  zone?: string;
  isFlipped?: boolean;
  isTapped?: boolean;
  attachedTo?: string;
  counters?: { atk: number; hp: number };
}

/**
 * Moves a card to a new zone and places it at the END of the array (Rightmost/Bottom).
 * This is used for Field, Hand, EX Area, Cemetery, Banish, and Bottom of Deck.
 */
export const moveCardToEnd = (
  cards: CardInstance[],
  cardId: string,
  options: MoveCardOptions
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  const otherCards = cards.filter(c => c.id !== cardId && c.attachedTo !== cardId);
  const attachments = cards.filter(c => c.attachedTo === cardId);

  const movedAttachments = attachments.map(a => ({
    ...a,
    ...options, // Inherit zone/flipped if desired, but usually attachments follow a specific rule
    isTapped: options.isTapped ?? a.isTapped,
    isFlipped: options.isFlipped ?? a.isFlipped,
    attachedTo: options.attachedTo ?? a.attachedTo,
  }));

  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: options.zone ?? targetCard.zone,
  };

  return [...otherCards, ...movedAttachments, movedCard];
};

/**
 * Moves a card to a new zone and places it at the FRONT of the array (Top).
 * Primarily used for "Return to TOP of deck".
 */
export const moveCardToFront = (
  cards: CardInstance[],
  cardId: string,
  options: MoveCardOptions
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  const otherCards = cards.filter(c => c.id !== cardId && c.attachedTo !== cardId);
  const attachments = cards.filter(c => c.attachedTo === cardId);

  const movedAttachments = attachments.map(a => ({
    ...a,
    ...options,
    isTapped: options.isTapped ?? a.isTapped,
    isFlipped: options.isFlipped ?? a.isFlipped,
    attachedTo: options.attachedTo ?? a.attachedTo,
  }));

  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: options.zone ?? targetCard.zone,
  };

  return [movedCard, ...movedAttachments, ...otherCards];
};

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
    isTapped: false,
    attachedTo: undefined
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
  return moveCardToEnd(cards, topCard.id, {
    zone: `cemetery-${role}`,
    isFlipped: false,
    counters: { atk: 0, hp: 0 },
    isTapped: false,
    attachedTo: undefined
  });
};

/**
 * Returns the natural deck zone for a given card (Main vs Evolve).
 */
export const getDeckZone = (card: CardInstance): string => {
  return card.isEvolveCard ? `evolveDeck-${card.owner}` : `mainDeck-${card.owner}`;
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
    return { ...card, zone: getDeckZone(card), isFlipped: true, isTapped: false, attachedTo: undefined };
  });

  // 2. Draw 4 new ones
  const newHandCards = restOfDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false }));
  
  // 3. Remaining
  const remainingDeckCards = restOfDeck.slice(4);

  // 4. Others
  const otherCards = cards.filter(c => c.owner !== role || (c.zone !== `mainDeck-${role}` && c.zone !== `hand-${role}`));

  return [...otherCards, ...newHandCards, ...remainingDeckCards, ...returnedCards];
};

/**
 * Resolves results from TopDeckModal.
 */
export interface TopDeckResult {
  cardId: string;
  action: 'hand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';
  order?: number;
}

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
      case 'field': zone = `field-${role}`; break;
      case 'ex': zone = `ex-${role}`; break;
      case 'cemetery': zone = `cemetery-${role}`; break;
      case 'top': 
      case 'bottom': 
        zone = getDeckZone(card); 
        break;
    }
    return { ...card, zone, isFlipped: (res.action === 'top' || res.action === 'bottom') };
  });

  const topCards = results.filter(r => r.action === 'top').sort((a, b) => (a.order || 0) - (b.order || 0)).map(r => processedCards.find(pc => pc.id === r.cardId)!);
  const bottomCards = results.filter(r => r.action === 'bottom').sort((a, b) => (a.order || 0) - (b.order || 0)).map(r => processedCards.find(pc => pc.id === r.cardId)!);
  const sideCards = processedCards.filter(pc => pc.zone !== `mainDeck-${role}`);

  const myDeckRemaining = otherCards.filter(c => c.zone === `mainDeck-${role}`);
  const nonMyDeck = otherCards.filter(c => c.zone !== `mainDeck-${role}`);

  return [
    ...nonMyDeck,
    ...sideCards,
    ...topCards,
    ...myDeckRemaining,
    ...bottomCards
  ];
};

/**
 * Final guard to ensure state integrity.
 */
export const applyStateWithGuards = (newState: CardInstance[]): CardInstance[] => {
  const ids = new Set();
  const uniqueCards: CardInstance[] = [];
  
  for (const card of newState) {
    if (ids.has(card.id)) {
      console.warn(`[Guard] Duplicate card ID detected: ${card.id}. Skipping duplicate.`);
      continue;
    }
    ids.add(card.id);
    uniqueCards.push(card);
  }
  
  return uniqueCards;
};
