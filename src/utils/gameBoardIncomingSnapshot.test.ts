import { describe, expect, it } from 'vitest';
import { getIncomingSnapshotHandling } from './gameBoardIncomingSnapshot';

describe('getIncomingSnapshotHandling', () => {
  it('combines guest-side host snapshot handling', () => {
    const handling = getIncomingSnapshotHandling({
      isHost: false,
      message: {
        type: 'STATE_SNAPSHOT',
        source: 'host',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'playing',
          tokenOptions: { host: [], guest: [] },
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
      message: {
        type: 'STATE_SNAPSHOT',
        source: 'guest',
        state: {
          host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
          cards: [],
          turnPlayer: 'host',
          turnCount: 1,
          phase: 'Start',
          gameStatus: 'preparing',
          tokenOptions: { host: [], guest: [] },
          revision: 1,
        },
      },
    });

    expect(handling.sharedUiEffects).toEqual([]);
    expect(handling.postProcessing).toEqual({ type: 'none' });
  });
});
