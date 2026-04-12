import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameBoardSystemActions } from './useGameBoardSystemActions';

describe('useGameBoardSystemActions (Pure Hook)', () => {
  const defaultArgs = {
    canInteract: true,
    canUndoTurn: true,
    isRollingDice: false,
    showTimedTurnMessage: vi.fn(),
    t: (k: string) => k,
    dispatchGameEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleStatChange dispatches MODIFY_PLAYER_STAT', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handleStatChange('host', 'hp', -2);

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'MODIFY_PLAYER_STAT',
      playerKey: 'host',
      stat: 'hp',
      delta: -2,
    });
  });

  it('setPhase dispatches SET_PHASE', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.setPhase('Main');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SET_PHASE',
      phase: 'Main',
    });
  });

  it('endTurn dispatches END_TURN', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.endTurn('guest');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'END_TURN',
      actor: 'guest',
    });
  });

  it('handleUndoTurn dispatches UNDO_LAST_TURN if canUndoTurn is true', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handleUndoTurn();

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'UNDO_LAST_TURN' });
  });

  it('handleUndoTurn aborts if canUndoTurn is false', () => {
    const { result } = renderHook(() => useGameBoardSystemActions({ ...defaultArgs, canUndoTurn: false }));
    result.current.handleUndoTurn();

    expect(defaultArgs.dispatchGameEvent).not.toHaveBeenCalled();
  });

  it('handleSetInitialTurnOrder dispatches SET_INITIAL_TURN_ORDER with forced starter', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handleSetInitialTurnOrder('guest');

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({
      type: 'SET_INITIAL_TURN_ORDER',
      starter: 'guest',
      manual: true,
    });
  });

  it('handlePureCoinFlip dispatches FLIP_SHARED_COIN', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handlePureCoinFlip();

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'FLIP_SHARED_COIN' });
  });

  it('handleRollDice dispatches ROLL_SHARED_DIE if not currently rolling', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handleRollDice();

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'ROLL_SHARED_DIE' });
  });

  it('handleStartGame dispatches START_GAME and shows timed message', () => {
    const { result } = renderHook(() => useGameBoardSystemActions(defaultArgs));
    result.current.handleStartGame();

    expect(defaultArgs.dispatchGameEvent).toHaveBeenCalledWith({ type: 'START_GAME' });
    expect(defaultArgs.showTimedTurnMessage).toHaveBeenCalledWith('gameBoard.alerts.gameStart', 2500);
  });
});
