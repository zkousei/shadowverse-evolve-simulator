import type { CardMoveCheckpoint, SyncState } from '../../types/game';

export const CARD_MOVE_HISTORY_LIMIT = 20;

export const getCardMoveHistory = (state: SyncState): CardMoveCheckpoint[] => {
  if (state.cardMoveHistory?.length) return state.cardMoveHistory;
  // Compatibility with a single checkpoint from an older saved session.
  return state.lastUndoableCardMoveState && state.lastUndoableCardMoveActor
    ? [{ actor: state.lastUndoableCardMoveActor, state: state.lastUndoableCardMoveState }]
    : [];
};

export const withCardMoveHistory = (state: SyncState, history: CardMoveCheckpoint[]): SyncState => ({
  ...state,
  cardMoveHistory: history,
  // Keep the existing UI/network contract as a projection of the latest entry.
  lastUndoableCardMoveState: history.at(-1)?.state ?? null,
  lastUndoableCardMoveActor: history.at(-1)?.actor ?? null,
  networkHasUndoableCardMove: history.length > 0,
  networkHasUndoableTurn: !!state.lastGameState,
});

export const createGameStateCheckpoint = (
  state: SyncState
): NonNullable<SyncState['lastGameState']> => {
  return {
    host: { ...state.host },
    guest: { ...state.guest },
    cards: state.cards.map(card => ({ ...card, counters: { ...card.counters } })),
    turnPlayer: state.turnPlayer,
    turnCount: state.turnCount,
    phase: state.phase,
    gameStatus: state.gameStatus,
    tokenOptions: {
      host: state.tokenOptions.host.map(option => ({ ...option })),
      guest: state.tokenOptions.guest.map(option => ({ ...option })),
    },
    revealHandsMode: state.revealHandsMode,
    endStop: { ...state.endStop },
    revision: state.revision,
    // Flat checkpoints bound memory and saved-session size. Network snapshots
    // strip all checkpoints, including this history's latest-entry projection.
  };
};

