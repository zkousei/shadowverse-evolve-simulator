import type { PlayerRole, SyncState } from '../types/game';

type UndoAvailabilityState = Pick<
  SyncState,
  | 'lastGameState'
  | 'lastUndoableCardMoveActor'
  | 'lastUndoableCardMoveState'
  | 'networkHasUndoableCardMove'
  | 'networkHasUndoableTurn'
>;

type UndoMoveState = Pick<
  SyncState,
  | 'lastUndoableCardMoveActor'
  | 'lastUndoableCardMoveState'
  | 'networkHasUndoableCardMove'
>;

type UndoTurnState = Pick<
  SyncState,
  | 'lastGameState'
  | 'networkHasUndoableTurn'
>;

export const getCanUndoMove = ({
  isHost,
  isSoloMode,
  role,
  state,
}: {
  isHost: boolean;
  isSoloMode: boolean;
  role: PlayerRole;
  state: UndoMoveState;
}): boolean => {
  const hasUndoableMove = isSoloMode || isHost
    ? Boolean(state.lastUndoableCardMoveState)
    : Boolean(state.networkHasUndoableCardMove ?? state.lastUndoableCardMoveState);

  return hasUndoableMove &&
    (isSoloMode || state.lastUndoableCardMoveActor === role);
};

export const getCanUndoTurn = ({
  isHost,
  isSoloMode,
  state,
}: {
  isHost: boolean;
  isSoloMode: boolean;
  state: UndoTurnState;
}): boolean => {
  return isSoloMode || isHost
    ? Boolean(state.lastGameState)
    : Boolean(state.networkHasUndoableTurn ?? state.lastGameState);
};

export const getGameBoardUndoAvailability = ({
  isHost,
  isSoloMode,
  role,
  state,
}: {
  isHost: boolean;
  isSoloMode: boolean;
  role: PlayerRole;
  state: UndoAvailabilityState;
}): {
  canUndoMove: boolean;
  canUndoTurn: boolean;
} => {
  return {
    canUndoMove: getCanUndoMove({
      isHost,
      isSoloMode,
      role,
      state,
    }),
    canUndoTurn: getCanUndoTurn({
      isHost,
      isSoloMode,
      state,
    }),
  };
};
