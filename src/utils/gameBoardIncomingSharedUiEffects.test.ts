import { describe, expect, it } from 'vitest';
import { getIncomingSharedUiEffects } from './gameBoardIncomingSharedUiEffects';

describe('getIncomingSharedUiEffects', () => {
  it('extracts a direct shared ui effect message', () => {
    expect(getIncomingSharedUiEffects({
      type: 'SHARED_UI_EFFECT',
      effect: { type: 'RESET_GAME_COMPLETED', actor: 'host' },
    })).toEqual([
      { type: 'RESET_GAME_COMPLETED', actor: 'host' },
    ]);
  });

  it('extracts piggybacked snapshot effects', () => {
    expect(getIncomingSharedUiEffects({
      type: 'STATE_SNAPSHOT',
      source: 'host',
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
      pendingEffects: [{ type: 'SEARCHED_CARD_TO_HAND', actor: 'host' }],
    })).toEqual([
      { type: 'SEARCHED_CARD_TO_HAND', actor: 'host' },
    ]);
  });

  it('returns an empty array when there are no shared effects', () => {
    expect(getIncomingSharedUiEffects({
      type: 'WAITING_FOR_HOST_SESSION',
      source: 'host',
    })).toEqual([]);
  });
});
