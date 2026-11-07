import { useState } from 'react';
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

const reindexDeckAssignments = (assignments: AssignedCard[]): AssignedCard[] => {
  const nextOrderById = new Map((['top', 'bottom'] as const).flatMap(action => assignments
    .filter(assignment => assignment.action === action)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((assignment, index) => [assignment.card.id, index + 1] as const)));

  return assignments.map(assignment => assignment.action === 'top' || assignment.action === 'bottom'
    ? { ...assignment, order: nextOrderById.get(assignment.card.id) }
    : assignment);
};

export function useTopDeckAssignments({
  isOpen,
  cards,
  onAssignmentChange,
}: UseTopDeckAssignmentsParams) {
  const [pendingCards, setPendingCards] = useState<CardInstance[]>(() => isOpen ? [...cards] : []);
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [lastAssignmentCardIds, setLastAssignmentCardIds] = useState<string[] | null>(null);
  const [isBottomOrderRandomized, setIsBottomOrderRandomized] = useState(false);
  const cardIdsKey = cards.map(card => card.id).join('\u0000');
  const [previousInput, setPreviousInput] = useState({ isOpen, cards, cardIdsKey });

  // Synchronize a changed session before rendering its cards or confirm button.
  if (previousInput.isOpen !== isOpen || previousInput.cards !== cards || previousInput.cardIdsKey !== cardIdsKey) {
    setPreviousInput({ isOpen, cards, cardIdsKey });
    if (isOpen) {
      if (!previousInput.isOpen || previousInput.cardIdsKey !== cardIdsKey) {
        setPendingCards([...cards]);
        setAssignedCards([]);
        setSelectedCardIds([]);
        setLastAssignmentCardIds(null);
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
    }
  }

  const toggleSelection = (card: CardInstance) => {
    if (!pendingCards.some(pending => pending.id === card.id)) return;
    onAssignmentChange?.();
    setSelectedCardIds(previous => previous.includes(card.id)
      ? previous.filter(id => id !== card.id)
      : [...previous, card.id]);
  };

  const assignCards = (cardsToAssign: CardInstance[], action: TopDeckAction) => {
    if (cardsToAssign.length === 0) return;
    onAssignmentChange?.();
    const assignedIds = new Set(cardsToAssign.map(card => card.id));
    setPendingCards(previous => previous.filter(card => !assignedIds.has(card.id)));
    setAssignedCards(previous => {
      const isOrdered = action === 'top' || action === 'bottom';
      const bucketCount = previous.filter(assignment => assignment.action === action).length;
      return [...previous, ...cardsToAssign.map((card, index) => ({
        card,
        action,
        order: isOrdered ? bucketCount + index + 1 : undefined,
      }))];
    });
    setSelectedCardIds([]);
    setLastAssignmentCardIds(cardsToAssign.map(card => card.id));
  };

  const assignSelected = (action: TopDeckAction) => {
    const pendingById = new Map(pendingCards.map(card => [card.id, card]));
    assignCards(selectedCardIds
      .map(id => pendingById.get(id))
      .filter((card): card is CardInstance => Boolean(card)), action);
  };

  const canUndoLastAssignment = isOpen && lastAssignmentCardIds !== null;

  const undoLastAssignment = () => {
    if (!isOpen || lastAssignmentCardIds === null) return;
    onAssignmentChange?.();
    const retryIds = new Set(lastAssignmentCardIds);
    const remainingAssignments = reindexDeckAssignments(assignedCards.filter(assignment => !retryIds.has(assignment.card.id)));
    const remainingAssignedIds = new Set(remainingAssignments.map(assignment => assignment.card.id));
    setAssignedCards(remainingAssignments);
    setPendingCards(cards.filter(card => !remainingAssignedIds.has(card.id)));
    setSelectedCardIds([...lastAssignmentCardIds]);
    setLastAssignmentCardIds(null);
  };

  const handleUnassign = (cardId: string) => {
    onAssignmentChange?.();
    const target = assignedCards.find(a => a.card.id === cardId);
    if (!target) return;

    setAssignedCards(prev => {
      const filtered = prev.filter(a => a.card.id !== cardId);
      // Re-order if it was a deck bucket
      if (target.action === 'top' || target.action === 'bottom') {
        return reindexDeckAssignments(filtered);
      }
      return filtered;
    });
    setPendingCards(prev => {
      const pendingIds = new Set([...prev.map(card => card.id), target.card.id]);
      return cards.filter(card => pendingIds.has(card.id));
    });
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
    selectedCardIds,
    toggleSelection,
    assignSelected,
    canUndoLastAssignment,
    undoLastAssignment,
    isBottomOrderRandomized,
    setIsBottomOrderRandomized,
    handleUnassign,
    reorderAssignedDeckCards,
    getGroup,
    getConfirmResults,
    allAssigned,
  };
}
