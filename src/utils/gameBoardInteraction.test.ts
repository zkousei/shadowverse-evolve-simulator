import { describe, expect, it } from 'vitest';
import { canLookAtTopDeck, getCanInteractWithGameBoard, getCanViewGameBoard } from './gameBoardInteraction';

describe('gameBoardInteraction', () => {
  describe('getCanInteractWithGameBoard', () => {
    it('allows solo mode and host interactions without requiring a connected p2p state', () => {
      expect(getCanInteractWithGameBoard({
        isSoloMode: true,
        isHost: false,
        connectionState: 'disconnected',
      })).toBe(true);
      expect(getCanInteractWithGameBoard({
        isSoloMode: false,
        isHost: true,
        connectionState: 'connecting',
      })).toBe(true);
    });

    it('allows guest interactions only while connected', () => {
      expect(getCanInteractWithGameBoard({
        isSoloMode: false,
        isHost: false,
        connectionState: 'connected',
      })).toBe(true);
      expect(getCanInteractWithGameBoard({
        isSoloMode: false,
        isHost: false,
        connectionState: 'reconnecting',
      })).toBe(false);
    });

    it('blocks spectator mutations even after connecting', () => {
      expect(getCanInteractWithGameBoard({
        isSoloMode: false,
        isHost: false,
        isSpectator: true,
        connectionState: 'connected',
      })).toBe(false);
    });
  });

  describe('getCanViewGameBoard', () => {
    it('allows connected non-host clients to view the board', () => {
      expect(getCanViewGameBoard({
        isSoloMode: false,
        isHost: false,
        connectionState: 'connected',
      })).toBe(true);
      expect(getCanViewGameBoard({
        isSoloMode: false,
        isHost: false,
        connectionState: 'reconnecting',
      })).toBe(false);
    });

    it('allows solo mode and host viewers without requiring a connected p2p state', () => {
      expect(getCanViewGameBoard({
        isSoloMode: true,
        isHost: false,
        connectionState: 'disconnected',
      })).toBe(true);
      expect(getCanViewGameBoard({
        isSoloMode: false,
        isHost: true,
        connectionState: 'connecting',
      })).toBe(true);
    });
  });

  describe('canLookAtTopDeck', () => {
    it('requires both interaction permission and playing status', () => {
      expect(canLookAtTopDeck({ canInteract: true, gameStatus: 'playing' })).toBe(true);
      expect(canLookAtTopDeck({ canInteract: false, gameStatus: 'playing' })).toBe(false);
      expect(canLookAtTopDeck({ canInteract: true, gameStatus: 'preparing' })).toBe(false);
    });
  });
});
