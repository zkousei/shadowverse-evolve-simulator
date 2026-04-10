import type { CardInstance } from '../components/Card';
import type { SyncState } from '../types/game';
import { isMainDeckSpellCard, isPureEvolveCard } from './cardType';

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
  genericCounter?: number;
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

const getGenericCounterForMove = (
  card: CardInstance,
  destinationZone: string
): number => {
  const sourcePrefix = getZonePrefix(card.zone);
  const destinationPrefix = getZonePrefix(destinationZone);
  const currentValue = card.genericCounter ?? 0;

  if (sourcePrefix === 'field') {
    return destinationPrefix === 'field' ? currentValue : 0;
  }

  if (sourcePrefix === 'ex') {
    return destinationPrefix === 'field' || destinationPrefix === 'ex' ? currentValue : 0;
  }

  if (destinationPrefix === 'hand') {
    return 0;
  }

  return currentValue;
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

const collectLinkedChildIds = (
  cards: CardInstance[],
  parentIds: Iterable<string>
): Set<string> => {
  const parentIdSet = parentIds instanceof Set ? parentIds : new Set(parentIds);

  return new Set(
    cards
      .filter(card => card.linkedTo && parentIdSet.has(card.linkedTo))
      .map(card => card.id)
  );
};

const detachInvalidEvolveRootSubtrees = (
  cards: CardInstance[],
  rootCardId: string,
  destinationZone?: string
): CardInstance[] => {
  if (!destinationZone) return cards;

  const rootCard = cards.find(card => card.id === rootCardId);
  if (!rootCard?.isEvolveCard) return cards;

  const destinationPrefix = getZonePrefix(destinationZone);
  if (destinationPrefix === 'field' || destinationPrefix === 'ex') return cards;

  const releasedRootIds = new Set(
    cards
      .filter(card => card.attachedTo === rootCardId && !card.isEvolveCard && !isTokenCard(card))
      .map(card => card.id)
  );

  if (releasedRootIds.size === 0) return cards;

  return cards.map(card => (
    releasedRootIds.has(card.id)
      ? { ...card, attachedTo: undefined }
      : card
  ));
};

const getZonePrefix = (zone: string): string => zone.split('-')[0];
const PRIVATE_ZONE_PREFIXES = new Set(['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish']);
const ATTACHMENT_BLOCKED_ZONE_PREFIXES = new Set([...PRIVATE_ZONE_PREFIXES, 'ex']);
const isLeaderZone = (zone: string): boolean => zone.startsWith('leader-');
const isLeaderCard = (card: CardInstance | undefined): boolean =>
  Boolean(card?.isLeaderCard) || isLeaderZone(card?.zone ?? '');
const isTokenCard = (card: CardInstance | undefined): boolean =>
  Boolean(card?.isTokenCard) || card?.cardId === 'token';
const isFieldZone = (zone: string): boolean => getZonePrefix(zone) === 'field';

const getPreferredParentId = (card: Pick<CardInstance, 'attachedTo' | 'linkedTo'>): string | undefined =>
  card.attachedTo ?? card.linkedTo;

const hasBrokenAncestorChain = (
  cardsById: Map<string, CardInstance>,
  cardId: string,
  parentId: string
): boolean => {
  const visited = new Set<string>([cardId]);
  let currentId: string | undefined = parentId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const currentCard = cardsById.get(currentId);
    if (!currentCard) return false;

    currentId = getPreferredParentId(currentCard);
  }

  return false;
};

const sanitizeCardRelations = (cards: CardInstance[]): CardInstance[] => {
  const cardsById = new Map(cards.map(card => [card.id, card] as const));

  return cards.map(card => {
    let nextCard = card;

    if (nextCard.attachedTo && nextCard.linkedTo) {
      nextCard = { ...nextCard, linkedTo: undefined };
    }

    if (nextCard.attachedTo) {
      const parentCard = cardsById.get(nextCard.attachedTo);
      const isInvalidAttachment =
        !parentCard ||
        parentCard.id === nextCard.id ||
        isLeaderCard(parentCard) ||
        isLeaderCard(nextCard) ||
        !isFieldZone(nextCard.zone) ||
        parentCard.zone !== nextCard.zone ||
        hasBrokenAncestorChain(cardsById, nextCard.id, nextCard.attachedTo);

      if (isInvalidAttachment) {
        nextCard = { ...nextCard, attachedTo: undefined };
      }
    }

    if (nextCard.linkedTo) {
      const parentCard = cardsById.get(nextCard.linkedTo);
      const isInvalidLink =
        !parentCard ||
        parentCard.id === nextCard.id ||
        isLeaderCard(parentCard) ||
        isLeaderCard(nextCard) ||
        !isFieldZone(nextCard.zone) ||
        parentCard.zone !== nextCard.zone ||
        hasBrokenAncestorChain(cardsById, nextCard.id, nextCard.linkedTo);

      if (isInvalidLink) {
        nextCard = { ...nextCard, linkedTo: undefined };
      }
    }

    return nextCard;
  });
};

const findRootCard = (cards: CardInstance[], card: CardInstance): CardInstance => {
  let rootCard = card;
  const visited = new Set<string>();

  while (true) {
    const parentId = rootCard.attachedTo ?? rootCard.linkedTo;
    if (!parentId || visited.has(parentId)) break;
    visited.add(rootCard.id);
    const parentCard = cards.find(c => c.id === parentId);
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

const syncStackTapState = (
  cards: CardInstance[],
  rootId: string,
  isTapped: boolean
): CardInstance[] => {
  const stackIds = collectStackIds(cards, rootId);
  if (stackIds.size === 0) return cards;
  const linkedIds = collectLinkedChildIds(cards, stackIds);

  return cards.map(card => (
    stackIds.has(card.id) || linkedIds.has(card.id)
      ? { ...card, isTapped }
      : card
  ));
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
  const workingCards = detachInvalidEvolveRootSubtrees(cards, cardId, options.zone);
  const targetCard = workingCards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const descendantIds = collectDescendantIds(workingCards, cardId);
  const movedStackIds = new Set<string>([cardId, ...descendantIds]);
  const linkedChildIds = collectLinkedChildIds(workingCards, movedStackIds);
  const shouldRemoveTokenChildren = options.zone
    ? PRIVATE_ZONE_PREFIXES.has(getZonePrefix(options.zone))
    : false;
  const otherCards = workingCards.filter(c => c.id !== cardId && !descendantIds.has(c.id) && !linkedChildIds.has(c.id));
  const attachments = workingCards.filter(c => (
    descendantIds.has(c.id) && (!shouldRemoveTokenChildren || !isTokenCard(c))
  ));
  const linkedCards = workingCards.filter(c => (
    linkedChildIds.has(c.id) && (!shouldRemoveTokenChildren || !isTokenCard(c))
  ));

  const movedAttachments = attachments.map(a => {
    const attachmentZone = options.zone
      ? resolveMoveDestination(a, resolveOwnedRequestedZone(a, options.zone))
      : a.zone;
    return {
      ...a,
      ...options,
      zone: attachmentZone,
      counters: options.zone ? getCountersForMove(a, attachmentZone) : (options.counters ?? a.counters),
      genericCounter: options.zone ? getGenericCounterForMove(a, attachmentZone) : (options.genericCounter ?? a.genericCounter),
      isTapped: options.isTapped ?? a.isTapped,
      isFlipped: options.isFlipped ?? (
        options.zone
          ? getFaceStateForZone(attachmentZone, a.isFlipped)
          : a.isFlipped
      ),
      attachedTo: options.preserveAttachment === false ? undefined : (options.attachedTo ?? a.attachedTo),
      linkedTo: options.zone ? undefined : a.linkedTo,
    };
  });

  const movedZone = options.zone ? resolveMoveDestination(targetCard, options.zone) : targetCard.zone;
  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: movedZone,
    counters: options.zone ? getCountersForMove(targetCard, movedZone) : (options.counters ?? targetCard.counters),
    genericCounter: options.zone ? getGenericCounterForMove(targetCard, movedZone) : (options.genericCounter ?? targetCard.genericCounter),
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(movedZone, targetCard.isFlipped)
        : targetCard.isFlipped
    ),
    linkedTo: options.zone ? undefined : targetCard.linkedTo,
  };

  const movedLinkedCards = linkedCards.map(linkedCard => {
    const linkedZone = options.zone
      ? resolveMoveDestination(linkedCard, resolveOwnedRequestedZone(linkedCard, options.zone))
      : linkedCard.zone;
    const linkedZonePrefix = getZonePrefix(linkedZone);
    return {
      ...linkedCard,
      ...options,
      zone: linkedZone,
      counters: options.zone ? getCountersForMove(linkedCard, linkedZone) : (options.counters ?? linkedCard.counters),
      genericCounter: options.zone ? getGenericCounterForMove(linkedCard, linkedZone) : (options.genericCounter ?? linkedCard.genericCounter),
      isTapped: options.isTapped ?? linkedCard.isTapped,
      isFlipped: options.isFlipped ?? (
        options.zone
          ? getFaceStateForZone(linkedZone, linkedCard.isFlipped)
          : linkedCard.isFlipped
      ),
      attachedTo: undefined,
      linkedTo: linkedZonePrefix === 'field' ? linkedCard.linkedTo : undefined,
    };
  });

  return [...otherCards, ...movedAttachments, movedCard, ...movedLinkedCards];
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
  const workingCards = detachInvalidEvolveRootSubtrees(cards, cardId, options.zone);
  const targetCard = workingCards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const descendantIds = collectDescendantIds(workingCards, cardId);
  const movedStackIds = new Set<string>([cardId, ...descendantIds]);
  const linkedChildIds = collectLinkedChildIds(workingCards, movedStackIds);
  const shouldRemoveTokenChildren = options.zone
    ? PRIVATE_ZONE_PREFIXES.has(getZonePrefix(options.zone))
    : false;
  const otherCards = workingCards.filter(c => c.id !== cardId && !descendantIds.has(c.id) && !linkedChildIds.has(c.id));
  const attachments = workingCards.filter(c => (
    descendantIds.has(c.id) && (!shouldRemoveTokenChildren || !isTokenCard(c))
  ));
  const linkedCards = workingCards.filter(c => (
    linkedChildIds.has(c.id) && (!shouldRemoveTokenChildren || !isTokenCard(c))
  ));

  const movedAttachments = attachments.map(a => {
    const attachmentZone = options.zone
      ? resolveMoveDestination(a, resolveOwnedRequestedZone(a, options.zone))
      : a.zone;
    return {
      ...a,
      ...options,
      zone: attachmentZone,
      counters: options.zone ? getCountersForMove(a, attachmentZone) : (options.counters ?? a.counters),
      genericCounter: options.zone ? getGenericCounterForMove(a, attachmentZone) : (options.genericCounter ?? a.genericCounter),
      isTapped: options.isTapped ?? a.isTapped,
      isFlipped: options.isFlipped ?? (
        options.zone
          ? getFaceStateForZone(attachmentZone, a.isFlipped)
          : a.isFlipped
      ),
      attachedTo: options.preserveAttachment === false ? undefined : (options.attachedTo ?? a.attachedTo),
      linkedTo: options.zone ? undefined : a.linkedTo,
    };
  });

  const movedZone = options.zone ? resolveMoveDestination(targetCard, options.zone) : targetCard.zone;
  const movedCard: CardInstance = {
    ...targetCard,
    ...options,
    zone: movedZone,
    counters: options.zone ? getCountersForMove(targetCard, movedZone) : (options.counters ?? targetCard.counters),
    genericCounter: options.zone ? getGenericCounterForMove(targetCard, movedZone) : (options.genericCounter ?? targetCard.genericCounter),
    isFlipped: options.isFlipped ?? (
      options.zone
        ? getFaceStateForZone(movedZone, targetCard.isFlipped)
        : targetCard.isFlipped
    ),
    linkedTo: options.zone ? undefined : targetCard.linkedTo,
  };

  const movedLinkedCards = linkedCards.map(linkedCard => {
    const linkedZone = options.zone
      ? resolveMoveDestination(linkedCard, resolveOwnedRequestedZone(linkedCard, options.zone))
      : linkedCard.zone;
    const linkedZonePrefix = getZonePrefix(linkedZone);
    return {
      ...linkedCard,
      ...options,
      zone: linkedZone,
      counters: options.zone ? getCountersForMove(linkedCard, linkedZone) : (options.counters ?? linkedCard.counters),
      genericCounter: options.zone ? getGenericCounterForMove(linkedCard, linkedZone) : (options.genericCounter ?? linkedCard.genericCounter),
      isTapped: options.isTapped ?? linkedCard.isTapped,
      isFlipped: options.isFlipped ?? (
        options.zone
          ? getFaceStateForZone(linkedZone, linkedCard.isFlipped)
          : linkedCard.isFlipped
      ),
      attachedTo: undefined,
      linkedTo: linkedZonePrefix === 'field' ? linkedCard.linkedTo : undefined,
    };
  });

  return [movedCard, ...movedAttachments, ...movedLinkedCards, ...otherCards];
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
    genericCounter: 0,
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
    genericCounter: 0,
    isTapped: false,
    attachedTo: undefined
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
    preserveAttachment: false
  });
};

/**
 * Returns the natural deck zone for a given card (Main vs Evolve).
 */
export const getDeckZone = (card: CardInstance): string => {
  if (isLeaderCard(card)) return `leader-${card.owner}`;
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
  if (isLeaderCard(card) || requestedPrefix === 'leader') {
    return getDeckZone(card);
  }

  if (requestedPrefix === 'mainDeck' || requestedPrefix === 'evolveDeck') {
    return getDeckZone(card);
  }

  if (isPureEvolveCard(card) && ['hand', 'cemetery', 'banish', 'ex'].includes(requestedPrefix)) {
    return getDeckZone(card);
  }

  return requestedZone;
};

const resolveOwnedRequestedZone = (
  card: CardInstance,
  requestedZone: string
): string => {
  const requestedPrefix = getZonePrefix(requestedZone);
  if (!PRIVATE_ZONE_PREFIXES.has(requestedPrefix)) return requestedZone;
  return `${requestedPrefix}-${card.owner}`;
};

export const resolveDrop = (
  cards: CardInstance[],
  cardId: string,
  overId: string
): DropResolution | null => {
  if (cardId === overId) return null;

  const activeCard = cards.find(c => c.id === cardId);
  if (!activeCard) return null;
  if (isLeaderCard(activeCard)) return null;

  let targetZone = overId;
  let newAttachedTo: string | undefined;

  const overCard = cards.find(c => c.id === overId);
  if (overCard) {
    if (isLeaderCard(overCard)) return null;
    if (overCard.zone.startsWith('field')) {
      targetZone = overCard.zone;
      newAttachedTo = findRootCard(cards, overCard).id;
    } else {
      targetZone = overCard.zone;
    }
  }
  if (isLeaderZone(targetZone)) return null;

  const requestedPrefix = getZonePrefix(targetZone);
  const naturalDeckPrefix = getZonePrefix(getDeckZone(activeCard));
  if (
    (requestedPrefix === 'mainDeck' || requestedPrefix === 'evolveDeck') &&
    requestedPrefix !== naturalDeckPrefix
  ) {
    return null;
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
  const shouldDetachAttachments = ATTACHMENT_BLOCKED_ZONE_PREFIXES.has(baseZonePrefix);
  const isReturningToDeck = baseZonePrefix === 'mainDeck' || baseZonePrefix === 'evolveDeck';
  const isEnteringHand = baseZonePrefix === 'hand';
  const isEnteringEx = baseZonePrefix === 'ex';
  const shouldPlaceAtFront = isReturningToDeck || baseZonePrefix === 'cemetery' || baseZonePrefix === 'banish';

  return {
    targetZone,
    isReturningToDeck,
    shouldPlaceAtFront,
    shouldDeleteToken: isTokenCard(activeCard) && isEnteringSafeZone,
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
      isTapped: isEnteringSafeZone || isEnteringEx ? false : activeCard.isTapped,
      counters: isEnteringHand ? { atk: 0, hp: 0 } : getCountersForMove(activeCard, targetZone),
      genericCounter: getGenericCounterForMove(activeCard, targetZone),
      preserveAttachment: !shouldDetachAttachments,
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
    return dissolveTokenStackIntoZone(cards, cardId, resolution.targetZone, resolution.shouldPlaceAtFront);
  }

  const movedCards = resolution.shouldPlaceAtFront
    ? moveCardToFront(cards, cardId, resolution.moveOptions)
    : moveCardToEnd(cards, cardId, resolution.moveOptions);

  if (resolution.moveOptions.attachedTo) {
    const sourceCard = cards.find(card => card.id === cardId);
    if (!sourceCard) return movedCards;
    return syncStackTapState(movedCards, resolution.moveOptions.attachedTo, sourceCard.isTapped);
  }

  return movedCards;
};

export const modifyCardCounter = (
  cards: CardInstance[],
  cardId: string,
  stat: 'atk' | 'hp',
  delta: number
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard || targetCard.zone.startsWith('hand') || isLeaderCard(targetCard)) return cards;

  return cards.map(c =>
    c.id === cardId ? { ...c, counters: { ...c.counters, [stat]: c.counters[stat] + delta } } : c
  );
};

export const modifyGenericCounter = (
  cards: CardInstance[],
  cardId: string,
  delta: number
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;
  if (!(targetCard.zone.startsWith('field-') || targetCard.zone.startsWith('ex-'))) return cards;

  return cards.map(card =>
    card.id === cardId
      ? { ...card, genericCounter: Math.max(0, (card.genericCounter ?? 0) + delta) }
      : card
  );
};

export const toggleTapStack = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const stackIds = collectStackIds(cards, cardId);
  const linkedIds = collectLinkedChildIds(cards, stackIds);
  const newIsTapped = !targetCard.isTapped;

  return cards.map(c => (
    stackIds.has(c.id) || linkedIds.has(c.id)
      ? { ...c, isTapped: newIsTapped }
      : c
  ));
};

export const tapStack = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const stackIds = collectStackIds(cards, cardId);
  const linkedIds = collectLinkedChildIds(cards, stackIds);
  const shouldChange = cards.some(c => (stackIds.has(c.id) || linkedIds.has(c.id)) && !c.isTapped);
  if (!shouldChange) return cards;

  return cards.map(c => (
    stackIds.has(c.id) || linkedIds.has(c.id)
      ? { ...c, isTapped: true }
      : c
  ));
};

export const toggleFlip = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  return cards.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c);
};

const dissolveTokenStackIntoZone = (
  cards: CardInstance[],
  cardId: string,
  requestedZone: string,
  shouldPlaceAtFront: boolean
): CardInstance[] => {
  const descendantIds = collectDescendantIds(cards, cardId);
  const stackIds = new Set<string>([cardId, ...descendantIds]);
  const linkedChildIds = collectLinkedChildIds(cards, stackIds);
  const otherCards = cards.filter(card => !stackIds.has(card.id) && !linkedChildIds.has(card.id));
  const movedNonTokenCards = cards
    .filter(card => stackIds.has(card.id) && !isTokenCard(card))
    .map(card => {
      const ownedRequestedZone = resolveOwnedRequestedZone(card, requestedZone);
      const destinationZone = resolveMoveDestination(card, ownedRequestedZone);
      return {
        ...card,
        zone: destinationZone,
        isFlipped: getFaceStateForZone(destinationZone, card.isFlipped),
        isTapped: false,
        attachedTo: undefined,
        linkedTo: undefined,
        counters: getCountersForMove(card, destinationZone),
        genericCounter: getGenericCounterForMove(card, destinationZone),
      };
    });
  const movedLinkedCards = cards
    .filter(card => linkedChildIds.has(card.id) && !isTokenCard(card))
    .map(card => {
      const ownedRequestedZone = resolveOwnedRequestedZone(card, requestedZone);
      const destinationZone = resolveMoveDestination(card, ownedRequestedZone);
      return {
        ...card,
        zone: destinationZone,
        isFlipped: getFaceStateForZone(destinationZone, card.isFlipped),
        isTapped: false,
        attachedTo: undefined,
        linkedTo: undefined,
        counters: getCountersForMove(card, destinationZone),
        genericCounter: getGenericCounterForMove(card, destinationZone),
      };
    });

  return shouldPlaceAtFront
    ? [...movedNonTokenCards, ...movedLinkedCards, ...otherCards]
    : [...otherCards, ...movedNonTokenCards, ...movedLinkedCards];
};

export const sendCardToBottom = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;
  if (isTokenCard(targetCard)) {
    return dissolveTokenStackIntoZone(cards, cardId, getDeckZone(targetCard), false);
  }

  return moveCardToEnd(cards, cardId, {
    zone: getDeckZone(targetCard),
    isFlipped: !targetCard.isEvolveCard,
    isTapped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    preserveAttachment: false,
  });
};

export const banishCard = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;
  if (isTokenCard(targetCard)) {
    return dissolveTokenStackIntoZone(cards, cardId, `banish-${targetCard.owner}`, true);
  }

  const destinationZone = targetCard.isEvolveCard ? getDeckZone(targetCard) : `banish-${targetCard.owner}`;
  return moveCardToFront(cards, cardId, {
    zone: destinationZone,
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    preserveAttachment: false,
  });
};

export const sendCardToCemetery = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;
  if (isTokenCard(targetCard)) {
    return dissolveTokenStackIntoZone(cards, cardId, `cemetery-${targetCard.owner}`, true);
  }

  const destinationZone = targetCard.isEvolveCard ? getDeckZone(targetCard) : `cemetery-${targetCard.owner}`;
  return moveCardToFront(cards, cardId, {
    zone: destinationZone,
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
    preserveAttachment: false,
  });
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

export const returnEvolveCard = (
  cards: CardInstance[],
  cardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;
  if (isTokenCard(targetCard)) {
    return dissolveTokenStackIntoZone(cards, cardId, getDeckZone(targetCard), true);
  }

  return moveCardToFront(cards, cardId, {
    zone: getDeckZone(targetCard),
    isTapped: false,
    isFlipped: false,
    attachedTo: undefined,
    counters: { atk: 0, hp: 0 },
    genericCounter: 0,
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
  if (isLeaderCard(targetCard)) return cards;
  if (isMainDeckSpellCard(targetCard) && (targetCard.zone.startsWith('hand-') || targetCard.zone.startsWith('ex-'))) {
    return sendCardToCemetery(cards, cardId);
  }

  const destinationZone = `field-${role}`;
  return moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    attachedTo: undefined,
    isTapped: false,
    isFlipped: false,
    counters: getCountersForMove(targetCard, destinationZone),
    genericCounter: getGenericCounterForMove(targetCard, destinationZone),
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
  if (isLeaderCard(targetCard)) return cards;

  let destinationZone = targetCard.isEvolveCard ? `field-${role}` : `hand-${role}`;
  if (customDestination) destinationZone = customDestination;
  destinationZone = resolveMoveDestination(targetCard, destinationZone);

  const destinationPrefix = getZonePrefix(destinationZone);
  const isEnteringHand = destinationPrefix === 'hand';
  const shouldDetachAttachments = ATTACHMENT_BLOCKED_ZONE_PREFIXES.has(destinationPrefix);

  return moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    isFlipped: false,
    counters: isEnteringHand ? { atk: 0, hp: 0 } : getCountersForMove(targetCard, destinationZone),
    genericCounter: getGenericCounterForMove(targetCard, destinationZone),
    attachedTo: undefined,
    preserveAttachment: !shouldDetachAttachments,
  });
};

export const extractCardToFieldAttachment = (
  cards: CardInstance[],
  cardId: string,
  role: 'host' | 'guest',
  attachToCardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const attachTarget = cards.find(c => c.id === attachToCardId);
  if (!attachTarget) return cards;
  if (isLeaderCard(attachTarget)) return cards;

  const rootCard = findRootCard(cards, attachTarget);
  const destinationZone = `field-${role}`;
  if (rootCard.zone !== destinationZone) return cards;

  return moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    isFlipped: false,
    isTapped: rootCard.isTapped,
    counters: getCountersForMove(targetCard, destinationZone),
    genericCounter: getGenericCounterForMove(targetCard, destinationZone),
    attachedTo: rootCard.id,
    preserveAttachment: false,
  });
};

export const linkCardToField = (
  cards: CardInstance[],
  cardId: string,
  parentCardId: string
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return cards;
  if (isLeaderCard(targetCard)) return cards;

  const parentCard = cards.find(c => c.id === parentCardId);
  if (!parentCard) return cards;
  if (isLeaderCard(parentCard)) return cards;

  const rootCard = findRootCard(cards, parentCard);
  const destinationZone = `field-${targetCard.owner}`;
  if (rootCard.zone !== destinationZone) return cards;
  if (rootCard.owner !== targetCard.owner) return cards;

  const movedCards = moveCardToEnd(cards, cardId, {
    zone: destinationZone,
    isFlipped: false,
    isTapped: rootCard.isTapped,
    counters: getCountersForMove(targetCard, destinationZone),
    genericCounter: getGenericCounterForMove(targetCard, destinationZone),
    attachedTo: undefined,
    preserveAttachment: false,
  });

  return movedCards.map(card => (
    card.id === cardId
      ? { ...card, attachedTo: undefined, linkedTo: rootCard.id }
      : card
  ));
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

  const drawnCards = myDeck.slice(0, 4).map(c => ({ ...c, zone: `hand-${role}`, isFlipped: false, linkedTo: undefined }));
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

export const spawnTokenCards = (
  cards: CardInstance[],
  tokens: CardInstance[]
): CardInstance[] => [...cards, ...tokens];

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

/**
 * Final guard to ensure state integrity.
 */
export const applyStateWithGuards = (newState: CardInstance[]): CardInstance[] => {
  const ids = new Set<string>();
  const uniqueCards: CardInstance[] = [];
  
  for (const card of newState) {
    if (ids.has(card.id)) {
      console.warn(`[Guard] Duplicate card ID detected: ${card.id}. Skipping duplicate.`);
      continue;
    }
    ids.add(card.id);
    uniqueCards.push(card);
  }

  return sanitizeCardRelations(uniqueCards);
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
