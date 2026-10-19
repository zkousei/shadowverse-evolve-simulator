import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

    // Default currentAction is 'field' (or set it to 'top')
    act(() => {
      result.current.setCurrentAction('top');
    });

    act(() => {
      result.current.handleAssign(cards[0]);
    });

    expect(result.current.pendingCards).toHaveLength(1);
    expect(result.current.getGroup('top')).toHaveLength(1);
    expect(result.current.getGroup('top')[0].order).toBe(1);

    act(() => {
      result.current.handleAssign(cards[1]);
    });

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
      result.current.setCurrentAction('bottom');
    });
    act(() => {
      result.current.handleAssign(cards[0]);
      result.current.handleAssign(cards[1]);
      result.current.handleAssign(cards[2]);
    });

    expect(result.current.getGroup('bottom').map(a => a.order)).toEqual([1, 2, 3]);

    // Unassign middle card 'c2'
    act(() => {
      result.current.handleUnassign('c2');
    });

    const bottomCards = result.current.getGroup('bottom');
    expect(bottomCards).toHaveLength(2);
    expect(bottomCards.map(a => a.card.id)).toEqual(['c1', 'c3']);
    expect(bottomCards.map(a => a.order)).toEqual([1, 2]);
    expect(result.current.pendingCards.map(c => c.id)).toContain('c2');
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
      result.current.setCurrentAction('top');
    });
    act(() => {
      result.current.handleAssign(cards[0]);
      result.current.handleAssign(cards[1]);
    });

    expect(result.current.getGroup('top').map(a => a.card.id)).toEqual(['c1', 'c2']);

    // Move 'c2' backward
    act(() => {
      result.current.reorderAssignedDeckCards('top', 'c2', 'backward');
    });

    expect(result.current.getGroup('top').map(a => a.card.id)).toEqual(['c2', 'c1']);
    expect(result.current.getGroup('top').map(a => a.order)).toEqual([1, 2]);
  });
});
