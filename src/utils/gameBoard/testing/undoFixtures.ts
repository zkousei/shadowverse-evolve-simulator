import type { CardInstance } from '../../../components/Card';
import { initialState, type PlayerRole, type SyncState } from '../../../types/game';
import type { GameSyncEvent } from '../../../types/sync';
import { getBoardUnits } from '../gameBoardMultiSelection';
import type { PublicUndoSummary } from '../gameBoardUndoLog';

// Explicit exclusions make a new sync event a type error until its Undo contract
// is classified here. Turn Undo is covered separately from operation Undo.
type NonOperationEvent = 'FLIP_SHARED_COIN' | 'ROLL_SHARED_DIE' | 'TOGGLE_READY'
  | 'SET_PHASE' | 'END_TURN' | 'START_GAME' | 'RESET_GAME' | 'DRAW_INITIAL_HAND'
  | 'EXECUTE_MULLIGAN' | 'IMPORT_DECK' | 'SET_INITIAL_TURN_ORDER'
  | 'UNDO_LAST_TURN' | 'UNDO_CARD_MOVE' | 'SET_REVEAL_HANDS_MODE' | 'SET_END_STOP';
type Operation = Exclude<GameSyncEvent['type'], NonOperationEvent>;
type Fixture = { event: GameSyncEvent; summary: PublicUndoSummary };
type Factory = (state: SyncState, actor: PlayerRole) => Fixture;

export const opposite = (actor: PlayerRole): PlayerRole => actor === 'host' ? 'guest' : 'host';
export const undoCard = (id: string, zone: string, owner: PlayerRole, extra: Partial<CardInstance> = {}): CardInstance => ({
  id, cardId: `catalog-${id}`, name: `Private-${id}`, image: `private-image-${id}`,
  zone: `${zone}-${owner}`, owner, baseCardType: 'follower', isTapped: false,
  isFlipped: zone === 'mainDeck', counters: { atk: 3, hp: 3 }, genericCounter: 3, ...extra,
});
export const undoBoard = (actor: PlayerRole): SyncState => ({
  ...initialState, gameStatus: 'playing', turnPlayer: actor,
  host: { ...initialState.host, pp: 5, maxPp: 8, ep: 3, sep: 3, combo: 3 },
  guest: { ...initialState.guest, pp: 5, maxPp: 8, ep: 3, sep: 3, combo: 3 },
  cards: [
    undoCard('field', 'field', actor), undoCard('ex', 'ex', actor),
    undoCard('hand1', 'hand', actor), undoCard('hand2', 'hand', actor),
    undoCard('evo', 'evolveDeck', actor, { isEvolveCard: true }),
    undoCard('evoUsed', 'field', actor, { isEvolveCard: true }),
    ...['d1', 'd2', 'd3'].map(id => undoCard(id, 'mainDeck', actor)),
    undoCard('opHand', 'hand', opposite(actor)), undoCard('opDeck', 'mainDeck', opposite(actor)),
  ],
});
type EventPayload = { [K in GameSyncEvent['type']]: Omit<Extract<GameSyncEvent, { type: K }>, 'id'> }[GameSyncEvent['type']];
const event = (payload: EventPayload): GameSyncEvent => ({ id: 'operation', ...payload });
const movement = (owner: PlayerRole, from: 'field' | 'ex' | 'hand' | 'deck' | 'evolveDeck' | 'banish' | 'cemetery', to: typeof from, count = 1): PublicUndoSummary =>
  ({ kind: 'move', moves: [{ owner, from, to, count }] });
const move = (type: 'SEND_TO_BOTTOM' | 'BANISH_CARD' | 'SEND_TO_CEMETERY', from: 'deck' | 'banish' | 'cemetery'): Factory =>
  (_, actor) => ({ event: event({ type, actor, cardId: 'field' }), summary: movement(actor, from, 'field') });
const moveBatch = (type: 'SEND_TO_BOTTOM_BATCH' | 'BANISH_CARDS_BATCH' | 'SEND_TO_CEMETERY_BATCH', from: 'deck' | 'banish' | 'cemetery'): Factory =>
  (_, actor) => ({ event: event({ type, actor, cardIds: ['hand1', 'hand2'] }), summary: movement(actor, from, 'hand', 2) });

export const undoFixtures = {
  MOVE_CARD: (_, actor) => ({ event: event({ type: 'MOVE_CARD', actor, cardId: 'hand1', overId: `field-${actor}` }), summary: movement(actor, 'field', 'hand') }),
  LINK_CARD_TO_FIELD: (_, actor) => ({ event: event({ type: 'LINK_CARD_TO_FIELD', actor, cardId: 'evo', parentCardId: 'field' }), summary: movement(actor, 'field', 'evolveDeck') }),
  MODIFY_COUNTER: (_, actor) => ({ event: event({ type: 'MODIFY_COUNTER', actor, cardId: 'field', stat: 'atk', delta: 1 }), summary: { kind: 'card-stat', stat: 'atk', count: 1, detail: { name: 'Private-field', from: 4, to: 3 } } }),
  MODIFY_GENERIC_COUNTER: (_, actor) => ({ event: event({ type: 'MODIFY_GENERIC_COUNTER', actor, cardId: 'field', delta: 1 }), summary: { kind: 'card-stat', stat: 'counter', count: 1, detail: { name: 'Private-field', from: 4, to: 3 } } }),
  DRAW_CARD: (_, actor) => ({ event: event({ type: 'DRAW_CARD', actor }), summary: movement(actor, 'hand', 'deck') }),
  MILL_CARD: (_, actor) => ({ event: event({ type: 'MILL_CARD', actor }), summary: movement(actor, 'cemetery', 'deck') }),
  MOVE_TOP_CARD_TO_EX: (_, actor) => ({ event: event({ type: 'MOVE_TOP_CARD_TO_EX', actor }), summary: movement(actor, 'ex', 'deck') }),
  MOVE_TOP_CARD_TO_BANISH: (_, actor) => ({ event: event({ type: 'MOVE_TOP_CARD_TO_BANISH', actor }), summary: movement(actor, 'banish', 'deck') }),
  TOGGLE_TAP: (_, actor) => ({ event: event({ type: 'TOGGLE_TAP', actor, cardId: 'field' }), summary: { kind: 'orientation' } }),
  TOGGLE_FLIP: (_, actor) => ({ event: event({ type: 'TOGGLE_FLIP', actor, cardId: 'evo' }), summary: { kind: 'face' } }),
  SET_CARD_FACE: (_, actor) => ({ event: event({ type: 'SET_CARD_FACE', actor, cardId: 'evo', faceSide: 'back' }), summary: { kind: 'face' } }),
  SEND_TO_BOTTOM: move('SEND_TO_BOTTOM', 'deck'),
  SEND_TO_BOTTOM_BATCH: moveBatch('SEND_TO_BOTTOM_BATCH', 'deck'),
  BANISH_CARD: move('BANISH_CARD', 'banish'),
  BANISH_CARDS_BATCH: moveBatch('BANISH_CARDS_BATCH', 'banish'),
  SEND_TO_CEMETERY: move('SEND_TO_CEMETERY', 'cemetery'),
  SEND_TO_CEMETERY_BATCH: moveBatch('SEND_TO_CEMETERY_BATCH', 'cemetery'),
  DISCARD_RANDOM_HAND_CARDS: (_, actor) => ({ event: event({ type: 'DISCARD_RANDOM_HAND_CARDS', actor, target: opposite(actor), count: 1 }), summary: movement(opposite(actor), 'cemetery', 'hand') }),
  RETURN_EVOLVE: (_, actor) => ({ event: event({ type: 'RETURN_EVOLVE', actor, cardId: 'evoUsed' }), summary: movement(actor, 'evolveDeck', 'field') }),
  PLAY_TO_FIELD: (_, actor) => ({ event: event({ type: 'PLAY_TO_FIELD', actor, cardId: 'hand1' }), summary: movement(actor, 'field', 'hand') }),
  EXTRACT_CARD: (_, actor) => ({ event: event({ type: 'EXTRACT_CARD', actor, cardId: 'd1' }), summary: movement(actor, 'hand', 'deck') }),
  EXTRACT_CARDS_BATCH: (_, actor) => ({ event: event({ type: 'EXTRACT_CARDS_BATCH', actor, cardIds: ['d1', 'd2'] }), summary: movement(actor, 'hand', 'deck', 2) }),
  SHUFFLE_DECK: (_, actor) => ({ event: event({ type: 'SHUFFLE_DECK', actor }), summary: { kind: 'shuffle' } }),
  MODIFY_PLAYER_STAT: (_, actor) => ({ event: event({ type: 'MODIFY_PLAYER_STAT', actor, playerKey: actor, stat: 'hp', delta: 1 }), summary: { kind: 'player-stat', player: actor, changes: [{ stat: 'hp', from: 21, to: 20 }] } }),
  RESOLVE_TOP_DECK: (_, actor) => ({ event: event({ type: 'RESOLVE_TOP_DECK', actor, results: [{ cardId: 'd1', action: 'hand' }, { cardId: 'd2', action: 'bottom' }] }), summary: { kind: 'look', counts: { hand: 1, top: 0, bottom: 1, field: 0, ex: 0, cemetery: 0 } } }),
  SPAWN_TOKEN: (_, actor) => ({ event: event({ type: 'SPAWN_TOKEN', actor, token: undoCard('token1', 'ex', actor, { isTokenCard: true }) }), summary: { kind: 'token' } }),
  SPAWN_TOKENS_BATCH: (_, actor) => ({ event: event({ type: 'SPAWN_TOKENS_BATCH', actor, tokens: ['token1', 'token2'].map(id => undoCard(id, 'ex', actor, { isTokenCard: true })) }), summary: { kind: 'token' } }),
  ATTACK_DECLARATION: (_, actor) => ({ event: event({ type: 'ATTACK_DECLARATION', actor, attackerCardId: 'field', target: { type: 'leader', player: opposite(actor) } }), summary: { kind: 'attack' } }),
  BOARD_BATCH: (state, actor) => ({ event: event({ type: 'BOARD_BATCH', actor, targets: getBoardUnits(state.cards, actor).filter(unit => unit.rootId === 'field' || unit.rootId === 'ex'), action: 'atk+', turnCount: state.turnCount, turnPlayer: state.turnPlayer }), summary: { kind: 'card-stat', stat: 'atk', count: 2 } }),
} satisfies Record<Operation, Factory>;

export const undoOperations = Object.keys(undoFixtures) as Operation[];
