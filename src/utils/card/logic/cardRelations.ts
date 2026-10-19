import type { CardInstance } from '../../../components/Card';
import {
  getZonePrefix,
  isFieldZone,
  isLeaderCard,
  isTokenCard,
} from './cardPredicates';

export const collectDescendantIds = (
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

export const collectLinkedChildIds = (
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

export const detachInvalidEvolveRootSubtrees = (
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

export const sanitizeCardRelations = (cards: CardInstance[]): CardInstance[] => {
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

export const findRootCard = (cards: CardInstance[], card: CardInstance): CardInstance => {
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

export const collectStackIds = (cards: CardInstance[], cardId: string): Set<string> => {
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

export const syncStackTapState = (
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
