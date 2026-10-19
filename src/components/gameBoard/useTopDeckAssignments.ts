import { useState, useEffect, useRef } from 'react';
import type { CardInstance } from '../Card';

export type TopDeckAction = 'hand' | 'revealedHand' | 'field' | 'ex' | 'cemetery' | 'top' | 'bottom';

export interface AssignedCard {
  card: CardInstance;
  action: TopDeckAction;
  order?: number;
}

export interface UseTopDeckAssignmentsParams {
  isOpen: boolean;
  cards: CardInstance[];
  onAssignmentChange?: () => void;
}

export const shuffleAssignments = <T,>(assignments: T[]): T[] => {
  const shuffled = [...assignments];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export function useTopDeckAssignments({
  isOpen,
  cards,
  onAssignmentChange,
}: UseTopDeckAssignmentsParams) {
  const [pendingCards, setPendingCards] = useState<CardInstance[]>([]);
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [currentAction, setCurrentAction] = useState<TopDeckAction>('field');
  const [isBottomOrderRandomized, setIsBottomOrderRandomized] = useState(false);
  const wasOpenRef = useRef(false);
  const previousCardIdsKeyRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      previousCardIdsKeyRef.current = '';
      return;
    }

    const cardIdsKey = cards.map((card) => card.id).join('\u0000');
    const shouldResetState = !wasOpenRef.current || previousCardIdsKeyRef.current !== cardIdsKey;

    if (shouldResetState) {
      setPendingCards([...cards]);
      setAssignedCards([]);
      setCurrentAction('field');
      setIsBottomOrderRandomized(false);
    } else {
      const latestCardById = new Map(cards.map((card) => [card.id, card]));

      setPendingCards((previous) => previous
        .map((card) => latestCardById.get(card.id))
        .filter((card): card is CardInstance => Boolean(card))
      );
      setAssignedCards((previous) => previous
        .map((assignment) => {
          const latestCard = latestCardById.get(assignment.card.id);
          return latestCard
            ? { ...assignment, card: latestCard }
            : null;
        })
        .filter((assignment): assignment is AssignedCard => assignment !== null)
      );
    }

    wasOpenRef.current = true;
    previousCardIdsKeyRef.current = cardIdsKey;
  }, [isOpen, cards]);

  const handleAssign = (card: CardInstance) => {
    onAssignmentChange?.();
    setPendingCards(prev => prev.filter(c => c.id !== card.id));
    setAssignedCards(prev => {
      const isDeckBack = currentAction === 'top' || currentAction === 'bottom';
      let order: number | undefined = undefined;

      if (isDeckBack) {
        const bucketCount = prev.filter(a => a.action === currentAction).length;
        order = bucketCount + 1;
      }

      return [...prev, { card, action: currentAction, order }];
    });
  };

  const handleUnassign = (cardId: string) => {
    onAssignmentChange?.();
    const target = assignedCards.find(a => a.card.id === cardId);
    if (!target) return;

    setAssignedCards(prev => {
      const filtered = prev.filter(a => a.card.id !== cardId);
      // Re-order if it was a deck bucket
      if (target.action === 'top' || target.action === 'bottom') {
        let count = 1;
        return filtered.map(a => {
          if (a.action === target.action) {
            return { ...a, order: count++ };
          }
          return a;
        });
      }
      return filtered;
    });
    setPendingCards(prev => [...prev, target.card]);
  };

  const reorderAssignedDeckCards = (action: 'top' | 'bottom', cardId: string, direction: 'backward' | 'forward') => {
    setAssignedCards(prev => {
      const bucket = prev
        .filter(a => a.action === action)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const currentIndex = bucket.findIndex(a => a.card.id === cardId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'backward' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= bucket.length) return prev;

      const reorderedBucket = [...bucket];
      [reorderedBucket[currentIndex], reorderedBucket[targetIndex]] = [reorderedBucket[targetIndex], reorderedBucket[currentIndex]];
      const nextOrderMap = new Map(reorderedBucket.map((entry, index) => [entry.card.id, index + 1]));

      return prev.map(entry => {
        if (entry.action !== action) return entry;
        const nextOrder = nextOrderMap.get(entry.card.id);
        return nextOrder ? { ...entry, order: nextOrder } : entry;
      });
    });
  };

  const getGroup = (action: TopDeckAction) => {
    const group = assignedCards.filter(a => a.action === action);
    if (action === 'top' || action === 'bottom') {
      return [...group].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return group;
  };

  const getConfirmResults = () => {
    const topAssignments = assignedCards
      .filter(a => a.action === 'top')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const bottomAssignments = assignedCards
      .filter(a => a.action === 'bottom')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const orderedBottomAssignments = isBottomOrderRandomized
      ? shuffleAssignments(bottomAssignments).map((assignment, index) => ({ ...assignment, order: index + 1 }))
      : bottomAssignments;
    const nonOrderedAssignments = assignedCards.filter(a => a.action !== 'top' && a.action !== 'bottom');

    return [...nonOrderedAssignments, ...topAssignments, ...orderedBottomAssignments].map(a => ({
      cardId: a.card.id,
      action: a.action,
      order: a.order,
    }));
  };

  const allAssigned = pendingCards.length === 0;

  return {
    pendingCards,
    assignedCards,
    currentAction,
    setCurrentAction,
    isBottomOrderRandomized,
    setIsBottomOrderRandomized,
    handleAssign,
    handleUnassign,
    reorderAssignedDeckCards,
    getGroup,
    getConfirmResults,
    allAssigned,
  };
}
