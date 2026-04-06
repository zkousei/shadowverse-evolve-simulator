import { describe, expect, it } from 'vitest';
import type { SyncMessage } from '../types/sync';
import { initialState } from '../types/game';
import { mergeQueuedSnapshotMessage } from './gameBoardSnapshotQueue';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

const buildSnapshotMessage = (overrides: Partial<SnapshotMessage> = {}): SnapshotMessage => ({
  type: 'STATE_SNAPSHOT',
  source: 'host',
  state: initialState,
  ...overrides,
});

describe('mergeQueuedSnapshotMessage', () => {
  it('keeps the newest snapshot payload while appending pending effects in arrival order', () => {
    const merged = mergeQueuedSnapshotMessage(
      buildSnapshotMessage({
        state: { ...initialState, revision: 3 },
        pendingEffects: [
          { type: 'SEARCHED_CARD_TO_HAND', actor: 'host' },
        ],
      }),
      buildSnapshotMessage({
        state: { ...initialState, revision: 4 },
        source: 'guest',
        pendingEffects: [
          { type: 'DRAW_CARD_COMPLETED', actor: 'guest' },
        ],
      })
    );

    expect(merged.source).toBe('guest');
    expect(merged.state.revision).toBe(4);
    expect(merged.pendingEffects).toEqual([
      { type: 'SEARCHED_CARD_TO_HAND', actor: 'host' },
      { type: 'DRAW_CARD_COMPLETED', actor: 'guest' },
    ]);
  });

  it('preserves the queued empty-array shape when neither snapshot carries effects', () => {
    const merged = mergeQueuedSnapshotMessage(
      buildSnapshotMessage(),
      buildSnapshotMessage({ state: { ...initialState, revision: 2 } })
    );

    expect(merged.pendingEffects).toEqual([]);
  });
});
