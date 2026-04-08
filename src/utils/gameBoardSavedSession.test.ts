import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../types/game';
import {
  buildSavedHostSessionPayload,
  getHostSessionStorageKey,
  getSavedHostSessionPersistenceDecision,
  hasMeaningfulGameSessionState,
  parseSavedHostSession,
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
