import { describe, expect, it } from 'vitest';
import { initialState } from '../types/game';
import { canImportDeck, canUndoLastTurn } from './gameRules';

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

  describe('canUndoLastTurn', () => {
    it('blocks undo when there is no previous end-turn snapshot', () => {
      expect(canUndoLastTurn(initialState, null, 'host', false)).toBe(false);
    });

    it('blocks undo while the game is not playing', () => {
      expect(canUndoLastTurn(initialState, initialState, 'host', true)).toBe(false);
    });

    it('allows undo in solo mode while playing if a snapshot exists', () => {
      expect(canUndoLastTurn({
        ...initialState,
        gameStatus: 'playing',
      }, initialState, 'host', true)).toBe(true);
    });

    it('allows undo in p2p only on the non-turn player side', () => {
      expect(canUndoLastTurn({
        ...initialState,
        gameStatus: 'playing',
        turnPlayer: 'guest',
      }, initialState, 'host', false)).toBe(true);

      expect(canUndoLastTurn({
        ...initialState,
        gameStatus: 'playing',
        turnPlayer: 'host',
      }, initialState, 'host', false)).toBe(false);
    });
  });
});
