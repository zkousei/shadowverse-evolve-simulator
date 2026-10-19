import type { CardInstance } from '../../../components/Card';
import { isMainDeckSpellCard, isPureEvolveCard } from '../cardType';
import {
  ATTACHMENT_BLOCKED_ZONE_PREFIXES,
  PRIVATE_ZONE_PREFIXES,
  getZonePrefix,
  isLeaderCard,
  isLeaderZone,
  isTokenCard,
} from './cardPredicates';
import {
  collectDescendantIds,
  collectLinkedChildIds,
  detachInvalidEvolveRootSubtrees,
  findRootCard,
  syncStackTapState,
} from './cardRelations';

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

export const getFaceStateForZone = (zone: string, fallback: boolean): boolean => {
  const zonePrefix = getZonePrefix(zone);
  if (zonePrefix === 'mainDeck') return true;
  if (zonePrefix === 'evolveDeck') return false;
  if (['field', 'ex', 'cemetery', 'banish', 'hand'].includes(zonePrefix)) return false;
  return fallback;
};

export const getCountersForMove = (
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

export const getGenericCounterForMove = (
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

export const resolveOwnedRequestedZone = (
  card: CardInstance,
  requestedZone: string
): string => {
  const requestedPrefix = getZonePrefix(requestedZone);
  if (!PRIVATE_ZONE_PREFIXES.has(requestedPrefix)) return requestedZone;
  return `${requestedPrefix}-${card.owner}`;
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

export const dissolveTokenStackIntoZone = (
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
