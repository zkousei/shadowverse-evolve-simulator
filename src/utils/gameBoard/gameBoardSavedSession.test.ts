import { buildUndoLogEffect } from './gameBoardUndoLog';
import { describe, expect, it, vi } from 'vitest';
import { applyGameSyncEvent } from './gameSyncReducer';
import { initialState, type SyncState } from '../../types/game';
import {
  readSavedHostSession,
  removeSavedHostSession,
  buildSavedHostSessionPayload,
  getHostSessionStorageKey,
  getSavedHostSessionPersistenceDecision,
  hasMeaningfulGameSessionState,
  parseSavedHostSession,
  persistSavedHostSession,
} from './gameBoardSavedSession';

const buildState = (overrides: Partial<SyncState> = {}): SyncState => ({
  ...initialState,
  ...overrides,
  host: {
    ...initialState.host,
    ...overrides.host,
  },
  guest: {
    ...initialState.guest,
    ...overrides.guest,
  },
  tokenOptions: {
    ...initialState.tokenOptions,
    ...overrides.tokenOptions,
  },
});

describe('gameBoardSavedSession', () => {
  it('restores the supported schema across application releases', () => {
    const payload = buildSavedHostSessionPayload('ROOM', '1.0.1', buildState({ turnCount: 3 }), 'now');
    expect(payload.sessionSchemaVersion).toBe(1);
    expect(parseSavedHostSession(JSON.stringify(payload), 'ROOM')?.state.turnCount).toBe(3);
  });

  it.each([0, 2, -1, '1', null])('rejects unsupported or malformed schema %s even for the same release', sessionSchemaVersion => {
    const payload = { ...buildSavedHostSessionPayload('ROOM', '1.0.1', buildState(), 'now'), sessionSchemaVersion };
    expect(parseSavedHostSession(JSON.stringify(payload), 'ROOM')).toBeNull();
  });

  it.each(['v1.0.1', '1.0.1', '1.1.0', 'custom'])('rejects unversioned sessions regardless of app version %s', appVersion => {
    const legacy = { room: 'ROOM', appVersion, savedAt: 'now', state: buildState() };
    expect(parseSavedHostSession(JSON.stringify(legacy), 'ROOM')).toBeNull();
  });

  it('keeps room, metadata and state validation for versioned sessions', () => {
    const payload = buildSavedHostSessionPayload('ROOM', '1.0.1', buildState(), 'now');
    expect(parseSavedHostSession(JSON.stringify(payload), 'OTHER')).toBeNull();
    for (const invalid of [{ state: {} }, { savedAt: null }, { appVersion: null }]) {
      expect(parseSavedHostSession(JSON.stringify({ ...payload, ...invalid }), 'ROOM')).toBeNull();
    }
  });

  it('deletes the old key without reading or changing the current saved match', () => {
    const current = JSON.stringify(buildSavedHostSessionPayload('ROOM', '1.1.0', buildState({ turnCount: 3 }), 'now'));
    const entries = new Map([
      ['sv-evolve:host-session:ROOM', 'old data'],
      [getHostSessionStorageKey('ROOM'), current],
      ['sv-evolve:host-session:OTHER', 'another room'],
      ['unrelated', 'keep'],
    ]);
    const storage = {
      getItem: vi.fn((key: string) => entries.get(key) ?? null),
      removeItem: vi.fn((key: string) => { entries.delete(key); }),
    };
    expect(readSavedHostSession(storage, 'ROOM')?.state.turnCount).toBe(3);
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(getHostSessionStorageKey('ROOM'));
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith('sv-evolve:host-session:ROOM');
    expect(entries.get(getHostSessionStorageKey('ROOM'))).toBe(current);
    expect(entries.get('sv-evolve:host-session:OTHER')).toBe('another room');
    expect(entries.get('unrelated')).toBe('keep');
  });

  it('does not delete another room through a legacy-key namespace collision', () => {
    const key = getHostSessionStorageKey('ROOM');
    const current = JSON.stringify(buildSavedHostSessionPayload('ROOM', '1.1.0', buildState({ turnCount: 3 }), 'now'));
    const entries = new Map([[key, current]]);
    const storage = {
      getItem: (storageKey: string) => entries.get(storageKey) ?? null,
      removeItem: (storageKey: string) => { entries.delete(storageKey); },
    };
    expect(readSavedHostSession(storage, 'versioned:ROOM')).toBeNull();
    expect(entries.get(key)).toBe(current);
    removeSavedHostSession(storage, 'versioned:ROOM');
    expect(entries.get(key)).toBe(current);
    const payload = buildSavedHostSessionPayload('versioned:ROOM', '1.1.0', buildState(), 'now');
    persistSavedHostSession({ ...storage, setItem: (storageKey, value) => { entries.set(storageKey, value); } }, getHostSessionStorageKey('versioned:ROOM'), payload);
    expect(entries.get(key)).toBe(current);
  });

  it('does not offer an old save when there is no new save', () => {
    const entries = new Map([['sv-evolve:host-session:ROOM', JSON.stringify({
      room: 'ROOM', appVersion: '1.1.0', savedAt: 'now', state: buildState({ turnCount: 3 }),
    })]]);
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      removeItem: (key: string) => { entries.delete(key); },
    };
    expect(readSavedHostSession(storage, 'ROOM')).toBeNull();
    expect(entries.size).toBe(0);
  });

  it('keeps current save restoration working if old-key cleanup is denied', () => {
    const current = JSON.stringify(buildSavedHostSessionPayload('ROOM', '1.1.0', buildState({ turnCount: 3 }), 'now'));
    const storage = {
      getItem: () => current,
      removeItem: vi.fn(() => { throw new Error('denied'); }),
    };
    expect(readSavedHostSession(storage, 'ROOM')?.state.turnCount).toBe(3);
  });

  it('removes both save formats when discarding or clearing a fresh board', () => {
    const storage = { removeItem: vi.fn() };
    removeSavedHostSession(storage, 'ROOM');
    expect(storage.removeItem.mock.calls).toEqual([
      [getHostSessionStorageKey('ROOM')], ['sv-evolve:host-session:ROOM'],
    ]);
  });

  it('preserves the guest starter when saving, restoring and undoing a turn', () => {
    const ordered = applyGameSyncEvent(buildState(), { id: 'order', type: 'SET_INITIAL_TURN_ORDER', actor: 'host', starter: 'guest', manual: true });
    const started = applyGameSyncEvent(ordered, { id: 'start', type: 'START_GAME', actor: 'host' });
    const ended = applyGameSyncEvent(started, { id: 'end', type: 'END_TURN', actor: 'guest' });
    const payload = buildSavedHostSessionPayload('ROOM', 'test', ended, 'now');
    const loaded = parseSavedHostSession(JSON.stringify(payload), 'ROOM');
    expect(loaded?.state).toMatchObject({ startingPlayer: 'guest', turnPlayer: 'host', turnCount: 1 });
    const undone = applyGameSyncEvent(loaded!.state, { id: 'undo', type: 'UNDO_LAST_TURN', actor: 'host' });
    expect(undone).toMatchObject({ startingPlayer: 'guest', turnPlayer: 'guest', turnCount: 1 });
    const next = applyGameSyncEvent(loaded!.state, { id: 'next', type: 'END_TURN', actor: 'host' });
    expect(next).toMatchObject({ turnPlayer: 'guest', turnCount: 2 });
  });

  it('continues schema 1 sessions without guessing or changing their existing turn count', () => {
    const payload = buildSavedHostSessionPayload('ROOM', 'test', buildState({ gameStatus: 'playing', turnPlayer: 'guest', turnCount: 4 }), 'now');
    const raw = JSON.parse(JSON.stringify(payload));
    delete raw.state.startingPlayer;
    const loaded = parseSavedHostSession(JSON.stringify(raw), 'ROOM');
    expect(loaded?.state.turnCount).toBe(4);
    const next = applyGameSyncEvent(loaded!.state, { id: 'next', type: 'END_TURN', actor: 'guest' });
    expect(next).toMatchObject({ turnPlayer: 'host', turnCount: 5 });
    const undone = applyGameSyncEvent(next, { id: 'undo-legacy', type: 'UNDO_LAST_TURN', actor: 'host' });
    expect(undone).toMatchObject({ turnPlayer: 'guest', turnCount: 4 });
    expect(undone).not.toHaveProperty('startingPlayer');
  });

  it.each(['invalid', null, 1])('rejects an invalid optional starting player %s', startingPlayer => {
    const payload = { sessionSchemaVersion: 1, room: 'ROOM', appVersion: 'test', savedAt: 'now', state: { ...buildState(), startingPlayer } };
    expect(parseSavedHostSession(JSON.stringify(payload), 'ROOM')).toBeNull();
  });

  it.each([undefined, 0, 4])('preserves a valid optional reset revision %s while reading a saved session', marker => {
    const state = buildState({ revision: 8, ...(marker === undefined ? {} : { lastResetRevision: marker }) });
    const payload = buildSavedHostSessionPayload('ROOM', 'test', state, 'now');
    const loaded = parseSavedHostSession(JSON.stringify(payload), 'ROOM');
    expect(loaded?.state).toMatchObject({ revision: 8 });
    if (marker === undefined) expect(loaded?.state).not.toHaveProperty('lastResetRevision');
    else expect(loaded?.state).toHaveProperty('lastResetRevision', marker);
    // A reset marker alone does not turn a fresh empty room into a saved match.
    expect(hasMeaningfulGameSessionState(state)).toBe(false);
  });

  it.each([-1, 1.5, 9, '4', null])('rejects an invalid reset revision %s in saved data', lastResetRevision => {
    const state = { ...buildState({ revision: 8 }), lastResetRevision };
    const payload = { sessionSchemaVersion: 1, room: 'ROOM', appVersion: 'test', savedAt: 'now', state };
    expect(parseSavedHostSession(JSON.stringify(payload), 'ROOM')).toBeNull();
  });

  it('builds the host session storage key', () => {
    expect(getHostSessionStorageKey('ROOM123')).toBe('sv-evolve:host-session:versioned:ROOM123');
  });

  it('builds a saved host session payload without reshaping the state', () => {
    const state = buildState({ revision: 7, turnCount: 3, phase: 'Main', gameStatus: 'playing' });

    expect(buildSavedHostSessionPayload('ROOM123', '1.2.3', state, '2026-03-19T10:00:00.000Z')).toEqual({
      sessionSchemaVersion: 1,
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state,
    });
  });

  it('decides to skip persistence before saved-session bootstrapping completes or while a candidate is pending', () => {
    const state = buildState({ turnCount: 3, phase: 'Main', gameStatus: 'playing' });

    expect(getSavedHostSessionPersistenceDecision({
      hasCheckedSavedSession: false,
      isSoloMode: false,
      isHost: true,
      room: 'ROOM123',
      savedSessionCandidate: null,
      state,
      appVersion: '1.2.3',
      savedAt: '2026-03-19T10:00:00.000Z',
    })).toEqual({ type: 'skip' });

    expect(getSavedHostSessionPersistenceDecision({
      hasCheckedSavedSession: true,
      isSoloMode: false,
      isHost: true,
      room: 'ROOM123',
      savedSessionCandidate: buildSavedHostSessionPayload('ROOM123', '1.2.3', state, '2026-03-19T10:00:00.000Z'),
      state,
      appVersion: '1.2.3',
      savedAt: '2026-03-19T10:00:00.000Z',
    })).toEqual({ type: 'skip' });
  });

  it('decides to remove fresh boards and persist meaningful boards', () => {
    expect(getSavedHostSessionPersistenceDecision({
      hasCheckedSavedSession: true,
      isSoloMode: false,
      isHost: true,
      room: 'ROOM123',
      savedSessionCandidate: null,
      state: buildState(),
      appVersion: '1.2.3',
      savedAt: '2026-03-19T10:00:00.000Z',
    })).toEqual({
      type: 'remove',
      storageKey: 'sv-evolve:host-session:versioned:ROOM123',
    });

    const meaningfulState = buildState({ turnCount: 3, phase: 'Main', gameStatus: 'playing' });
    expect(getSavedHostSessionPersistenceDecision({
      hasCheckedSavedSession: true,
      isSoloMode: false,
      isHost: true,
      room: 'ROOM123',
      savedSessionCandidate: null,
      state: meaningfulState,
      appVersion: '1.2.3',
      savedAt: '2026-03-19T10:00:00.000Z',
    })).toEqual({
      type: 'persist',
      storageKey: 'sv-evolve:host-session:versioned:ROOM123',
      payload: {
        sessionSchemaVersion: 1,
        room: 'ROOM123',
        savedAt: '2026-03-19T10:00:00.000Z',
        appVersion: '1.2.3',
        state: meaningfulState,
      },
    });
  });

  it('parses a saved session only when room, schema, and state shape are valid', () => {
    const state = buildState({ revision: 7, turnCount: 3, phase: 'Main', gameStatus: 'playing' });
    const raw = JSON.stringify({
      sessionSchemaVersion: 1,
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state,
    });

    expect(parseSavedHostSession(raw, 'ROOM123')).toEqual({
      sessionSchemaVersion: 1,
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state,
    });
    expect(parseSavedHostSession(raw, 'ROOM999')).toBeNull();
    expect(parseSavedHostSession('{"broken"', 'ROOM123')).toBeNull();
    expect(
      parseSavedHostSession(
        JSON.stringify({ sessionSchemaVersion: 1, room: 'ROOM123', savedAt: 'x', appVersion: '1.2.3', state: {} }),
        'ROOM123'
      )
    ).toBeNull();
  });

  it('fills in optional end stop flags within schema 1 sessions', () => {
    const legacyState = { ...buildState({ revision: 7 }), endStop: undefined };
    const raw = JSON.stringify({
      sessionSchemaVersion: 1,
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state: legacyState,
    });

    expect(parseSavedHostSession(raw, 'ROOM123')).toEqual({
      sessionSchemaVersion: 1,
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state: buildState({ revision: 7 }),
    });
  });

  it('treats only non-fresh boards as meaningful resumable sessions', () => {
    expect(hasMeaningfulGameSessionState(buildState())).toBe(false);
    expect(hasMeaningfulGameSessionState(buildState({
      cards: [{
        id: 'c1',
        cardId: 'BP01-001',
        name: 'Card',
        image: '',
        zone: 'mainDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
      }],
    }))).toBe(true);
    expect(hasMeaningfulGameSessionState(buildState({ turnCount: 2 }))).toBe(true);
    expect(hasMeaningfulGameSessionState(buildState({
      endStop: {
        host: true,
        guest: false,
      },
    }))).toBe(true);
  });
});


describe('saved undo history', () => {
  const parse = (state: unknown) => parseSavedHostSession(JSON.stringify({
    sessionSchemaVersion: 1, room: 'ROOM123', appVersion: '1.2.3', savedAt: 'today', state,
  }), 'ROOM123')?.state;

  it('round-trips multiple checkpoints and can undo after resume', () => {
    const oldest = buildState({ revision: 2, host: { ...initialState.host, hp: 18 } });
    const latest = buildState({ revision: 3, host: { ...initialState.host, hp: 19 } });
    const restored = parse(buildState({
      revision: 4,
      cardMoveHistory: [{ actor: 'host', state: oldest }, { actor: 'host', state: latest }],
    }))!;
    expect(restored.lastUndoableCardMoveState?.host.hp).toBe(19);
    const first = applyGameSyncEvent(restored, { id: 'one', type: 'UNDO_CARD_MOVE', actor: 'host' });
    const second = applyGameSyncEvent(first, { id: 'two', type: 'UNDO_CARD_MOVE', actor: 'host' });
    expect(second.host.hp).toBe(18);
    expect(second.revision).toBe(6);
    expect(second.cardMoveHistory).toEqual([]);
  });

  it('restores grouped history but starts a fresh numeric group after resume', () => {
    const event = { id: 'stat', type: 'MODIFY_PLAYER_STAT' as const, actor: 'host' as const, playerKey: 'host' as const, stat: 'hp' as const, delta: -1 };
    const start = buildState({ gameStatus: 'playing' });
    const grouped = applyGameSyncEvent(applyGameSyncEvent(start, event), { ...event, id: 'second' });
    expect(grouped.cardMoveHistory).toHaveLength(1);
    const restored = parse(grouped)!;
    const next = applyGameSyncEvent(restored, { ...event, id: 'after-resume' });
    expect(next.cardMoveHistory).toHaveLength(2);
    const undone = applyGameSyncEvent(next, { id: 'undo', type: 'UNDO_CARD_MOVE', actor: 'host' });
    expect(undone.host.hp).toBe(grouped.host.hp);
    expect(applyGameSyncEvent(undone, { id: 'undo-earlier', type: 'UNDO_CARD_MOVE', actor: 'host' }).host.hp).toBe(start.host.hp);
  });
  it('preserves only sanitized undo descriptions when resuming grouped history', () => {
    const start = buildState({ gameStatus: 'playing' });
    const event = { id: 'stat', type: 'MODIFY_PLAYER_STAT' as const, actor: 'host' as const, playerKey: 'host' as const, stat: 'hp' as const, delta: -1 };
    const changed = applyGameSyncEvent(applyGameSyncEvent(start, event), { ...event, id: 'second' });
    const restored = parse(changed)!;
    const undone = applyGameSyncEvent(restored, { id: 'undo', type: 'UNDO_CARD_MOVE', actor: 'host' });
    expect(buildUndoLogEffect(restored, undone, 'host')?.summary).toEqual({ kind: 'player-stat', player: 'host', changes: [{ stat: 'hp', from: 18, to: 20 }] });
    const poisoned = parse({ ...changed, cardMoveHistory: [{ ...changed.cardMoveHistory![0], description: { kind: 'atk', cardId: 'private-id', name: 'Secret' } }] })!;
    expect(poisoned.cardMoveHistory?.[0].description).toEqual({ kind: 'atk' });
    const invalid = parse({ ...changed, cardMoveHistory: [{ ...changed.cardMoveHistory![0], description: { kind: 'look', counts: { hand: -1 } } }] })!;
    expect(invalid.cardMoveHistory?.[0].description).toBeUndefined();
    expect(invalid.cardMoveHistory).toHaveLength(1);
  });
  it('migrates a legacy single checkpoint and removes nested backups', () => {
    const state = parse(buildState({
      cardMoveHistory: undefined,
      lastUndoableCardMoveActor: 'guest',
      lastUndoableCardMoveState: buildState({ lastGameState: buildState() }),
    }))!;
    expect(state.cardMoveHistory).toHaveLength(1);
    expect(state.cardMoveHistory?.[0].state).not.toHaveProperty('lastGameState');
    expect(state.cardMoveHistory?.[0].state).not.toHaveProperty('cardMoveHistory');
  });

  it.each([null, {}, [{ actor: 'invalid', state: buildState() }], [{ actor: 'host', state: {} }]])(
    'discards malformed history without losing the current board: %j', (history) => {
      const state = parse({ ...buildState({ revision: 7 }), cardMoveHistory: history })!;
      expect(state.revision).toBe(7);
      expect(state.cardMoveHistory).toEqual([]);
      expect(state.lastUndoableCardMoveState).toBeNull();
    },
  );

  it('bounds oversized histories and retains only the latest actor segment', () => {
    const history = Array.from({ length: 25 }, (_, revision) => ({ actor: 'host', state: buildState({ revision }) }));
    expect(parse({ ...buildState(), cardMoveHistory: history })?.cardMoveHistory).toHaveLength(20);
    history.push({ actor: 'guest', state: buildState({ revision: 25 }) });
    expect(parse({ ...buildState(), cardMoveHistory: history })?.cardMoveHistory).toHaveLength(1);
  });
});


describe('undo history storage limits', () => {
  const payload = buildSavedHostSessionPayload('ROOM', '1', buildState({
    lastGameState: buildState({ revision: 1 }),
    cardMoveHistory: [{ actor: 'host', state: buildState() }],
    lastUndoableCardMoveState: buildState(), lastUndoableCardMoveActor: 'host',
  }), 'today');

  it('clears the legacy resume point before saving the new format', () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('saved');
    expect(storage.removeItem).toHaveBeenCalledWith('sv-evolve:host-session:ROOM');
    expect(storage.removeItem.mock.invocationCallOrder[0]).toBeLessThan(storage.setItem.mock.invocationCallOrder[0]);
  });

  it('keeps current saves working if old-key cleanup is denied', () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn(() => { throw new Error('storage denied'); }) };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('saved');
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith('key', JSON.stringify(payload));
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith('sv-evolve:host-session:ROOM');
  });

  it('falls back to saving the current board and turn checkpoint when history exceeds quota', () => {
    const storage = { setItem: vi.fn().mockImplementationOnce(() => { throw new Error('quota'); }), removeItem: vi.fn() };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('saved-without-move-history');
    const saved = JSON.parse(storage.setItem.mock.calls[1][1]);
    expect(saved.state.cardMoveHistory).toEqual([]);
    expect(saved.state.lastUndoableCardMoveState).toBeNull();
    expect(saved.state.lastGameState).toEqual(payload.state.lastGameState);
    expect(saved.state.cards).toEqual(payload.state.cards);
    expect(payload.state.cardMoveHistory).toHaveLength(1);
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith('sv-evolve:host-session:ROOM');
  });

  it('removes an obsolete save when both writes fail without throwing into the game', () => {
    const storage = { setItem: vi.fn(() => { throw new Error('quota'); }), removeItem: vi.fn() };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('failed');
    expect(storage.removeItem).toHaveBeenCalledWith('key');
  });

  it('saves full history normally', () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('saved');
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith('key', JSON.stringify(payload));
  });
});
