import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardCardActions } from './useGameBoardCardActions';
import type { SyncState } from '../types/game';
import type { SharedUiEffect } from '../types/sync';

import * as cardReveal from '../utils/cardReveal';
import * as gameBoardInteraction from '../utils/gameBoardInteraction';

vi.mock('../utils/cardReveal', () => ({
  buildHandRevealEffect: vi.fn(),
}));

vi.mock('../utils/gameBoardInteraction', () => ({
  canLookAtTopDeck: vi.fn(),
}));

describe('useGameBoardCardActions (Pure Hook)', () => {
  const defaultArgs = {
    canInteract: true,
    gameStatus: 'playing' as const,
    gameStateCards: [],
    lastUndoableCardMoveState: null,
    lastUndoableCardMoveActor: null,
    networkHasUndoableCardMove: false,
    isSoloMode: false,
    isHost: true,
    role: 'host' as const,
    playSharedUiEffect: vi.fn(),
    sendSharedUiEffect: vi.fn(),
    dispatchGameEvent: vi.fn(),
    setTopDeckTargetRole: vi.fn(),
    setTopDeckCards: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameBoardInteraction.canLookAtTopDeck).mockReturnValue(true);
  });

  it('drawCard dispatches DRAW_CARD', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.drawCard('host');
    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'DRAW_CARD', actor: 'host' });
  });

  it('millCard dispatches MILL_CARD', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.millCard('host');
    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'MILL_CARD', actor: 'host' });
  });

  it('moveTopCardToEx dispatches MOVE_TOP_CARD_TO_EX', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.moveTopCardToEx('host');
    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'MOVE_TOP_CARD_TO_EX', actor: 'host' });
  });

  it('discardRandomHandCards dispatches DISCARD_RANDOM_HAND_CARDS with positive integer', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.discardRandomHandCards('guest', 2);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'DISCARD_RANDOM_HAND_CARDS',
      actor: 'host',
      target: 'guest',
      count: 2,
    });
  });

  it('discardRandomHandCards ignores non-positive counts', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.discardRandomHandCards('guest', 0);
    result.current.discardRandomHandCards('guest', -1);

    expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
  });

  it('revealHand aborts if solo mode', () => {
    const { result } = renderHook(() => useGameBoardCardActions({ ...defaultArgs, isSoloMode: true }));
    result.current.revealHand();
    expect(defaultArgs.playSharedUiEffect).not.toHaveBeenCalled();
  });

  it('revealHand plays and sends shared effect if valid', () => {
    const mockEffect = { type: 'REVEAL_HAND_CARDS' as const, actor: 'host' as const, cards: [] } as SharedUiEffect;
    vi.mocked(cardReveal.buildHandRevealEffect).mockReturnValue(mockEffect);

    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.revealHand();

    expect(defaultArgs.playSharedUiEffect).toHaveBeenCalledWith(mockEffect);
    expect(defaultArgs.sendSharedUiEffect).toHaveBeenCalledWith(mockEffect);
  });

  it('handleLookAtTop slices deck and sets top deck state', () => {
    const mockCards = [
      { id: '1', zone: 'mainDeck-host' },
      { id: '2', zone: 'mainDeck-host' },
      { id: '3', zone: 'mainDeck-guest' },
    ] as Extract<Parameters<typeof defaultArgs.setTopDeckCards>[0], Array<unknown>>;

    const { result } = renderHook(() => useGameBoardCardActions({ ...defaultArgs, gameStateCards: mockCards }));
    result.current.handleLookAtTop(2, 'host');

    expect(defaultArgs.setTopDeckTargetRole).toHaveBeenCalledWith('host');
    expect(defaultArgs.setTopDeckCards).toHaveBeenCalledWith([mockCards[0], mockCards[1]]);
  });

  it('handleResolveTopDeck dispatches event and clears top deck state', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.handleResolveTopDeck([], 'host');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'RESOLVE_TOP_DECK',
      actor: 'host',
      results: [],
    });
    expect(defaultArgs.setTopDeckCards).toHaveBeenCalledWith([]);
  });

  it('handleUndoCardMove succeeds if state exists', () => {
    const { result } = renderHook(() => useGameBoardCardActions({ ...defaultArgs, lastUndoableCardMoveState: {} as unknown as SyncState }));
    result.current.handleUndoCardMove();

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'UNDO_CARD_MOVE', actor: 'host' });
  });

  it('handleUndoCardMove aborts if no state exists', () => {
    const { result } = renderHook(() => useGameBoardCardActions(defaultArgs));
    result.current.handleUndoCardMove();

    expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
  });
});
