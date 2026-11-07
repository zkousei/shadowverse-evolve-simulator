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

interface AssignmentBatch {
  cardIds: string[];
  previousAssignments: AssignedCard[];
}

// Keep later edits to other cards, inserting restored cards before surviving
// successors from their original order (or at the end if none remain).
const insertRestoredIds = (currentIds: string[], previousIds: string[], restoredIds: Set<string>): string[] => {
  const result = [...currentIds];
  for (let index = previousIds.length - 1; index >= 0; index -= 1) {
    const id = previousIds[index];
    if (!restoredIds.has(id)) continue;
    const nextId = previousIds.slice(index + 1).find(candidate => result.includes(candidate));
    result.splice(nextId === undefined ? result.length : result.indexOf(nextId), 0, id);
  }
  return result;
};

const restoreAssignmentBatch = (assignments: AssignedCard[], batch: AssignmentBatch, cards: CardInstance[]): AssignedCard[] => {
  const batchIds = new Set(batch.cardIds);
  const remaining = assignments.filter(assignment => !batchIds.has(assignment.card.id));
  const currentCardById = new Map(cards.map(card => [card.id, card]));
  const restored = batch.previousAssignments.filter(assignment => batchIds.has(assignment.card.id))
    .map(assignment => ({ ...assignment, card: currentCardById.get(assignment.card.id)! }));
  const restoredIds = new Set(restored.map(assignment => assignment.card.id));
  const assignmentById = new Map([...remaining, ...restored].map(assignment => [assignment.card.id, assignment]));
  const ids = insertRestoredIds(remaining.map(a => a.card.id), batch.previousAssignments.map(a => a.card.id), restoredIds);
  const orderById = new Map((['top', 'bottom'] as const).flatMap(action => {
    const orderedIds = (entries: AssignedCard[]) => entries.filter(a => a.action === action)
      .sort((a, b) => (a.order || 0) - (b.order || 0)).map(a => a.card.id);
    return insertRestoredIds(orderedIds(remaining), orderedIds(batch.previousAssignments), restoredIds)
      .map((id, index) => [id, index + 1] as const);
  }));
  return ids.map(id => {
    const assignment = assignmentById.get(id)!;
    return assignment.action === 'top' || assignment.action === 'bottom'
      ? { ...assignment, order: orderById.get(id) }
      : assignment;
  });
};

export function useTopDeckAssignments({
  isOpen,
  cards,
  onAssignmentChange,
}: UseTopDeckAssignmentsParams) {
  const [pendingCards, setPendingCards] = useState<CardInstance[]>(() => isOpen ? [...cards] : []);
  const [assignedCards, setAssignedCards] = useState<AssignedCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [lastAssignment, setLastAssignment] = useState<AssignmentBatch | null>(null);
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
        setLastAssignment(null);
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
    if (!isOpen || !cards.some(source => source.id === card.id)) return;
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
      const remaining = reindexDeckAssignments(previous.filter(assignment => !assignedIds.has(assignment.card.id)));
      const isOrdered = action === 'top' || action === 'bottom';
      const bucketCount = remaining.filter(assignment => assignment.action === action).length;
      return [...remaining, ...cardsToAssign.map((card, index) => ({
        card,
        action,
        order: isOrdered ? bucketCount + index + 1 : undefined,
      }))];
    });
    setSelectedCardIds([]);
    setLastAssignment({ cardIds: cardsToAssign.map(card => card.id), previousAssignments: assignedCards });
  };

  const assignSelected = (action: TopDeckAction) => {
    if (!isOpen) return;
    const cardById = new Map(cards.map(card => [card.id, card]));
    assignCards(selectedCardIds
      .map(id => cardById.get(id))
      .filter((card): card is CardInstance => Boolean(card)), action);
  };

  const canUndoLastAssignment = isOpen && lastAssignment !== null;

  const undoLastAssignment = () => {
    if (!isOpen || lastAssignment === null) return;
    onAssignmentChange?.();
    const remainingAssignments = restoreAssignmentBatch(assignedCards, lastAssignment, cards);
    const remainingAssignedIds = new Set(remainingAssignments.map(assignment => assignment.card.id));
    setAssignedCards(remainingAssignments);
    setPendingCards(cards.filter(card => !remainingAssignedIds.has(card.id)));
    setSelectedCardIds([]);
    setLastAssignment(null);
  };

  const canUnassignSelected = isOpen && assignedCards.some(assignment => selectedCardIds.includes(assignment.card.id));

  const unassignSelected = () => {
    if (!canUnassignSelected) return;
    onAssignmentChange?.();
    const selectedIds = new Set(selectedCardIds);
    const remaining = reindexDeckAssignments(assignedCards.filter(assignment => !selectedIds.has(assignment.card.id)));
    const remainingIds = new Set(remaining.map(assignment => assignment.card.id));
    setLastAssignment({ cardIds: [...selectedCardIds], previousAssignments: assignedCards });
    setAssignedCards(remaining);
    setPendingCards(cards.filter(card => !remainingIds.has(card.id)));
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
  const canConfirm = isOpen && allAssigned && selectedCardIds.length === 0;

  return {
    pendingCards,
    assignedCards,
    selectedCardIds,
    toggleSelection,
    assignSelected,
    canUnassignSelected,
    unassignSelected,
    canConfirm,
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
