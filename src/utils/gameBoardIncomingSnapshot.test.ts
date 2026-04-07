import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
import { getIncomingSnapshotHandling } from './gameBoardIncomingSnapshot';

describe('getIncomingSnapshotHandling', () => {
  it('combines guest-side host snapshot handling', () => {
    const handling = getIncomingSnapshotHandling({
      isHost: false,
      isAwaitingInitialSnapshot: true,
      currentGameStatus: 'preparing',
      message: {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          ...initialState,
          gameStatus: 'playing',
          revision: 1,
        },
        pendingEffects: [{ type: 'SEARCHED_CARD_TO_HAND', actor: 'host' }],
      },
    });

    expect(handling.source).toBe('host');
    expect(handling.sharedUiEffects).toEqual([
      { type: 'SEARCHED_CARD_TO_HAND', actor: 'host' },
    ]);
    expect(handling.postProcessing).toEqual({
      type: 'guest-ready',
      statusKey: 'gameBoard.status.connectedHostReady',
      shouldResetTransientUi: true,
      preserveUndoState: true,
    });
  });

  it('does not request extra post-processing for host-side snapshots', () => {
    const handling = getIncomingSnapshotHandling({
      isHost: true,
      isAwaitingInitialSnapshot: true,
      currentGameStatus: 'preparing',
      message: {
        type: 'STATE_SNAPSHOT',
        source: 'guest',
        state: {
          ...initialState,
          revision: 1,
        },
      },
    });

    expect(handling.sharedUiEffects).toEqual([]);
    expect(handling.postProcessing).toEqual({ type: 'none' });
  });
});
