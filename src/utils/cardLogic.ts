import type { CardInstance } from '../components/Card';
import type { SyncState } from '../types/game';

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
  preserveAttachment?: boolean;
}

export interface DropResolution {
  targetZone: string;
  moveOptions: MoveCardOptions;
  isReturningToDeck: boolean;
  shouldPlaceAtFront: boolean;
  shouldDeleteToken: boolean;
}

const getFaceStateForZone = (zone: string, fallback: boolean): boolean => {
  const zonePrefix = getZonePrefix(zone);
  if (zonePrefix === 'mainDeck') return true;
  if (zonePrefix === 'evolveDeck') return false;
  if (['field', 'ex', 'cemetery', 'banish', 'hand'].includes(zonePrefix)) return false;
  return fallback;
};

const getCountersForMove = (
  card: CardInstance,
  destinationZone: string
): { atk: number; hp: number } => {
  const sourcePrefix = getZonePrefix(card.zone);
  const destinationPrefix = getZonePrefix(destinationZone);

  if (sourcePrefix === 'field') {
    return destinationPrefix === 'field' ? card.counters : { atk: 0, hp: 0 };
  }

  if (sourcePrefix === 'ex') {
    return destinationPrefix === 'field' || destinationPrefix === 'ex'
      ? card.counters
      : { atk: 0, hp: 0 };
  }

  if (destinationPrefix === 'hand') {
    return { atk: 0, hp: 0 };
  }

  return card.counters;
};

const collectDescendantIds = (
  cards: CardInstance[],
  parentId: string
): Set<string> => {
  const descendantIds = new Set<string>();
  const queue = [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = cards.filter(c => c.attachedTo === currentId);

    for (const child of children) {
      if (descendantIds.has(child.id)) continue;
      descendantIds.add(child.id);
      queue.push(child.id);
    }
  }

  return descendantIds;
};

const getZonePrefix = (zone: string): string => zone.split('-')[0];

const findRootCard = (cards: CardInstance[], card: CardInstance): CardInstance => {
  let rootCard = card;
  const visited = new Set<string>();

  while (rootCard.attachedTo && !visited.has(rootCard.attachedTo)) {
    visited.add(rootCard.id);
    const parentCard = cards.find(c => c.id === rootCard.attachedTo);
    if (!parentCard) break;
    rootCard = parentCard;
  }

  return rootCard;
};

const collectStackIds = (cards: CardInstance[], cardId: string): Set<string> => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return new Set();

  const baseId = targetCard.attachedTo || targetCard.id;
  const stackIds = new Set<string>([baseId]);
  const queue = [baseId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = cards.filter(c => c.attachedTo === currentId);

    for (const child of children) {
      if (stackIds.has(child.id)) continue;
      stackIds.add(child.id);
      queue.push(child.id);
    }
  }

  return stackIds;
};

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

  const descendantIds = collectDescendantIds(cards, cardId);
  const otherCards = cards.filter(c => c.id !== cardId && !descendantIds.has(c.id));
  const attachments = cards.filter(c => descendantIds.has(c.id));

  const movedAttachments = attachments.map(a => ({
    ...a,
    ...options, // Inherit zone/flipped if desired, but usually attachments follow a specific rule
    zone: options.zone ? resolveMoveDestination(a, options.zone) : a.zone,
    isTapped: options.isTapped ?? a.isTapped,
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(resolveMoveDestination(a, options.zone), a.isFlipped)
        : a.isFlipped
    ),
    attachedTo: options.preserveAttachment === false ? undefined : (options.attachedTo ?? a.attachedTo),
  }));

  const movedZone = options.zone ? resolveMoveDestination(targetCard, options.zone) : targetCard.zone;
  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: movedZone,
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(movedZone, targetCard.isFlipped)
        : targetCard.isFlipped
    ),
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

  const descendantIds = collectDescendantIds(cards, cardId);
  const otherCards = cards.filter(c => c.id !== cardId && !descendantIds.has(c.id));
  const attachments = cards.filter(c => descendantIds.has(c.id));

  const movedAttachments = attachments.map(a => ({
    ...a,
    ...options,
    zone: options.zone ? resolveMoveDestination(a, options.zone) : a.zone,
    isTapped: options.isTapped ?? a.isTapped,
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(resolveMoveDestination(a, options.zone), a.isFlipped)
        : a.isFlipped
    ),
    attachedTo: options.preserveAttachment === false ? undefined : (options.attachedTo ?? a.attachedTo),
  }));

  const movedZone = options.zone ? resolveMoveDestination(targetCard, options.zone) : targetCard.zone;
  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: movedZone,
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(movedZone, targetCard.isFlipped)
        : targetCard.isFlipped
    ),
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
  return moveCardToFront(cards, topCard.id, {
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
 * Enforces deck-separation rules for manual moves.
 */
export const resolveMoveDestination = (
  card: CardInstance,
  requestedZone: string
): string => {
  const requestedPrefix = getZonePrefix(requestedZone);

  if (requestedPrefix === 'mainDeck' || requestedPrefix === 'evolveDeck') {
    return getDeckZone(card);
  }

  if (card.isEvolveCard && ['hand', 'cemetery', 'banish'].includes(requestedPrefix)) {
    return getDeckZone(card);
  }

  return requestedZone;
};

export const resolveDrop = (
  cards: CardInstance[],
  cardId: string,
  overId: string
): DropResolution | null => {
  if (cardId === overId) return null;

  const activeCard = cards.find(c => c.id === cardId);
  if (!activeCard) return null;

  let targetZone = overId;
  let newAttachedTo: string | undefined;

  const overCard = cards.find(c => c.id === overId);
  if (overCard) {
    if (overCard.zone.startsWith('field')) {
      targetZone = overCard.zone;
      newAttachedTo = findRootCard(cards, overCard).id;
    } else {
      targetZone = overCard.zone;
    }
  }

  targetZone = resolveMoveDestination(activeCard, targetZone);

  let baseZonePrefix = getZonePrefix(targetZone);
  const isPrivateZone = ['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix);
  if (isPrivateZone) {
    targetZone = `${baseZonePrefix}-${activeCard.owner}`;
  }

  targetZone = resolveMoveDestination(activeCard, targetZone);
  baseZonePrefix = getZonePrefix(targetZone);

  const isEnteringSafeZone = ['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(baseZonePrefix);
  const isReturningToDeck = baseZonePrefix === 'mainDeck' || baseZonePrefix === 'evolveDeck';
  const isEnteringHand = baseZonePrefix === 'hand';
  const shouldPlaceAtFront = isReturningToDeck || baseZonePrefix === 'cemetery' || baseZonePrefix === 'banish';

  return {
    targetZone,
    isReturningToDeck,
    shouldPlaceAtFront,
    shouldDeleteToken: activeCard.cardId === 'token' && isEnteringSafeZone,
    moveOptions: {
      zone: targetZone,
      attachedTo: newAttachedTo,
      isFlipped:
        baseZonePrefix === 'mainDeck'
          ? true
          : baseZonePrefix === 'evolveDeck'
            ? false
            : ['field', 'ex', 'cemetery', 'banish', 'hand'].includes(baseZonePrefix)
              ? false
              : activeCard.isFlipped,
      isTapped: isEnteringSafeZone ? false : activeCard.isTapped,
      counters: isEnteringHand ? { atk: 0, hp: 0 } : getCountersForMove(activeCard, targetZone),
      preserveAttachment: !isEnteringSafeZone,
    },
  };
};

export const applyDrop = (
  cards: CardInstance[],
  cardId: string,
  overId: string
): CardInstance[] => {
  const resolution = resolveDrop(cards, cardId, overId);
  if (!resolution) return cards;

  if (resolution.shouldDeleteToken) {
    return removeTokenAndAttachments(cards, cardId);
  }

  return resolution.shouldPlaceAtFront
    ? moveCardToFront(cards, cardId, resolution.moveOptions)
    : moveCardToEnd(cards, cardId, resolution.moveOptions);
};

export const modifyCardCounter = (
  cards: CardInstance[],
  cardId: string,
  stat: 'atk' | 'hp',
  delta: number
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard || targetCard.zone.startsWith('hand')) return cards;

  return cards.map(c =>
    c.id === cardId ? { ...c, counters: { ...c.counters, [stat]: c.counters[stat] + delta } } : c
  );
};

export const toggleTapStack = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  const stackIds = collectStackIds(cards, cardId);
  const newIsTapped = !targetCard.isTapped;

  return cards.map(c => stackIds.has(c.id) ? { ...c, isTapped: newIsTapped } : c);
};

export const toggleFlip = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  return cards.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c);
};

const removeTokenAndAttachments = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const descendantIds = collectDescendantIds(cards, cardId);
  return cards.filter(c => c.id !== cardId && !descendantIds.has(c.id));
};

export const sendCardToBottom = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (targetCard.cardId === 'token') return removeTokenAndAttachments(cards, cardId);

  return moveCardToEnd(cards, cardId, {
    zone: getDeckZone(targetCard),
    isFlipped: !targetCard.isEvolveCard,
    isTapped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    preserveAttachment: false,
  });
};

export const banishCard = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (targetCard.cardId === 'token') return removeTokenAndAttachments(cards, cardId);

  const destinationZone = targetCard.isEvolveCard ? getDeckZone(targetCard) : `banish-${targetCard.owner}`;
  return moveCardToFront(cards, cardId, {
    zone: destinationZone,
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    preserveAttachment: false,
  });
};

export const sendCardToCemetery = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (targetCard.cardId === 'token') return removeTokenAndAttachments(cards, cardId);

  const destinationZone = targetCard.isEvolveCard ? getDeckZone(targetCard) : `cemetery-${targetCard.owner}`;
  return moveCardToFront(cards, cardId, {
    zone: destinationZone,
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    preserveAttachment: false,
  });
};

export const returnEvolveCard = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (targetCard.cardId === 'token') return removeTokenAndAttachments(cards, cardId);

  return moveCardToFront(cards, cardId, {
    zone: getDeckZone(targetCard),
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    preserveAttachment: false,
  });
};

export const playCardToField = (
  cards: CardInstance[],
  cardId: string,
  role: 'host' | 'guest'
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  const destinationZone = `field-${role}`;
  return moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    attachedTo: undefined,
    isTapped: false,
    isFlipped: false,
    counters: getCountersForMove(targetCard, destinationZone),
  });
};

export const extractCard = (
  cards: CardInstance[],
  cardId: string,
  role: 'host' | 'guest',
  customDestination?: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;

  let destinationZone = targetCard.isEvolveCard ? `field-${role}` : `hand-${role}`;
  if (customDestination) destinationZone = customDestination;
  destinationZone = resolveMoveDestination(targetCard, destinationZone);

  const destinationPrefix = getZonePrefix(destinationZone);
  const isEnteringHand = destinationPrefix === 'hand';
  const isEnteringSafeZone = ['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish'].includes(destinationPrefix);

  return moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    isFlipped: false,
    counters: isEnteringHand ? { atk: 0, hp: 0 } : getCountersForMove(targetCard, destinationZone),
    attachedTo: undefined,
    preserveAttachment: !isEnteringSafeZone,
  });
};

export const modifyPlayerStatValue = (
  currentValue: number,
  maxPp: number,
  stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo',
  delta: number
): number => {
  let newValue = currentValue + delta;
  if (stat === 'maxPp') {
    newValue = Math.min(10, Math.max(0, newValue));
  } else if (stat === 'pp') {
    newValue = Math.min(maxPp, Math.max(0, newValue));
  } else {
    newValue = Math.max(0, newValue);
  }
  return newValue;
};

export const drawInitialHand = (
  cards: CardInstance[],
  role: 'host' | 'guest'
): CardInstance[] => {
  const myDeck = cards.filter(c => c.zone === `mainDeck-${role}`);
  if (myDeck.length < 4) return cards;

  const drawnCards = myDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false }));
  const drawnIds = new Set(drawnCards.map(c => c.id));
  const otherCards = cards.filter(c => !drawnIds.has(c.id));
  return [...otherCards, ...drawnCards];
};

export const importDeckCards = (
  cards: CardInstance[],
  role: 'host' | 'guest',
  importedCards: CardInstance[]
): CardInstance[] => {
  const otherPlayersCards = cards.filter(c => c.owner !== role);
  return [...otherPlayersCards, ...importedCards];
};

export const spawnTokenCard = (
  cards: CardInstance[],
  token: CardInstance
): CardInstance[] => [...cards, token];

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
  action: 'hand' | 'revealedHand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';
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
      case 'revealedHand': zone = `hand-${role}`; break;
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

export const normalizeCardsForGameState = (
  cards: CardInstance[],
  gameStatus: SyncState['gameStatus']
): CardInstance[] => {
  if (gameStatus !== 'playing') return cards;
  return cards.map(card =>
    card.zone.startsWith('field-') && card.isFlipped ? { ...card, isFlipped: false } : card
  );
};
