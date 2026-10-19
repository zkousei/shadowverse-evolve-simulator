import type { SyncState } from '../../../types/game';
import type { CardDetailLookup } from '../../card/cardDetails';

export const buildGameBoardNetworkSnapshotState = (
  state: SyncState,
  detailLookup: CardDetailLookup
): SyncState => ({
  ...state,
  // URLs are small compared with the artwork itself. Keep them so a cold
  // receiver can start loading images before its catalog index is available.
  cards: state.cards.map(card => ({
    ...card,
    image: card.image || (!card.isTokenCard && detailLookup[card.cardId]?.image) || '',
  })),
  cardMoveHistory: [],
  lastGameState: null,
  lastUndoableCardMoveState: null,
  networkHasUndoableTurn: !!state.lastGameState,
  networkHasUndoableCardMove: !!state.lastUndoableCardMoveState,
});
