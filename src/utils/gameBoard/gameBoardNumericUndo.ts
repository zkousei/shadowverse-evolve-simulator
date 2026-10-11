import { describeUndoOperation } from './gameBoardUndoLog';
import type { CardMoveCheckpoint, GameStateCheckpoint, SyncState } from '../../types/game';
import type { GameSyncEvent } from '../../types/sync';
import { resolveBoardUnit } from './gameBoardMultiSelection';
import { CARD_MOVE_HISTORY_LIMIT, createGameStateCheckpoint, getCardMoveHistory, withCardMoveHistory } from './gameBoardUndoHistory';

const getNumericUndoKey = (state: SyncState, event: GameSyncEvent): string | undefined => {
  if (event.type === 'MODIFY_PLAYER_STAT') return JSON.stringify([event.type, event.playerKey, event.stat]);
  if (event.type === 'MODIFY_COUNTER' || event.type === 'MODIFY_GENERIC_COUNTER') {
    const card = state.cards.find(card => card.id === event.cardId);
    if (!card) return undefined;
    const unit = resolveBoardUnit(state.cards, card.id, 'host') ?? resolveBoardUnit(state.cards, card.id, 'guest');
    return JSON.stringify([event.type, card.id, event.type === 'MODIFY_COUNTER' ? event.stat : 'counter',
      unit?.signature ?? [card.zone, card.owner, card.attachedTo, card.linkedTo, card.isFlipped, card.selectedFaceSide]]);
  }
  if (event.type === 'BOARD_BATCH' && /^(atk|hp|counter)[+-]$/.test(event.action)) {
    // Click order and direction do not split the same batch; signatures do.
    return JSON.stringify([event.type, event.action.slice(0, -1),
      [...new Map(event.targets.map(target => [target.rootId, target.signature])).entries()].sort(([a], [b]) => a.localeCompare(b))]);
  }
  return undefined;
};

const comparableCheckpoint = (state: GameStateCheckpoint) => JSON.stringify({
  ...createGameStateCheckpoint(state), revision: 0,
  // Missing counters and explicit zero represent the same visible card state.
  cards: state.cards.map(card => ({ ...card, genericCounter: card.genericCounter ?? 0 })),
}, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);

export const closeNumericUndoGroup = (state: SyncState): SyncState => {
  const history = getCardMoveHistory(state);
  if (!history.at(-1)?.numericGroup) return state;
  return withCardMoveHistory(state, history.map((entry, index) => index === history.length - 1
    ? { ...entry, numericGroup: undefined } : entry));
};

export const handleNumericUndoNoop = (state: SyncState, event: GameSyncEvent): SyncState => {
  const key = getNumericUndoKey(state, event);
  const latest = getCardMoveHistory(state).at(-1);
  return key !== undefined && (key !== latest?.numericGroup?.key || latest?.actor !== event.actor)
    ? closeNumericUndoGroup(state) : state;
};

export const recordUndoOperation = (
  state: SyncState, nextState: SyncState, event: GameSyncEvent,
  checkpoint: GameStateCheckpoint, isSoloMode: boolean,
): SyncState => {
  const previous = getCardMoveHistory(state);
  const history = isSoloMode || previous.at(-1)?.actor === event.actor ? previous : [];
  const latest = history.at(-1);
  const key = getNumericUndoKey(state, event);
  const merge = key !== undefined && latest?.actor === event.actor &&
    latest.numericGroup?.key === key && latest.numericGroup.lastRevision === state.revision;
  const entry: CardMoveCheckpoint = {
    actor: event.actor, state: merge ? latest.state : checkpoint,
    description: merge ? latest.description : describeUndoOperation(state, event),
    ...(key !== undefined ? { numericGroup: { key, lastRevision: nextState.revision } } : {}),
  };
  const prefix = merge ? history.slice(0, -1) : history;
  if (key !== undefined && comparableCheckpoint(entry.state) === comparableCheckpoint(nextState)) {
    return withCardMoveHistory(nextState, prefix);
  }
  return withCardMoveHistory(nextState, [...prefix, entry].slice(-CARD_MOVE_HISTORY_LIMIT));
};
