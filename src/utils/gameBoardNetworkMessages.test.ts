import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
import { buildSnapshotRequestMessage, buildSnapshotSyncMessage, buildWaitingForHostSessionMessage } from './gameBoardNetworkMessages';

describe('buildSnapshotRequestMessage', () => {
  it('builds a request snapshot message with the given revision and source', () => {
    expect(buildSnapshotRequestMessage(7, 'guest')).toEqual({
      type: 'REQUEST_SNAPSHOT',
      lastKnownRevision: 7,
      source: 'guest',
    });
  });
});

describe('buildWaitingForHostSessionMessage', () => {
  it('builds the host waiting message without extra fields', () => {
    expect(buildWaitingForHostSessionMessage()).toEqual({
      type: 'WAITING_FOR_HOST_SESSION',
      source: 'host',
    });
  });
});

describe('buildSnapshotSyncMessage', () => {
  it('builds a snapshot message and omits empty pending effects', () => {
    const message = buildSnapshotSyncMessage(
      {
        ...initialState,
        revision: 5,
      },
      'host',
      {}
    );

    expect(message).toMatchObject({
      type: 'STATE_SNAPSHOT',
      source: 'host',
      state: expect.objectContaining({
        revision: 5,
      }),
    });
    expect(message.pendingEffects).toBeUndefined();
  });

  it('includes pending effects when present and keeps snapshot shaping', () => {
    const message = buildSnapshotSyncMessage(
      {
        ...initialState,
        cards: [{
          id: 'restorable-card',
          cardId: 'BP01-001',
          name: 'Restorable Card',
          image: '/same-image.png',
          zone: 'hand-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        }],
        lastGameState: {
          ...initialState,
          revision: 12,
        },
      },
      'guest',
      {
        'BP01-001': {
          id: 'BP01-001',
          name: 'Restorable Card',
          image: '/same-image.png',
        },
      },
      [{ type: 'DRAW_CARD_COMPLETED', actor: 'guest' }]
    );

    expect(message.pendingEffects).toEqual([{ type: 'DRAW_CARD_COMPLETED', actor: 'guest' }]);
    expect(message.state.cards[0]?.image).toBe('');
    expect(message.state.lastGameState).toBeNull();
    expect(message.state.networkHasUndoableTurn).toBe(true);
  });
});
