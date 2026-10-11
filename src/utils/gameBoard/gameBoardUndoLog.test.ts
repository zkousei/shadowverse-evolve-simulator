import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../../types/game';
import type { GameSyncEvent } from '../../types/sync';
import { applyGameSyncEvent } from './gameSyncReducer';
import { buildUndoLogEffect, describeUndoOperation, sanitizeUndoDescription, type UndoDescription } from './gameBoardUndoLog';
import { createGameStateCheckpoint } from './gameBoardUndoHistory';
import { getBoardUnits } from './gameBoardMultiSelection';

const card = (id: string, zone = 'field-host') => ({ id, cardId: `catalog-${id}`, name: `Secret-${id}`, image: `private-image-${id}`, zone, owner: 'host' as const, baseCardType: 'follower' as const, isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } });
const board = (cards = [card('a'), card('b')]): SyncState => ({ ...initialState, gameStatus: 'playing', cards });
const apply = (state: SyncState, event: Omit<Extract<GameSyncEvent, { type: 'MODIFY_PLAYER_STAT' }>, 'id' | 'actor'>) => applyGameSyncEvent(state, { ...event, id: `stat-${state.revision}`, actor: 'host' });
const undoEffect = (state: SyncState) => buildUndoLogEffect(state, applyGameSyncEvent(state, { id: 'undo', type: 'UNDO_CARD_MOVE', actor: 'host' }), 'host');

it('reports the actual restored player values for a grouped adjustment including dependent PP', () => {
  const start = { ...board(), host: { ...initialState.host, maxPp: 5, pp: 5 } };
  const down = apply(start, { type: 'MODIFY_PLAYER_STAT', playerKey: 'host', stat: 'maxPp', delta: -2 });
  const changed = apply(down, { type: 'MODIFY_PLAYER_STAT', playerKey: 'host', stat: 'maxPp', delta: 2 });
  expect(undoEffect(changed)).toEqual({ type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'player-stat', player: 'host', changes: [{ stat: 'pp', from: 3, to: 5 }] } });
});
it.each(['field-host', 'ex-host', 'cemetery-host', 'banish-host'])('names a card only if both states are public in %s', zone => {
  const start = board([card('a', zone)]);
  const changed = applyGameSyncEvent(start, { id: 'atk', type: 'MODIFY_COUNTER', actor: 'host', cardId: 'a', stat: 'atk', delta: 2 });
  expect(undoEffect(changed)).toEqual({ type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'card-stat', stat: 'atk', count: 1, detail: { name: 'Secret-a', from: 2, to: 0 } } });
  const json = JSON.stringify(undoEffect(changed));
  expect(json).not.toContain('catalog-');
  expect(json).not.toContain('private-image');
});
it.each(['hand-host', 'mainDeck-host', 'evolveDeck-host', 'unknown-host'])('never includes private card details in a %s summary', zone => {
  const start = board([card('a', zone)]);
  const changed = zone === 'hand-host'
    ? { ...start, revision: start.revision + 1, cards: [{ ...start.cards[0], counters: { atk: 1, hp: 0 } }], cardMoveHistory: [{ actor: 'host' as const, state: createGameStateCheckpoint(start), description: { kind: 'atk' as const } }] }
    : applyGameSyncEvent(start, { id: 'atk', type: 'MODIFY_COUNTER', actor: 'host', cardId: 'a', stat: 'atk', delta: 1 });
  const effect = undoEffect(changed);
  expect(effect?.summary).toEqual({ kind: 'card-stat', stat: 'atk', count: 1 });
  expect(JSON.stringify(effect)).not.toMatch(/Secret|catalog-|private-image|cardId|rootId|signature/);
});
it('suppresses names and values for face-down cards even in public zones', () => {
  const start = board([{ ...card('a', 'ex-host'), isFlipped: true }]);
  const changed = applyGameSyncEvent(start, { id: 'atk', type: 'MODIFY_COUNTER', actor: 'host', cardId: 'a', stat: 'atk', delta: 1 });
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'card-stat', stat: 'atk', count: 1 });
});
it('summarizes mixed-side batches without identifiers or per-card values', () => {
  const start = { ...board(), cards: [card('a'), { ...card('b', 'field-guest'), owner: 'guest' as const }] };
  const changed = applyGameSyncEvent(start, { id: 'batch', type: 'BOARD_BATCH', actor: 'host', action: 'atk+', targets: [...getBoardUnits(start.cards, 'host'), ...getBoardUnits(start.cards, 'guest')], turnCount: start.turnCount, turnPlayer: start.turnPlayer });
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'card-stat', stat: 'atk', count: 2 });
});
it('reports look destinations as counts even for revealed cards returning to the deck', () => {
  const start = board([card('a', 'mainDeck-host'), card('b', 'mainDeck-host')]);
  const changed = applyGameSyncEvent(start, { id: 'look', type: 'RESOLVE_TOP_DECK', actor: 'host', results: [{ cardId: 'a', action: 'revealedHand' }, { cardId: 'b', action: 'bottom' }] });
  const effect = undoEffect(changed);
  expect(effect?.summary).toEqual({ kind: 'look', counts: { hand: 1, top: 0, bottom: 1, field: 0, ex: 0, cemetery: 0 } });
  expect(JSON.stringify(effect)).not.toMatch(/Secret|catalog-|private-image|cardId|rootId|signature/);
});
it('aggregates moves without revealing draw contents or exact deck positions', () => {
  const start = board([card('a', 'mainDeck-host'), card('b', 'mainDeck-host')]);
  const changed = applyGameSyncEvent(start, { id: 'draw', type: 'DRAW_CARD', actor: 'host' });
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'move', moves: [{ owner: 'host', from: 'hand', to: 'deck', count: 1 }] });
  expect(JSON.stringify(undoEffect(changed))).not.toMatch(/Secret|catalog-|private-image|cardId|index|position/);
});
it('falls back for legacy history and never emits a rejected undo', () => {
  const start = board();
  const legacy = { ...start, cards: [card('a', 'ex-host')], lastUndoableCardMoveActor: 'host' as const, lastUndoableCardMoveState: start };
  expect(undoEffect(legacy)?.summary).toEqual({ kind: 'generic' });
  expect(undoEffect(start)).toBeNull();
  expect(buildUndoLogEffect(legacy, legacy, 'guest')).toBeNull();
});
it('preserves descriptions when a numeric group closes without losing undo behavior', () => {
  const changed = apply(board(), { type: 'MODIFY_PLAYER_STAT', playerKey: 'host', stat: 'hp', delta: -1 });
  const closed = applyGameSyncEvent(changed, { id: 'roll', type: 'ROLL_SHARED_DIE', actor: 'host' });
  expect(undoEffect(closed)?.summary).toMatchObject({ kind: 'player-stat' });
});
describe('untrusted saved descriptions', () => {
  it('keeps only known public fields', () => {
    expect(sanitizeUndoDescription({ kind: 'atk', name: 'Secret', cardId: 'hidden' })).toEqual({ kind: 'atk' });
    expect(sanitizeUndoDescription({ kind: 'look', counts: { hand: 1, top: 0, bottom: 0, field: 0, ex: 0, cemetery: 0 }, results: ['hidden'] })).toEqual({ kind: 'look', counts: { hand: 1, top: 0, bottom: 0, field: 0, ex: 0, cemetery: 0 } });
  });
  it.each([undefined, null, { kind: 'unknown' }, { kind: 'look', counts: { hand: -1 } }, { kind: 'look', counts: { hand: 'secret' } }])('ignores malformed descriptions: %j', value => {
    expect(sanitizeUndoDescription(value)).toBeUndefined();
  });
});

it('uses zone sides rather than card ownership when describing cross-side movement', () => {
  const start = board([card('a', 'field-host')]);
  const changed: SyncState = { ...start, revision: 1, cards: [card('a', 'field-guest')], cardMoveHistory: [{ actor: 'host', state: createGameStateCheckpoint(start), description: { kind: 'move' } }] };
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'move', moves: [{ owner: 'host', sourceOwner: 'guest', from: 'field', to: 'field', count: 1 }] });
});

it('uses a generic description for operations outside the explicit allowlist', () => {
  expect(describeUndoOperation(board(), { id: 'phase', type: 'SET_PHASE', actor: 'host', phase: 'Main' })).toEqual({ kind: 'generic' });
});
it.each(['current', 'restored'])('omits card details when only the %s state is private', privateState => {
  const start = board([{ ...card('a'), isFlipped: privateState === 'restored' }]);
  const changed: SyncState = { ...start, revision: 1, cards: [{ ...card('a'), isFlipped: privateState === 'current', counters: { atk: 1, hp: 0 } }], cardMoveHistory: [{ actor: 'host', state: createGameStateCheckpoint(start), description: { kind: 'atk' } }] };
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'card-stat', stat: 'atk', count: 1 });
});

const savedUndoEffect = (before: SyncState, restored: SyncState, description: UndoDescription) => {
  const state = { ...before, revision: 1, cardMoveHistory: [{ actor: 'host' as const, state: createGameStateCheckpoint(restored), description }] };
  return undoEffect(state);
};
it.each(['current', 'restored'])('uses the generic fallback for an unknown zone in the %s saved state', unknownState => {
  const before = board([card('a', unknownState === 'current' ? 'unknown-private' : 'field-host')]);
  const restored = board([card('a', unknownState === 'restored' ? 'unknown-private' : 'ex-host')]);
  expect(savedUndoEffect(before, restored, { kind: 'move' })?.summary).toEqual({ kind: 'generic' });
});
it('safely describes removal of a card absent from the saved checkpoint', () => {
  expect(savedUndoEffect(board([card('a')]), board([]), { kind: 'move' })?.summary).toEqual({ kind: 'move', moves: [{ owner: 'host', from: 'field', to: 'outside', count: 1 }] });
});
it('uses zero for an absent legacy generic counter', () => {
  const start = board([card('a')]);
  const changed = applyGameSyncEvent(start, { id: 'counter', type: 'MODIFY_GENERIC_COUNTER', actor: 'host', cardId: 'a', delta: 1 });
  expect(undoEffect(changed)?.summary).toEqual({ kind: 'card-stat', stat: 'counter', count: 1, detail: { name: 'Secret-a', from: 1, to: 0 } });
});
it('does not invent numeric details when saved descriptions disagree with the restored fields', () => {
  const start = board();
  expect(savedUndoEffect(start, start, { kind: 'atk' })?.summary).toEqual({ kind: 'generic' });
  expect(savedUndoEffect(start, start, { kind: 'player-stat' })?.summary).toEqual({ kind: 'generic' });
  const bothChanged = { ...start, host: { ...start.host, hp: 19 }, guest: { ...start.guest, hp: 18 } };
  expect(savedUndoEffect(bothChanged, start, { kind: 'player-stat' })?.summary).toEqual({ kind: 'generic' });
});
it('counts only actor-deck cards and recognized destinations, deduplicating look IDs', () => {
  const state = board([card('a', 'mainDeck-host'), card('b', 'field-host'), card('c', 'mainDeck-guest')]);
  const rawEvent = { id: 'look', type: 'RESOLVE_TOP_DECK', actor: 'host', results: [
    { cardId: 'a', action: 'hand' }, { cardId: 'a', action: 'bottom' },
    { cardId: 'b', action: 'hand' }, { cardId: 'c', action: 'hand' }, { cardId: 'missing', action: 'hand' },
  ] };
  expect(describeUndoOperation(state, rawEvent as GameSyncEvent)).toEqual({ kind: 'look', counts: { hand: 0, top: 0, bottom: 1, field: 0, ex: 0, cemetery: 0 } });
  expect(describeUndoOperation(state, { ...rawEvent, results: [{ cardId: 'a', action: 'unknown-private' }] } as unknown as GameSyncEvent)).toEqual({ kind: 'look', counts: { hand: 0, top: 0, bottom: 0, field: 0, ex: 0, cemetery: 0 } });
});
