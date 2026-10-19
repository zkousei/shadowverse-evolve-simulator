import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../../../types/game';
import { applyGameSyncEvent } from '../gameSyncReducer';
import { buildGameBoardNetworkSnapshotState } from './gameBoardSnapshot';

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

describe('buildGameBoardNetworkSnapshotState', () => {
  it('transports the guest starter and turn count through a JSON network snapshot', () => {
    const ordered = applyGameSyncEvent(buildState(), { id: 'order', type: 'SET_INITIAL_TURN_ORDER', actor: 'host', starter: 'guest', manual: true });
    const started = applyGameSyncEvent(ordered, { id: 'start', type: 'START_GAME', actor: 'host' });
    const snapshot: SyncState = JSON.parse(JSON.stringify(buildGameBoardNetworkSnapshotState(started, {})));
    expect(snapshot).toHaveProperty('startingPlayer', 'guest');
    const next = applyGameSyncEvent(snapshot, { id: 'end', type: 'END_TURN', actor: 'guest' });
    expect(next).toMatchObject({ turnPlayer: 'host', turnCount: 1 });
  });

  it('preserves a reset revision through JSON transport without adding the marker to legacy states', () => {
    const state = buildState({ revision: 12, lastResetRevision: 9 });
    const snapshot: SyncState = JSON.parse(JSON.stringify(buildGameBoardNetworkSnapshotState(state, {})));
    expect(snapshot).toMatchObject({ revision: 12, lastResetRevision: 9 });
    expect(buildGameBoardNetworkSnapshotState(buildState(), {})).not.toHaveProperty('lastResetRevision');
  });

  it('preserves official, token and custom image URLs so a receiver need not wait for its catalog', () => {
    const state = buildState({
      cards: [
        {
          id: 'restorable-card',
          cardId: 'BP01-001',
          name: 'Restorable Card',
          image: '/same-image.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'custom-image-card',
          cardId: 'BP01-002',
          name: 'Custom Image Card',
          image: '/custom-image.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'token-card',
          cardId: 'token-alpha',
          name: 'Token Card',
          image: '/token-image.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
        },
      ],
      lastGameState: buildState({ revision: 99 }),
      lastUndoableCardMoveState: buildState({ revision: 77 }),
    });

    state.cards.push({ ...state.cards[0], id: 'legacy-card', image: '' });
    state.cards.push({ ...state.cards[0], id: 'blank-token', image: '', isTokenCard: true });
    const snapshot = buildGameBoardNetworkSnapshotState(state, {
      'BP01-001': {
        image: '/same-image.png',
        id: 'BP01-001',
        name: 'Restorable Card',
        className: '',
        title: '',
        type: '',
        subtype: '',
        cost: '-',
        atk: null,
        hp: null,
        abilityText: '',
      },
      'BP01-002': {
        image: '/different-catalog-image.png',
        id: 'BP01-002',
        name: 'Custom Image Card',
        className: '',
        title: '',
        type: '',
        subtype: '',
        cost: '-',
        atk: null,
        hp: null,
        abilityText: '',
      },
    });

    expect(snapshot.cards.find((card) => card.id === 'restorable-card')?.image).toBe('/same-image.png');
    expect(snapshot.cards.find((card) => card.id === 'custom-image-card')?.image).toBe('/custom-image.png');
    expect(snapshot.cards.find((card) => card.id === 'token-card')?.image).toBe('/token-image.png');
    expect(snapshot.cards.find(card => card.id === 'legacy-card')?.image).toBe('/same-image.png');
    expect(state.cards.find(card => card.id === 'legacy-card')?.image).toBe('');
    expect(snapshot.cards.find(card => card.id === 'blank-token')?.image).toBe('');
    expect(snapshot.lastGameState).toBeNull();
    expect(snapshot.lastUndoableCardMoveState).toBeNull();
    expect(snapshot.networkHasUndoableTurn).toBe(true);
    expect(snapshot.networkHasUndoableCardMove).toBe(true);
  });
});


it('never transmits move history or grows the network snapshot with history depth', () => {
  const checkpoint = buildState({ revision: 1 });
  const state = buildState({
    lastUndoableCardMoveState: checkpoint, lastUndoableCardMoveActor: 'guest',
    cardMoveHistory: [{ actor: 'guest', state: checkpoint }],
  });
  const shallow = buildGameBoardNetworkSnapshotState(state, {});
  const deep = buildGameBoardNetworkSnapshotState({
    ...state, cardMoveHistory: Array.from({ length: 20 }, () => ({ actor: 'guest', state: checkpoint })),
  }, {});
  expect(deep.cardMoveHistory).toEqual([]);
  expect(deep.lastUndoableCardMoveActor).toBe('guest');
  expect(deep.networkHasUndoableCardMove).toBe(true);
  expect(JSON.stringify(deep)).toBe(JSON.stringify(shallow));
});
