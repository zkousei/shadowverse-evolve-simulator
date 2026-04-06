import { describe, expect, it } from 'vitest';
import { initialState, type SyncState } from '../types/game';
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
  it('strips restorable non-token images and preserves token/custom images', () => {
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

    const snapshot = buildGameBoardNetworkSnapshotState(state, {
      'BP01-001': {
        image: '/same-image.png',
        id: 'BP01-001',
        name: 'Restorable Card',
      },
      'BP01-002': {
        image: '/different-catalog-image.png',
        id: 'BP01-002',
        name: 'Custom Image Card',
      },
    });

    expect(snapshot.cards.find((card) => card.id === 'restorable-card')?.image).toBe('');
    expect(snapshot.cards.find((card) => card.id === 'custom-image-card')?.image).toBe('/custom-image.png');
    expect(snapshot.cards.find((card) => card.id === 'token-card')?.image).toBe('/token-image.png');
    expect(snapshot.lastGameState).toBeNull();
    expect(snapshot.lastUndoableCardMoveState).toBeNull();
    expect(snapshot.networkHasUndoableTurn).toBe(true);
    expect(snapshot.networkHasUndoableCardMove).toBe(true);
  });
});
