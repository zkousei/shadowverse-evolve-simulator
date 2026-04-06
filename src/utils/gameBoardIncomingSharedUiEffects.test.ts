import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
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
        ...initialState,
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
