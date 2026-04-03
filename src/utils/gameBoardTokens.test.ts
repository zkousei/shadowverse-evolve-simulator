import { describe, expect, it } from 'vitest';
import type { TokenOption } from '../types/game';
import {
  buildTokenSpawnSelections,
  getTotalTokenSpawnCount,
  updateTokenSpawnCounts,
} from './gameBoardTokens';

const tokenOptions: TokenOption[] = [
  { cardId: 'TOKEN-001', name: 'Knight Token', image: '/knight.png' },
  { cardId: 'TOKEN-002', name: 'Fairy Token', image: '/fairy.png' },
];

describe('gameBoardTokens', () => {
  it('totals only the counts for the visible token options', () => {
    expect(
      getTotalTokenSpawnCount(tokenOptions, {
        'TOKEN-001': 2,
        'TOKEN-002': 3,
        'TOKEN-999': 4,
      })
    ).toBe(5);
  });

  it('updates token counts with clamping and removes zero-count entries', () => {
    expect(updateTokenSpawnCounts({}, 'TOKEN-001', 1)).toEqual({ 'TOKEN-001': 1 });
    expect(updateTokenSpawnCounts({ 'TOKEN-001': 4 }, 'TOKEN-001', 3)).toEqual({ 'TOKEN-001': 5 });
    expect(updateTokenSpawnCounts({ 'TOKEN-001': 1, 'TOKEN-002': 2 }, 'TOKEN-001', -1)).toEqual({ 'TOKEN-002': 2 });
  });

  it('builds token spawn selections with zero defaults', () => {
    expect(
      buildTokenSpawnSelections(tokenOptions, {
        'TOKEN-002': 2,
      })
    ).toEqual([
      { tokenOption: tokenOptions[0], count: 0 },
      { tokenOption: tokenOptions[1], count: 2 },
    ]);
  });
});
