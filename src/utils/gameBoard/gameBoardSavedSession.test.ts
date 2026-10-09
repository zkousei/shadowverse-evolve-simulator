import { describe, expect, it, vi } from 'vitest';
import { applyGameSyncEvent } from './gameSyncReducer';
import { initialState, type SyncState } from '../../types/game';
import {
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
  it('builds the host session storage key', () => {
    expect(getHostSessionStorageKey('ROOM123')).toBe('sv-evolve:host-session:ROOM123');
  });

  it('builds a saved host session payload without reshaping the state', () => {
    const state = buildState({ revision: 7, turnCount: 3, phase: 'Main', gameStatus: 'playing' });

    expect(buildSavedHostSessionPayload('ROOM123', '1.2.3', state, '2026-03-19T10:00:00.000Z')).toEqual({
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
      storageKey: 'sv-evolve:host-session:ROOM123',
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
      storageKey: 'sv-evolve:host-session:ROOM123',
      payload: {
        room: 'ROOM123',
        savedAt: '2026-03-19T10:00:00.000Z',
        appVersion: '1.2.3',
        state: meaningfulState,
      },
    });
  });

  it('parses a saved session only when room, version, and state shape are valid', () => {
    const state = buildState({ revision: 7, turnCount: 3, phase: 'Main', gameStatus: 'playing' });
    const raw = JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state,
    });

    expect(parseSavedHostSession(raw, 'ROOM123', '1.2.3')).toEqual({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state,
    });
    expect(parseSavedHostSession(raw, 'ROOM999', '1.2.3')).toBeNull();
    expect(parseSavedHostSession(raw, 'ROOM123', '9.9.9')).toBeNull();
    expect(parseSavedHostSession('{"broken"', 'ROOM123', '1.2.3')).toBeNull();
    expect(
      parseSavedHostSession(
        JSON.stringify({ room: 'ROOM123', savedAt: 'x', appVersion: '1.2.3', state: {} }),
        'ROOM123',
        '1.2.3'
      )
    ).toBeNull();
  });

  it('fills in missing end stop flags when parsing older saved sessions', () => {
    const legacyState = { ...buildState({ revision: 7 }), endStop: undefined };
    const raw = JSON.stringify({
      room: 'ROOM123',
      savedAt: '2026-03-19T10:00:00.000Z',
      appVersion: '1.2.3',
      state: legacyState,
    });

    expect(parseSavedHostSession(raw, 'ROOM123', '1.2.3')).toEqual({
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
    room: 'ROOM123', appVersion: '1.2.3', savedAt: 'today', state,
  }), 'ROOM123', '1.2.3')?.state;

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

  it('falls back to saving the current board and turn checkpoint when history exceeds quota', () => {
    const storage = { setItem: vi.fn().mockImplementationOnce(() => { throw new Error('quota'); }), removeItem: vi.fn() };
    expect(persistSavedHostSession(storage, 'key', payload)).toBe('saved-without-move-history');
    const saved = JSON.parse(storage.setItem.mock.calls[1][1]);
    expect(saved.state.cardMoveHistory).toEqual([]);
    expect(saved.state.lastUndoableCardMoveState).toBeNull();
    expect(saved.state.lastGameState).toEqual(payload.state.lastGameState);
    expect(saved.state.cards).toEqual(payload.state.cards);
    expect(payload.state.cardMoveHistory).toHaveLength(1);
    expect(storage.removeItem).not.toHaveBeenCalled();
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
