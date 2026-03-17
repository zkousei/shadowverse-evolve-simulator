import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
import { canImportDeck } from './gameRules';

describe('gameRules', () => {
  describe('canImportDeck', () => {
    it('allows deck import while the target player has not started preparing', () => {
      expect(canImportDeck(initialState, 'host')).toBe(true);
    });

    it('blocks deck import while playing', () => {
      expect(canImportDeck({ ...initialState, gameStatus: 'playing' }, 'host')).toBe(false);
    });

    it('blocks deck import after the target player draws their opening hand', () => {
      expect(canImportDeck({
        ...initialState,
        host: { ...initialState.host, initialHandDrawn: true },
      }, 'host')).toBe(false);
    });

    it('blocks deck import after the target player uses mulligan', () => {
      expect(canImportDeck({
        ...initialState,
        host: { ...initialState.host, mulliganUsed: true },
      }, 'host')).toBe(false);
    });

    it('blocks deck import after the target player is ready', () => {
      expect(canImportDeck({
        ...initialState,
        host: { ...initialState.host, isReady: true },
      }, 'host')).toBe(false);
    });

    it('only checks the targeted player state', () => {
      expect(canImportDeck({
        ...initialState,
        guest: { ...initialState.guest, initialHandDrawn: true, isReady: true },
      }, 'host')).toBe(true);
    });
  });
});
