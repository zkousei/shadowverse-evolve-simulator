import { describe, expect, it } from 'vitest';
import { buildCardStatLookup } from './cardStats';

describe('cardStats', () => {
  it('builds a lookup only for cards with valid atk and hp values', () => {
    const lookup = buildCardStatLookup([
      { id: 'BP01-001', atk: '3', hp: '4' },
      { id: 'BP01-002', atk: '-', hp: '5' },
      { id: 'BP01-003', atk: 'x', hp: '2' },
      { id: 'BP01-004', atk: ' 7 ', hp: ' 8 ' },
      { id: 'BP01-005' },
    ]);

    expect(lookup).toEqual({
      'BP01-001': { atk: 3, hp: 4 },
      'BP01-004': { atk: 7, hp: 8 },
    });
  });
});
