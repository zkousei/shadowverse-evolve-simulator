import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import en from '../../i18n/en/translation.json';
import ja from '../../i18n/ja/translation.json';
import type { GameStateCheckpoint, PlayerRole, SyncState } from '../../types/game';
import type { GameSyncEvent, SharedUiEffect } from '../../types/sync';
import { applyGameSyncEvent } from './gameSyncReducer';
import { buildUndoLogEffect } from './gameBoardUndoLog';
import { formatSharedUiMessage } from './sharedUiMessage';
import { boardBatchActions, getBoardUnits } from './gameBoardMultiSelection';
import { opposite, undoBoard, undoCard, undoFixtures, undoOperations } from './testing/undoFixtures';

const i18n = createInstance();
beforeAll(async () => { await i18n.init({ lng: 'en', interpolation: { escapeValue: false }, resources: { en: { translation: en }, ja: { translation: ja } } }); });
afterEach(() => vi.restoreAllMocks());
const roles: PlayerRole[] = ['host', 'guest'];
const modes = [false, true];
const undo = (state: SyncState, actor: PlayerRole, isSoloMode = false) =>
  applyGameSyncEvent(state, { id: 'undo', type: 'UNDO_CARD_MOVE', actor }, actor, { isSoloMode });
// A test-owned field manifest also fails type checking if a restorable field
// is added without extending the restoration assertions.
const restorableFields = {
  host: true, guest: true, cards: true, turnPlayer: true, startingPlayer: true, turnCount: true,
  phase: true, gameStatus: true, tokenOptions: true, revealHandsMode: true, endStop: true,
} satisfies Record<Exclude<keyof GameStateCheckpoint, 'revision'>, true>;
const expectRestored = (before: SyncState, restored: SyncState, revision: number) => {
  for (const field of Object.keys(restorableFields) as (keyof typeof restorableFields)[]) {
    expect(restored[field], `Restored ${field}`).toEqual(before[field]);
  }
  expect(restored.revision).toBe(revision);
};
const expectSafeMessage = (effect: SharedUiEffect) => {
  const names = effect.type === 'UNDO_COMPLETED' && effect.summary.kind === 'card-stat' && effect.summary.detail
    ? [effect.summary.detail.name] : [];
  expect(JSON.stringify(effect)).not.toMatch(/catalog-|private-image-|cardId|rootId|signature|position|index/);
  for (const lng of ['en', 'ja']) for (const viewer of roles) for (const playerLabels of modes) {
    const message = formatSharedUiMessage(effect, viewer, playerLabels, i18n.getFixedT(lng));
    expect(message).not.toMatch(/gameBoard\.undoLog|undefined|catalog-|private-image-/);
    for (const id of ['field', 'ex', 'hand1', 'hand2', 'evo', 'evoUsed', 'd1', 'd2', 'd3', 'opHand', 'token1', 'token2']) {
      if (!names.includes(`Private-${id}`)) expect(message).not.toContain(`Private-${id}`);
    }
  }
};

describe.each(roles)('%s operation Undo contracts', actor => {
  describe.each(modes)('solo=%s', isSoloMode => {
    it.each(undoOperations.flatMap(operation => [false, true].map(opponentTurn => [operation, opponentTurn] as const)))('restores and publicly describes %s, preserving the preceding Undo, opponentTurn=%s', (operation, opponentTurn) => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const start = undoBoard(actor);
      if (opponentTurn) start.turnPlayer = opposite(actor);
      // A different numeric target creates a preceding checkpoint without
      // changing the cards required by each operation's fixture.
      const before = applyGameSyncEvent(start, { id: 'prefix', type: 'MODIFY_PLAYER_STAT', actor, playerKey: opposite(actor), stat: 'ep', delta: 1 }, actor, { isSoloMode });
      const beforeJson = JSON.stringify(before);
      const { event, summary } = undoFixtures[operation](before, actor);
      expect(event.type).toBe(operation);
      const changed = applyGameSyncEvent(before, event, actor, { isSoloMode });
      expect(JSON.stringify(before)).toBe(beforeJson);
      if (opponentTurn && operation === 'ATTACK_DECLARATION') {
        // Expanding Undo availability must not permit attacks outside the actor's turn.
        expect(changed).toBe(before);
        expectRestored(start, undo(changed, actor, isSoloMode), before.revision + 1);
        return;
      }
      expect(changed.revision).toBe(before.revision + 1);
      expect(changed.cardMoveHistory).toHaveLength(2);
      // Wrong actor/requester cannot consume or disclose the checkpoint.
      expect(applyGameSyncEvent(changed, { id: 'forged', type: 'UNDO_CARD_MOVE', actor }, opposite(actor), { isSoloMode })).toBe(changed);
      const rejected = undo(changed, opposite(actor), isSoloMode);
      expect(rejected).toBe(changed);
      expect(buildUndoLogEffect(changed, rejected, opposite(actor))).toBeNull();
      const restored = undo(changed, actor, isSoloMode);
      expectRestored(before, restored, changed.revision + 1);
      expect(restored.cardMoveHistory).toHaveLength(1);
      const effect = buildUndoLogEffect(changed, restored, actor);
      expect(effect).toEqual({ type: 'UNDO_COMPLETED', actor, summary });
      expectSafeMessage(effect!);
      const original = undo(restored, actor, isSoloMode);
      expectRestored(start, original, restored.revision + 1);
      expect(original.cardMoveHistory).toHaveLength(0);
      expect(undo(original, actor, isSoloMode)).toBe(original);
      expect(buildUndoLogEffect(original, original, actor)).toBeNull();
    });
  });
});

const playerStats = ['hp', 'pp', 'maxPp', 'ep', 'sep', 'combo'] as const;
describe.each(roles)('%s numeric parameter coverage', actor => {
  it.each(playerStats.flatMap(stat => roles.flatMap(player => [1, -1].map(direction => ({ stat, player, direction })))))('groups $player $stat in direction $direction and the reverse direction', ({ stat, player, direction }) => {
    const start = undoBoard(actor);
    let current = start;
    for (const [index, delta] of [direction, 2 * direction, -direction].entries()) {
      current = applyGameSyncEvent(current, { id: `number-${index}`, type: 'MODIFY_PLAYER_STAT', actor, playerKey: player, stat, delta });
    }
    expect(current.cardMoveHistory).toHaveLength(1);
    const restored = undo(current, actor);
    expectRestored(start, restored, current.revision + 1);
    const changes = [{ stat, from: stat === 'maxPp' && direction === 1 ? 9 : start[player][stat] + 2 * direction, to: start[player][stat] }];
    expect(buildUndoLogEffect(current, restored, actor)?.summary).toEqual({ kind: 'player-stat', player, changes });
  });
  it.each(['atk', 'hp', 'counter'] as const)('groups card %s changes in both directions on each side', stat => {
    for (const side of roles) for (const direction of [1, -1]) {
      const start = { ...undoBoard(actor), cards: [undoCard('field', 'field', side)] };
      let current = start;
      for (const [index, delta] of [direction, 2 * direction, -direction].entries()) {
        const event: GameSyncEvent = stat === 'counter'
          ? { id: `card-${index}`, type: 'MODIFY_GENERIC_COUNTER', actor, cardId: 'field', delta }
          : { id: `card-${index}`, type: 'MODIFY_COUNTER', actor, cardId: 'field', stat, delta };
        current = applyGameSyncEvent(current, event);
      }
      expect(current.cardMoveHistory).toHaveLength(1);
      const restored = undo(current, actor);
      expectRestored(start, restored, current.revision + 1);
      expect(buildUndoLogEffect(current, restored, actor)?.summary).toEqual({ kind: 'card-stat', stat, count: 1, detail: { name: 'Private-field', from: 3 + 2 * direction, to: 3 } });
    }
  });
});

describe.each(roles)('%s look destination coverage', actor => {
  it.each(['hand', 'revealedHand', 'field', 'ex', 'cemetery', 'top', 'bottom'] as const)('restores a look sent to %s without exposing names or deck ordering', action => {
    const start = undoBoard(actor);
    const changed = applyGameSyncEvent(start, { id: 'look', type: 'RESOLVE_TOP_DECK', actor, results: [{ cardId: 'd2', action, order: 1 }, { cardId: 'd1', action, order: 2 }] });
    const restored = undo(changed, actor);
    expectRestored(start, restored, changed.revision + 1);
    const counts = { hand: 0, field: 0, ex: 0, cemetery: 0, top: 0, bottom: 0, [action === 'revealedHand' ? 'hand' : action]: 2 };
    expect(buildUndoLogEffect(changed, restored, actor)).toEqual({ type: 'UNDO_COMPLETED', actor, summary: { kind: 'look', counts } });
    expectSafeMessage(buildUndoLogEffect(changed, restored, actor)!);
  });
});

describe.each(roles)('%s turn Undo', actor => {
  it.each(modes)('restores all turn effects in solo=%s without reviving operation history', isSoloMode => {
    const before = undoBoard(actor);
    before.cards.push(undoCard('opField', 'field', opposite(actor), { isTapped: true }));
    const changed = applyGameSyncEvent(before, { id: 'end', type: 'END_TURN', actor }, actor, { isSoloMode });
    expect(changed.lastGameState).not.toBeNull();
    expect(changed.turnPlayer).toBe(opposite(actor));
    for (const requester of roles) {
      const restored = applyGameSyncEvent(changed, { id: 'turn-undo', type: 'UNDO_LAST_TURN', actor: requester }, requester, { isSoloMode });
      expectRestored(before, restored, changed.revision + 1);
      expect(restored.lastGameState).toBeNull();
      expect(restored.cardMoveHistory).toEqual([]);
      expect(applyGameSyncEvent(restored, { id: 'empty-turn', type: 'UNDO_LAST_TURN', actor: requester })).toBe(restored);
    }
  });
});

const topologies = ['plain', 'evolved', 'linked', 'three-card-stack'] as const;
const selections = ['own', 'opponent', 'mixed'] as const;
describe.each(roles)('%s complete batch coverage', actor => {
  it.each(boardBatchActions.flatMap(action => topologies.flatMap(topology => selections.flatMap(selection => modes.map(isSoloMode => ({ action, topology, selection, isSoloMode }))))))('$action / $topology / $selection / solo=$isSoloMode restores the entire unit atomically', ({ action, topology, selection, isSoloMode }) => {
    const sides: PlayerRole[] = selection === 'own' ? [actor, actor] : selection === 'opponent' ? [opposite(actor), opposite(actor)] : [actor, opposite(actor)];
    const roots = ['a', 'b'];
    const cards = roots.flatMap((id, index) => {
      const side = sides[index], zone = index === 0 ? 'field' : 'ex';
      const root = undoCard(id, zone, side, { isTapped: action === 'stand' });
      if (topology === 'plain') return [root];
      if (topology === 'evolved') return [root, undoCard(`${id}-evo`, zone, side, { isEvolveCard: true, attachedTo: id, isTapped: root.isTapped })];
      if (topology === 'linked') return [root, undoCard(`${id}-link`, zone, side, { isTokenCard: true, linkedTo: id, isTapped: root.isTapped })];
      return [root, undoCard(`${id}-middle`, zone, side, { attachedTo: id, isTapped: root.isTapped }),
        undoCard(`${id}-evo`, zone, side, { isEvolveCard: true, attachedTo: `${id}-middle`, isTapped: root.isTapped }),
        undoCard(`${id}-link`, zone, side, { isTokenCard: true, linkedTo: id, isTapped: root.isTapped })];
    });
    const start = { ...undoBoard(actor), cards };
    const targets = [...getBoardUnits(cards, 'host'), ...getBoardUnits(cards, 'guest')];
    const event: GameSyncEvent = { id: 'batch', type: 'BOARD_BATCH', actor, action, targets, turnCount: start.turnCount, turnPlayer: actor };
    const changed = applyGameSyncEvent(start, event, actor, { isSoloMode });
    expect(changed.revision).toBe(start.revision + 1);
    expect(changed.cardMoveHistory).toHaveLength(1);
    const restored = undo(changed, actor, isSoloMode);
    expectRestored(start, restored, changed.revision + 1);
    const effect = buildUndoLogEffect(changed, restored, actor)!;
    if (action === 'rest' || action === 'stand') {
      expect(changed.cards.every(card => card.isTapped === (action === 'rest'))).toBe(true);
      expect(effect.summary).toEqual({ kind: 'orientation' });
    } else if (action === 'cemetery' || action === 'banish') {
      expect(effect.summary.kind).toBe('move');
      if (effect.summary.kind !== 'move') throw new Error('Expected a move summary');
      const expected = sides.flatMap((owner, index) => {
        const to = index === 0 ? 'field' as const : 'ex' as const;
        return [{ owner, from: action, to, count: topology === 'three-card-stack' ? 2 : 1 },
          ...(topology === 'evolved' || topology === 'three-card-stack' ? [{ owner, from: 'evolveDeck' as const, to, count: 1 }] : []),
          ...(topology === 'linked' || topology === 'three-card-stack' ? [{ owner, from: 'outside' as const, to, count: 1 }] : [])];
      });
      expect(effect.summary.moves).toHaveLength(expected.length);
      expect(effect.summary.moves).toEqual(expect.arrayContaining(expected));
    } else {
      const stat = action.startsWith('atk') ? 'atk' : action.startsWith('hp') ? 'hp' : 'counter';
      expect(effect.summary).toEqual({ kind: 'card-stat', stat, count: 2 });
      // Contiguous +/- operations on this exact batch must still be one Undo.
      const inverse = `${stat}${action.endsWith('+') ? '-' : '+'}` as typeof action;
      const second = applyGameSyncEvent(changed, { ...event, id: 'second' }, actor, { isSoloMode });
      const third = applyGameSyncEvent(second, { ...event, id: 'inverse', action: inverse }, actor, { isSoloMode });
      expect(third.cardMoveHistory).toHaveLength(1);
      const back = undo(third, actor, isSoloMode);
      expectRestored(start, back, third.revision + 1);
      expect(buildUndoLogEffect(third, back, actor)?.summary).toEqual({ kind: 'card-stat', stat, count: 2 });
    }
    expectSafeMessage(effect);
    const reversed = { ...start, cards: [...cards].reverse() };
    const reordered = applyGameSyncEvent(reversed, { ...event, targets: [...targets].reverse() }, actor, { isSoloMode });
    expect(buildUndoLogEffect(reordered, undo(reordered, actor, isSoloMode), actor)).toEqual(effect);
  });
});

describe.each(roles)('%s movement variants', actor => {
  it.each(['hand', 'field', 'ex', 'cemetery', 'banish', 'mainDeck'] as const)('restores search moves to %s on either side without exposing the deck card', zone => {
    for (const side of roles) for (const batch of [false, true]) {
      const start = undoBoard(actor);
      const event: GameSyncEvent = batch
        ? { id: 'search', type: 'EXTRACT_CARDS_BATCH', actor, cardIds: ['d1', 'd2'], destination: `${zone}-${side}` }
        : { id: 'search', type: 'EXTRACT_CARD', actor, cardId: 'd1', destination: `${zone}-${side}`, revealToOpponent: true };
      const changed = applyGameSyncEvent(start, event);
      const restored = undo(changed, actor);
      expectRestored(start, restored, changed.revision + 1);
      const effect = buildUndoLogEffect(changed, restored, actor)!;
      if (zone === 'mainDeck') {
        // Deck destinations follow card ownership even when the requested side differs.
        expect(changed.cards.find(card => card.id === 'd1')!.zone).toBe(`mainDeck-${actor}`);
        expect(effect.summary).toEqual({ kind: 'generic' });
      }
      else expect(effect.summary).toEqual({ kind: 'move', moves: [{ owner: actor, ...(side !== actor ? { sourceOwner: side } : {}), from: zone, to: 'deck', count: batch ? 2 : 1 }] });
      expectSafeMessage(effect);
    }
  });
  it.each(['MOVE_CARD', 'LINK_CARD_TO_FIELD', 'EXTRACT_CARD'] as const)('restores %s attachment/link changes without disclosing positions', type => {
    const start = undoBoard(actor);
    if (type === 'LINK_CARD_TO_FIELD') start.cards.find(card => card.id === 'evo')!.zone = `field-${actor}`;
    const event: GameSyncEvent = type === 'MOVE_CARD' ? { id: 'attach', type, actor, cardId: 'evo', overId: 'field' }
      : type === 'EXTRACT_CARD' ? { id: 'attach', type, actor, cardId: 'evo', attachToCardId: 'field' }
        : { id: 'link', type, actor, cardId: 'evo', parentCardId: 'field' };
    const changed = applyGameSyncEvent(start, event);
    expect(changed.cards.find(card => card.id === 'evo')).toMatchObject(type === 'LINK_CARD_TO_FIELD' ? { linkedTo: 'field' } : { attachedTo: 'field' });
    const restored = undo(changed, actor);
    expectRestored(start, restored, changed.revision + 1);
    expect(buildUndoLogEffect(changed, restored, actor)?.summary).toEqual(type === 'LINK_CARD_TO_FIELD'
      ? { kind: 'generic' } : { kind: 'move', moves: [{ owner: actor, from: 'field', to: 'evolveDeck', count: 1 }] });
  });
  it('restores spell play to the hand after its automatic cemetery move', () => {
    const start = undoBoard(actor);
    start.cards.find(card => card.id === 'hand1')!.baseCardType = 'spell';
    const changed = applyGameSyncEvent(start, { id: 'spell', type: 'PLAY_TO_FIELD', actor, cardId: 'hand1' });
    expect(changed.cards.find(card => card.id === 'hand1')!.zone).toBe(`cemetery-${actor}`);
    const restored = undo(changed, actor);
    expectRestored(start, restored, changed.revision + 1);
    expect(buildUndoLogEffect(changed, restored, actor)?.summary).toEqual({ kind: 'move', moves: [{ owner: actor, from: 'cemetery', to: 'hand', count: 1 }] });
  });
  it('restores an attack against a card, using no card names in its undo message', () => {
    const start = undoBoard(actor);
    start.cards.push(undoCard('target', 'field', opposite(actor)));
    const changed = applyGameSyncEvent(start, { id: 'attack', type: 'ATTACK_DECLARATION', actor, attackerCardId: 'field', target: { type: 'card', cardId: 'target' } });
    const restored = undo(changed, actor);
    expectRestored(start, restored, changed.revision + 1);
    expect(buildUndoLogEffect(changed, restored, actor)?.summary).toEqual({ kind: 'attack' });
  });
});

describe.each(roles)('%s rejected/no-op Undo effects', actor => {
  it.each(boardBatchActions)('does not log or consume history for rejected %s batches', action => {
    const start = undoBoard(actor);
    const before = applyGameSyncEvent(start, { id: 'prefix', type: 'MODIFY_PLAYER_STAT', actor, playerKey: actor, stat: 'ep', delta: 1 });
    const event: Extract<GameSyncEvent, { type: 'BOARD_BATCH' }> = { id: 'rejected', type: 'BOARD_BATCH', actor, action, targets: getBoardUnits(before.cards, actor), turnCount: before.turnCount, turnPlayer: before.turnPlayer };
    const invalid = [
      { ...event, turnCount: before.turnCount + 1 },
      { ...event, turnPlayer: opposite(actor) },
      { ...event, targets: [] },
      { ...event, targets: [{ rootId: 'field', signature: 'stale' }] },
      { ...event, targets: [{ rootId: 'missing', signature: '' }] },
    ];
    for (const request of invalid) {
      const unchanged = applyGameSyncEvent(before, request);
      expect(unchanged).toBe(before);
      expect(buildUndoLogEffect(before, unchanged, actor)).toBeNull();
    }
    const unauthorized = applyGameSyncEvent(before, event, opposite(actor));
    expect(unauthorized).toBe(before);
    expect(buildUndoLogEffect(before, unauthorized, actor)).toBeNull();
    expectRestored(start, undo(before, actor), before.revision + 1);
  });
  it.each(['atk', 'hp', 'counter'] as const)('cancelled %s batches retain the preceding history without creating an Undo log', stat => {
    const start = undoBoard(actor);
    const before = applyGameSyncEvent(start, { id: 'prefix', type: 'MODIFY_PLAYER_STAT', actor, playerKey: actor, stat: 'ep', delta: 1 });
    const event: Extract<GameSyncEvent, { type: 'BOARD_BATCH' }> = { id: 'increase', type: 'BOARD_BATCH', actor, action: `${stat}+`, targets: getBoardUnits(before.cards, actor), turnCount: before.turnCount, turnPlayer: before.turnPlayer };
    const increased = applyGameSyncEvent(before, event);
    const cancelled = applyGameSyncEvent(increased, { ...event, id: 'cancel', action: `${stat}-` });
    expect(cancelled.cardMoveHistory).toHaveLength(1);
    const restored = undo(cancelled, actor);
    expectRestored(start, restored, cancelled.revision + 1);
    expect(buildUndoLogEffect(cancelled, restored, actor)?.summary).toEqual({ kind: 'player-stat', player: actor, changes: [{ stat: 'ep', from: 4, to: 3 }] });
  });
  it('preserves earlier Undo and emits nothing for capped counters and unchanged tap state', () => {
    const start = undoBoard(actor);
    start.cards = [undoCard('field', 'field', actor, { genericCounter: 0 })];
    const before = applyGameSyncEvent(start, { id: 'prefix', type: 'MODIFY_PLAYER_STAT', actor, playerKey: actor, stat: 'ep', delta: 1 });
    for (const action of ['counter-', 'stand'] as const) {
      const unchanged = applyGameSyncEvent(before, { id: 'noop', type: 'BOARD_BATCH', actor, action, targets: getBoardUnits(before.cards, actor), turnCount: before.turnCount, turnPlayer: actor });
      expect(unchanged.revision).toBe(before.revision);
      expect(unchanged.cardMoveHistory).toHaveLength(1);
      expect(buildUndoLogEffect(before, unchanged, actor)).toBeNull();
      expectRestored(start, undo(unchanged, actor), before.revision + 1);
    }
    for (const stat of playerStats) {
      const unchanged = applyGameSyncEvent(before, { id: 'zero', type: 'MODIFY_PLAYER_STAT', actor, playerKey: actor, stat, delta: 0 });
      expect(unchanged.revision).toBe(before.revision);
      expect(buildUndoLogEffect(before, unchanged, actor)).toBeNull();
    }
  });
});

describe.each(roles)('%s reverse tap and face transitions', actor => {
  it.each(['TOGGLE_TAP', 'TOGGLE_FLIP', 'SET_CARD_FACE'] as const)('restores the reverse %s transition', type => {
    const start = undoBoard(actor);
    start.cards.find(card => card.id === 'field')!.isTapped = true;
    const evolve = start.cards.find(card => card.id === 'evo')!;
    evolve.isFlipped = true;
    evolve.selectedFaceSide = 'back';
    const event: GameSyncEvent = type === 'SET_CARD_FACE' ? { id: 'front', type, actor, cardId: 'evo', faceSide: 'front' }
      : { id: 'reverse', type, actor, cardId: type === 'TOGGLE_TAP' ? 'field' : 'evo' };
    const changed = applyGameSyncEvent(start, event);
    const restored = undo(changed, actor);
    expectRestored(start, restored, changed.revision + 1);
    expect(buildUndoLogEffect(changed, restored, actor)?.summary).toEqual({ kind: type === 'TOGGLE_TAP' ? 'orientation' : 'face' });
  });
});

// These fixtures use hand/deck sources that the current preparation rules lock.
// Other preparation fixtures exercise permitted changes without starting play.
const blockedPreparationFixtures = new Set<typeof undoOperations[number]>([
  'MOVE_CARD', 'LINK_CARD_TO_FIELD', 'DRAW_CARD', 'MILL_CARD', 'MOVE_TOP_CARD_TO_EX',
  'MOVE_TOP_CARD_TO_BANISH', 'SEND_TO_BOTTOM_BATCH', 'BANISH_CARDS_BATCH',
  'SEND_TO_CEMETERY_BATCH', 'DISCARD_RANDOM_HAND_CARDS', 'PLAY_TO_FIELD',
  'ATTACK_DECLARATION', 'BOARD_BATCH',
]);
describe.each(roles)('%s preparation Undo rules', actor => {
  it.each(undoOperations)('%s respects preparation guards before creating a checkpoint or log', operation => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const before = { ...undoBoard(actor), gameStatus: 'preparing' as const };
    const { event, summary } = undoFixtures[operation](before, actor);
    const changed = applyGameSyncEvent(before, event);
    if (blockedPreparationFixtures.has(operation)) {
      expect(changed).toBe(before);
      expect(changed.cardMoveHistory).toHaveLength(0);
      expect(buildUndoLogEffect(before, changed, actor)).toBeNull();
    } else {
      expect(changed.revision).toBe(before.revision + 1);
      const restored = undo(changed, actor);
      expectRestored(before, restored, changed.revision + 1);
      expect(buildUndoLogEffect(changed, restored, actor)).toEqual({ type: 'UNDO_COMPLETED', actor, summary });
    }
  });
});
