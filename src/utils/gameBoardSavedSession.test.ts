import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../types/game';
import {
  getHostSessionStorageKey,
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
  });
});
