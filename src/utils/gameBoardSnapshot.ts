import type { SyncState } from '../types/game';
import type { CardDetailLookup } from './cardDetails';

export const buildGameBoardNetworkSnapshotState = (
  state: SyncState,
  detailLookup: CardDetailLookup
): SyncState => ({
  ...state,
  cards: state.cards.map((card) => {
    const canRestoreImageFromLookup =
      !card.isTokenCard &&
      !!detailLookup[card.cardId]?.image &&
      card.image === detailLookup[card.cardId].image;

    return canRestoreImageFromLookup
      ? { ...card, image: '' }
      : { ...card };
  }),
  lastGameState: null,
  lastUndoableCardMoveState: null,
  networkHasUndoableTurn: !!state.lastGameState,
  networkHasUndoableCardMove: !!state.lastUndoableCardMoveState,
});
