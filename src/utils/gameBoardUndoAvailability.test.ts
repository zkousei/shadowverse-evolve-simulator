import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
import {
  getCanUndoMove,
  getCanUndoTurn,
  getGameBoardUndoAvailability,
} from './gameBoardUndoAvailability';

const undoCheckpoint = { ...initialState, revision: 3 };

describe('getGameBoardUndoAvailability', () => {
  it('uses local undo snapshots for host-side availability', () => {
    const availability = getGameBoardUndoAvailability({
      isHost: true,
      isSoloMode: false,
      role: 'host',
      state: {
        ...initialState,
        lastGameState: undoCheckpoint,
        lastUndoableCardMoveActor: 'host',
        lastUndoableCardMoveState: undoCheckpoint,
      },
    });

    expect(availability).toEqual({
      canUndoMove: true,
      canUndoTurn: true,
    });
    expect(getCanUndoMove({
      isHost: true,
      isSoloMode: false,
      role: 'host',
      state: {
        lastUndoableCardMoveActor: 'host',
        lastUndoableCardMoveState: undoCheckpoint,
      },
    })).toBe(true);
    expect(getCanUndoTurn({
      isHost: true,
      isSoloMode: false,
      state: {
        lastGameState: undoCheckpoint,
      },
    })).toBe(true);
  });

  it('uses network undo flags for guest turn availability', () => {
    expect(getGameBoardUndoAvailability({
      isHost: false,
      isSoloMode: false,
      role: 'guest',
      state: {
        ...initialState,
        lastGameState: null,
        lastUndoableCardMoveActor: 'guest',
        lastUndoableCardMoveState: null,
        networkHasUndoableCardMove: true,
        networkHasUndoableTurn: true,
      },
    })).toEqual({
      canUndoMove: true,
      canUndoTurn: true,
    });
  });

  it('keeps guest move undo scoped to the actor while preserving remote turn undo visibility', () => {
    expect(getGameBoardUndoAvailability({
      isHost: false,
      isSoloMode: false,
      role: 'guest',
      state: {
        ...initialState,
        lastGameState: null,
        lastUndoableCardMoveActor: 'host',
        lastUndoableCardMoveState: null,
        networkHasUndoableCardMove: true,
        networkHasUndoableTurn: true,
      },
    })).toEqual({
      canUndoMove: false,
      canUndoTurn: true,
    });
  });

  it('allows solo move undo regardless of the last move actor', () => {
    expect(getGameBoardUndoAvailability({
      isHost: false,
      isSoloMode: true,
      role: 'guest',
      state: {
        ...initialState,
        lastUndoableCardMoveActor: 'host',
        lastUndoableCardMoveState: undoCheckpoint,
      },
    }).canUndoMove).toBe(true);
  });
});
