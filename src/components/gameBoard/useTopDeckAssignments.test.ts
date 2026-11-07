import { describe, expect, it } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { createElement, useLayoutEffect } from 'react';
import type { CardInstance } from '../Card';
import { useTopDeckAssignments } from './useTopDeckAssignments';

const createCard = (id: string, name: string): CardInstance => ({
  id,
  cardId: `cid-${id}`,
  name,
  image: 'https://example.com/card.png',
  zone: 'deck-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
});

describe('useTopDeckAssignments', () => {
  it('initializes with all cards pending and assigns cards with order for deck actions', () => {
    const cards = [createCard('c1', 'Card 1'), createCard('c2', 'Card 2')];
    const { result } = renderHook(() =>
      useTopDeckAssignments({ isOpen: true, cards })
    );

    expect(result.current.pendingCards).toHaveLength(2);
    expect(result.current.allAssigned).toBe(false);

    act(() => {
      result.current.toggleSelection(cards[0]);
    });

    expect(result.current.pendingCards).toHaveLength(2);
    act(() => result.current.assignSelected('top'));
    expect(result.current.pendingCards).toHaveLength(1);
    expect(result.current.getGroup('top')).toHaveLength(1);
    expect(result.current.getGroup('top')[0].order).toBe(1);

    act(() => {
      result.current.toggleSelection(cards[1]);
    });

    act(() => result.current.assignSelected('top'));
    expect(result.current.pendingCards).toHaveLength(0);
    expect(result.current.allAssigned).toBe(true);
    expect(result.current.getGroup('top')).toHaveLength(2);
    expect(result.current.getGroup('top')[1].order).toBe(2);
  });

  it('re-indexes remaining deck cards when a deck-ordered card is unassigned', () => {
    const cards = [
      createCard('c1', 'Card 1'),
      createCard('c2', 'Card 2'),
      createCard('c3', 'Card 3'),
    ];
    const { result } = renderHook(() =>
      useTopDeckAssignments({ isOpen: true, cards })
    );

    act(() => {
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
      result.current.toggleSelection(cards[2]);
    });

    act(() => result.current.assignSelected('bottom'));
    expect(result.current.getGroup('bottom').map(a => a.order)).toEqual([1, 2, 3]);

    // Unassign middle card 'c2'
    act(() => {
      result.current.handleUnassign('c2');
    });

    const bottomCards = result.current.getGroup('bottom');
    expect(bottomCards).toHaveLength(2);
    expect(bottomCards.map(a => a.card.id)).toEqual(['c1', 'c3']);
    expect(bottomCards.map(a => a.order)).toEqual([1, 2]);
    expect(result.current.pendingCards.map(c => c.id)).toEqual(['c2']);
  });

  it.each(['top', 'bottom'] as const)('preserves the remaining %s order when undoing a reordered assignment and appending it again', action => {
    const cards = [createCard('c1', 'A'), createCard('c2', 'B'), createCard('c3', 'C'), createCard('c4', 'D')];
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => result.current.toggleSelection(cards[3]));
    act(() => result.current.assignSelected('hand'));
    act(() => {
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
      result.current.toggleSelection(cards[2]);
    });
    act(() => result.current.assignSelected(action));
    act(() => result.current.reorderAssignedDeckCards(action, 'c3', 'backward'));
    act(() => result.current.reorderAssignedDeckCards(action, 'c3', 'backward'));
    expect(result.current.getGroup(action).map(a => a.card.id)).toEqual(['c3', 'c1', 'c2']);
    act(() => result.current.handleUnassign('c1'));
    expect(result.current.getGroup(action).map(a => [a.card.id, a.order])).toEqual([['c3', 1], ['c2', 2]]);
    expect(result.current.getGroup('hand').map(a => a.card.id)).toEqual(['c4']);
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected(action));
    expect(result.current.getConfirmResults()).toEqual([
      { cardId: 'c4', action: 'hand', order: undefined },
      { cardId: 'c3', action, order: 1 },
      { cardId: 'c2', action, order: 2 },
      { cardId: 'c1', action, order: 3 },
    ]);
  });

  it('reorders assigned deck cards backward and forward', () => {
    const cards = [
      createCard('c1', 'Card 1'),
      createCard('c2', 'Card 2'),
    ];
    const { result } = renderHook(() =>
      useTopDeckAssignments({ isOpen: true, cards })
    );

    act(() => {
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
    });

    act(() => result.current.assignSelected('top'));
    expect(result.current.getGroup('top').map(a => a.card.id)).toEqual(['c1', 'c2']);

    // Move 'c2' backward
    act(() => {
      result.current.reorderAssignedDeckCards('top', 'c2', 'backward');
    });

    expect(result.current.getGroup('top').map(a => a.card.id)).toEqual(['c2', 'c1']);
    expect(result.current.getGroup('top').map(a => a.order)).toEqual([1, 2]);
  });
});


describe('card-first assignments', () => {
  it('uses selection order, supports deselection, and clears selection after assigning', () => {
    const cards = [createCard('c1', 'A'), createCard('c2', 'B'), createCard('c3', 'C')];
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => {
      result.current.toggleSelection(cards[2]);
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
      result.current.toggleSelection(cards[0]);
    });
    expect(result.current.pendingCards).toHaveLength(3);
    act(() => result.current.assignSelected('top'));
    expect(result.current.getGroup('top').map(a => a.card.id)).toEqual(['c3', 'c2']);
    expect(result.current.selectedCardIds).toEqual([]);
    act(() => result.current.assignSelected('hand'));
    expect(result.current.getGroup('hand')).toEqual([]);
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected('bottom'));
    expect(result.current.getConfirmResults()).toEqual([
      { cardId: 'c3', action: 'top', order: 1 },
      { cardId: 'c2', action: 'top', order: 2 },
      { cardId: 'c1', action: 'bottom', order: 1 },
    ]);
  });

  it('appends selected cards to an existing bucket in selection order', () => {
    const cards = [createCard('c1', 'A'), createCard('c2', 'B'), createCard('c3', 'C')];
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => result.current.toggleSelection(cards[1]));
    act(() => result.current.assignSelected('bottom'));
    act(() => result.current.toggleSelection(cards[2]));
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected('bottom'));
    expect(result.current.getGroup('bottom').map(a => [a.card.id, a.order])).toEqual([
      ['c2', 1], ['c3', 2], ['c1', 3],
    ]);
    expect(result.current.selectedCardIds).toEqual([]);
    expect(result.current.allAssigned).toBe(true);
    act(() => result.current.assignSelected('bottom'));
    expect(result.current.getGroup('bottom')).toHaveLength(3);
  });
});


describe('selection lifecycle', () => {
  it('commits fresh pending cards before exposing confirmation when opening or changing the session', () => {
    const commits: { pending: string[]; allAssigned: boolean }[] = [];
    const Session = ({ isOpen, cards }: { isOpen: boolean; cards: CardInstance[] }) => {
      const state = useTopDeckAssignments({ isOpen, cards });
      useLayoutEffect(() => {
        if (isOpen) commits.push({ pending: state.pendingCards.map(card => card.id), allAssigned: state.allAssigned });
      });
      return null;
    };
    const cards = [createCard('c1', 'A')];
    const { rerender } = render(createElement(Session, { isOpen: false, cards }));
    rerender(createElement(Session, { isOpen: true, cards }));
    expect(commits).toEqual([{ pending: ['c1'], allAssigned: false }]);
    rerender(createElement(Session, { isOpen: true, cards: [createCard('c2', 'B')] }));
    expect(commits).toEqual([
      { pending: ['c1'], allAssigned: false },
      { pending: ['c2'], allAssigned: false },
    ]);
  });


  it('keeps selection across same-ID updates using fresh card data, and resets for new cards or reopening', () => {
    const cards = [createCard('c1', 'A'), createCard('c2', 'B')];
    const { result, rerender } = renderHook(
      ({ isOpen, cards }) => useTopDeckAssignments({ isOpen, cards }),
      { initialProps: { isOpen: true, cards } },
    );
    act(() => result.current.toggleSelection(cards[1]));
    rerender({ isOpen: true, cards: cards.map(card => ({ ...card, name: 'Updated' })) });
    expect(result.current.selectedCardIds).toEqual(['c2']);
    act(() => result.current.assignSelected('hand'));
    expect(result.current.getGroup('hand')[0].card.name).toBe('Updated');
    act(() => result.current.toggleSelection(cards[0]));
    rerender({ isOpen: true, cards: [createCard('c3', 'C')] });
    expect(result.current.selectedCardIds).toEqual([]);
    expect(result.current.assignedCards).toEqual([]);
    act(() => result.current.toggleSelection(createCard('c3', 'C')));
    rerender({ isOpen: false, cards: [createCard('c3', 'C')] });
    rerender({ isOpen: true, cards: [createCard('c3', 'C')] });
    expect(result.current.selectedCardIds).toEqual([]);
  });

  it('restores unassigned cards to their original positions for selection', () => {
    const cards = [createCard('c1', 'A'), createCard('c2', 'B'), createCard('c3', 'C')];
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected('hand'));
    act(() => result.current.handleUnassign('c1'));
    expect(result.current.pendingCards.map(card => card.id)).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('retrying the last assignment', () => {
  it.each(['hand', 'revealedHand', 'field', 'ex', 'cemetery', 'top', 'bottom'] as const)(
    'returns only the latest %s batch selected in its original selection order', action => {
      const cards = [createCard('c1', 'A'), createCard('c2', 'B'), createCard('c3', 'C'), createCard('c4', 'D')];
      const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
      expect(result.current.canUndoLastAssignment).toBe(false);
      act(() => result.current.undoLastAssignment());
      expect(result.current.pendingCards).toHaveLength(4);
      act(() => result.current.toggleSelection(cards[1]));
      act(() => result.current.assignSelected(action));
      act(() => {
        result.current.toggleSelection(cards[2]);
        result.current.toggleSelection(cards[0]);
      });
      act(() => result.current.assignSelected(action));
      expect(result.current.canUndoLastAssignment).toBe(true);
      // An empty assignment must not overwrite the last real batch.
      act(() => result.current.assignSelected('field'));
      act(() => result.current.undoLastAssignment());
      expect(result.current.getGroup(action).map(a => [a.card.id, a.order])).toEqual([
        ['c2', action === 'top' || action === 'bottom' ? 1 : undefined],
      ]);
      expect(result.current.pendingCards.map(card => card.id)).toEqual(['c1', 'c3', 'c4']);
      expect(result.current.selectedCardIds).toEqual(['c3', 'c1']);
      expect(result.current.allAssigned).toBe(false);
      expect(result.current.canUndoLastAssignment).toBe(false);
      act(() => result.current.undoLastAssignment());
      expect(result.current.getGroup(action).map(a => a.card.id)).toEqual(['c2']);
      expect(result.current.selectedCardIds).toEqual(['c3', 'c1']);
      act(() => result.current.assignSelected('bottom'));
      expect(result.current.getGroup('bottom').map(a => a.card.id)).toEqual(
        action === 'bottom' ? ['c2', 'c3', 'c1'] : ['c3', 'c1'],
      );
      expect(result.current.canUndoLastAssignment).toBe(true);
    },
  );

  it.each(['top', 'bottom'] as const)('closes %s order gaps without changing older cards after undoing an interleaved batch', action => {
    const cards = ['c1', 'c2', 'c3', 'c4'].map(id => createCard(id, id));
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => {
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
    });
    act(() => result.current.assignSelected(action));
    act(() => {
      result.current.toggleSelection(cards[2]);
      result.current.toggleSelection(cards[3]);
    });
    act(() => result.current.assignSelected(action));
    act(() => result.current.reorderAssignedDeckCards(action, 'c4', 'backward'));
    act(() => result.current.reorderAssignedDeckCards(action, 'c4', 'backward'));
    expect(result.current.getGroup(action).map(a => a.card.id)).toEqual(['c1', 'c4', 'c2', 'c3']);
    act(() => result.current.undoLastAssignment());
    expect(result.current.getGroup(action).map(a => [a.card.id, a.order])).toEqual([['c1', 1], ['c2', 2]]);
    expect(result.current.selectedCardIds).toEqual(['c3', 'c4']);
  });

  it('preserves other deck order and randomization after subsequent selection, reordering and manual returns', () => {
    const cards = ['c1', 'c2', 'c3', 'c4', 'c5'].map(id => createCard(id, id));
    const { result } = renderHook(() => useTopDeckAssignments({ isOpen: true, cards }));
    act(() => {
      result.current.toggleSelection(cards[0]);
      result.current.toggleSelection(cards[1]);
    });
    act(() => result.current.assignSelected('top'));
    act(() => {
      result.current.toggleSelection(cards[2]);
      result.current.toggleSelection(cards[3]);
    });
    act(() => result.current.assignSelected('bottom'));
    act(() => result.current.reorderAssignedDeckCards('top', 'c2', 'backward'));
    act(() => result.current.setIsBottomOrderRandomized(true));
    act(() => result.current.reorderAssignedDeckCards('bottom', 'c4', 'backward'));
    act(() => result.current.handleUnassign('c4'));
    act(() => result.current.toggleSelection(cards[4]));
    act(() => result.current.undoLastAssignment());
    expect(result.current.getGroup('top').map(a => [a.card.id, a.order])).toEqual([['c2', 1], ['c1', 2]]);
    expect(result.current.getGroup('bottom')).toEqual([]);
    expect(result.current.pendingCards.map(card => card.id)).toEqual(['c3', 'c4', 'c5']);
    expect(result.current.selectedCardIds).toEqual(['c3', 'c4']);
    expect(result.current.isBottomOrderRandomized).toBe(true);
    act(() => result.current.assignSelected('top'));
    expect(result.current.getGroup('top').map(a => [a.card.id, a.order])).toEqual([
      ['c2', 1], ['c1', 2], ['c3', 3], ['c4', 4],
    ]);
  });

  it('retains the latest metadata across same-ID refreshes and clears retry when the session changes', () => {
    const cards = [createCard('c1', 'A')];
    const { result, rerender } = renderHook(
      ({ isOpen, cards }) => useTopDeckAssignments({ isOpen, cards }),
      { initialProps: { isOpen: true, cards } },
    );
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected('cemetery'));
    rerender({ isOpen: true, cards: [{ ...cards[0], name: 'Updated' }] });
    expect(result.current.canUndoLastAssignment).toBe(true);
    act(() => result.current.undoLastAssignment());
    expect(result.current.pendingCards[0].name).toBe('Updated');
    expect(result.current.selectedCardIds).toEqual(['c1']);
    act(() => result.current.assignSelected('bottom'));
    rerender({ isOpen: false, cards });
    expect(result.current.canUndoLastAssignment).toBe(false);
    act(() => result.current.undoLastAssignment());
    expect(result.current.getGroup('bottom')).toHaveLength(1);
    rerender({ isOpen: true, cards });
    expect(result.current.canUndoLastAssignment).toBe(false);
    expect(result.current.assignedCards).toEqual([]);
    act(() => result.current.toggleSelection(cards[0]));
    act(() => result.current.assignSelected('hand'));
    rerender({ isOpen: true, cards: [createCard('c2', 'B')] });
    expect(result.current.canUndoLastAssignment).toBe(false);
    act(() => result.current.undoLastAssignment());
    expect(result.current.pendingCards.map(card => card.id)).toEqual(['c2']);
    expect(result.current.selectedCardIds).toEqual([]);
  });
});
