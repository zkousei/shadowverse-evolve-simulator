import { describe, expect, it } from 'vitest';
import { getBaseCardType } from './cardClassification';

describe('cardClassification helpers', () => {
  it('maps current normalized kinds to their base card type', () => {
    expect(getBaseCardType('follower')).toBe('follower');
    expect(getBaseCardType('evolve_follower')).toBe('follower');
    expect(getBaseCardType('advance_spell')).toBe('spell');
    expect(getBaseCardType('token_amulet')).toBe('amulet');
    expect(getBaseCardType('token_equipment')).toBe('amulet');
  });

  it('handles future amulet variants without changing the deckbuilder filter', () => {
    expect(getBaseCardType('advance_amulet')).toBe('amulet');
  });

  it('returns null for non-game-card categories', () => {
    expect(getBaseCardType('leader')).toBeNull();
    expect(getBaseCardType('ep')).toBeNull();
    expect(getBaseCardType(undefined)).toBeNull();
  });
});
