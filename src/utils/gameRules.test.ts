import { describe, expect, it } from 'vitest';
import { canImportDeck } from './gameRules';

describe('gameRules', () => {
  describe('canImportDeck', () => {
    it('allows deck import while preparing', () => {
      expect(canImportDeck('preparing')).toBe(true);
    });

    it('blocks deck import while playing', () => {
      expect(canImportDeck('playing')).toBe(false);
    });
  });
});
