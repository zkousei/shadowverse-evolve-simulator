import { describe, expect, it } from 'vitest';
import { flipSharedCoin, rollSharedDie } from './sharedRandom';

describe('sharedRandom', () => {
  it('flips a shared coin deterministically from the provided random source', () => {
    expect(flipSharedCoin(() => 0.9)).toBe('HEADS (表)');
    expect(flipSharedCoin(() => 0.1)).toBe('TAILS (裏)');
  });

  it('rolls a shared die deterministically from the provided random source', () => {
    expect(rollSharedDie(() => 0)).toBe(1);
    expect(rollSharedDie(() => 0.999)).toBe(6);
  });
});
