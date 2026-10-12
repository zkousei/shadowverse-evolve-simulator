import { describe, expect, it } from 'vitest';
import { initialState } from '../../types/game';
import {
  getCanUndoMove,
  getCanUndoTurn,
  getGameBoardUndoAvailability,
  getCanShowUndoMoveForRole,
} from './gameBoardUndoAvailability';

const undoCheckpoint = { ...initialState, revision: 3 };

describe('getCanShowUndoMoveForRole', () => {
  const available = {
    gameStatus: 'playing' as const, isSoloMode: false, isSpectator: false,
    canInteract: true, role: 'host' as const, hasUndoableMove: true,
    undoMoveActor: 'host' as const,
  };

  it.each(['host', 'guest'] as const)('enables only the viewer’s own Undo button for %s', role => {
    const args = { ...available, role, undoMoveActor: role };
    expect(getCanShowUndoMoveForRole({ ...args, playerRole: role })).toBe(true);
    expect(getCanShowUndoMoveForRole({ ...args, playerRole: role === 'host' ? 'guest' : 'host' })).toBe(false);
  });

  it.each([
    { hasUndoableMove: false }, { canInteract: false }, { isSpectator: true },
    { gameStatus: 'preparing' as const }, { undoMoveActor: 'guest' as const },
  ])('blocks Undo for unavailable history or interaction: %j', override => {
    expect(getCanShowUndoMoveForRole({ ...available, ...override, playerRole: 'host' })).toBe(false);
  });

  it.each(['host', 'guest'] as const)('preserves solo Undo on the latest actor’s side: %s', undoMoveActor => {
    const args = { ...available, isSoloMode: true, undoMoveActor };
    expect(getCanShowUndoMoveForRole({ ...args, playerRole: undoMoveActor })).toBe(true);
    expect(getCanShowUndoMoveForRole({ ...args, playerRole: undoMoveActor === 'host' ? 'guest' : 'host' })).toBe(false);
  });
});

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
