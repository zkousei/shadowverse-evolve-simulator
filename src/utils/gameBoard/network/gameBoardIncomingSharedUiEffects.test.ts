import { describe, expect, it } from 'vitest';
import { initialState } from '../../../types/game';
import { getIncomingSharedUiEffects, createIncomingUndoLogFilter } from './gameBoardIncomingSharedUiEffects';

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
    expect(getIncomingSharedUiEffects({ type: 'STATE_SNAPSHOT', source: 'host', state: initialState })).toEqual([]);
  });
});

it('suppresses duplicate/stale undo snapshots while preserving all existing effect behavior', () => {
  const filter = createIncomingUndoLogFilter();
  const undo = { type: 'UNDO_COMPLETED', actor: 'host', summary: { kind: 'generic' } } as const;
  const draw = { type: 'DRAW_CARD_COMPLETED', actor: 'host' } as const;
  const snapshot = (revision: number) => ({ type: 'STATE_SNAPSHOT' as const, source: 'host' as const, state: { ...initialState, revision }, pendingEffects: [undo, undo, draw] });
  // A deferred snapshot can contain several separate undo operations.
  expect(filter(snapshot(4))).toEqual([undo, undo, draw]);
  expect(filter(snapshot(4))).toEqual([draw]);
  expect(filter(snapshot(3))).toEqual([draw]);
  expect(filter(snapshot(5))).toEqual([undo, undo, draw]);
  expect(filter({ type: 'SHARED_UI_EFFECT', effect: draw })).toEqual([draw]);
});
