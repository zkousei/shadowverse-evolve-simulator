import type { CardInstance } from '../../../components/Card';
import { isLeaderCard } from './cardPredicates';
import { collectLinkedChildIds, collectStackIds } from './cardRelations';

export const modifyCardCounter = (
  cards: CardInstance[],
  cardId: string,
  stat: 'atk' | 'hp',
  delta: number
): CardInstance[] => {
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard || targetCard.zone.startsWith('hand') || isLeaderCard(targetCard)) return cards;
  if (delta === 0) return cards;

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
  const nextCounter = Math.max(0, (targetCard.genericCounter ?? 0) + delta);
  if (nextCounter === (targetCard.genericCounter ?? 0)) return cards;

  return cards.map(card =>
    card.id === cardId
      ? { ...card, genericCounter: nextCounter }
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
